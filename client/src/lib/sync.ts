/*
 * sync.ts — 로컬 기록(store.ts)과 Supabase `records` 테이블의 동기화.
 *
 * 로컬이 먼저다. 기록이 바뀌면 outbox(id·kind만, localStorage)에 올리고 1초 디바운스로 upsert한다.
 * 실패해도 outbox는 그대로 남고 백오프로 다시 시도한다. 로그인하면 서버 기록을 받아 id 기준으로 병합한다.
 */
import { useSyncExternalStore } from 'react';
import { toast } from 'sonner';
import { translate } from '../i18n';
import { supabase } from './supabase';
import {
  clearLocal, computeStreak, isoWeekKey, loadStore, localDate, onRecordChange, replaceAll, toISODate, updateStore,
  type ArenaRecord, type DiagnosticRecord, type LogosStore, type RecordKind, type SessionRecord,
} from './store';

export const OUTBOX_KEY = 'logos.v1.outbox';
const FLUSH_DEBOUNCE_MS = 1000;
const RETRY_BASE_MS = 2000;
const RETRY_MAX_MS = 60_000;
const BATCH = 20;
const PAGE = 1000;
const SIGN_OUT_FLUSH_MS = 3000;

type OutboxEntry = { id: string; kind: RecordKind };
type AnyRecord = SessionRecord | DiagnosticRecord | ArenaRecord;
export type RecordRow = {
  id: string;
  kind: RecordKind;
  started_at: string;
  completed_at: string | null;
  score_before: number | null;
  score_after: number | null;
  survey_diff: number | null;
  survey_self: number | null;
  verdict: 'win' | 'draw' | 'lose' | null;
  prompt_version: string | null;
  data: AnyRecord;
};

/* ───────── 행 변환 ───────── */

export function toRow(kind: RecordKind, rec: AnyRecord): RecordRow {
  const base = { id: (rec as { id?: string }).id ?? '', kind, completed_at: null, score_before: null, score_after: null, survey_diff: null, survey_self: null, verdict: null, prompt_version: null, data: rec };
  if (kind === 'diagnostic') {
    const d = rec as DiagnosticRecord;
    return { ...base, started_at: d.at, completed_at: d.at, score_after: d.score.total };
  }
  if (kind === 'arena') {
    const a = rec as ArenaRecord;
    return {
      ...base,
      started_at: a.startedAt,
      completed_at: a.completedAt ?? null,
      score_after: a.result?.total ?? null,
      verdict: a.result?.verdict ?? null,
      prompt_version: a.promptVersion || null,
    };
  }
  const s = rec as SessionRecord;
  return {
    ...base,
    started_at: s.startedAt,
    completed_at: s.completedAt ?? null,
    score_before: s.scoreBefore?.total ?? null,
    score_after: s.scoreAfter?.total ?? null,
    survey_diff: s.survey?.differentFromAI ?? null,
    survey_self: s.survey?.selfAuthored ?? null,
    prompt_version: s.promptVersion || null,
  };
}

function findRecord(store: LogosStore, e: OutboxEntry): AnyRecord | undefined {
  if (e.kind === 'diagnostic') return store.diagnostics.find((d) => d.id === e.id);
  if (e.kind === 'arena') return (store.arenas ?? []).find((a) => a.id === e.id);
  return store.sessions.find((x) => x.id === e.id);
}

/* ───────── outbox ───────── */

const outboxListeners = new Set<() => void>();

function readOutbox(): OutboxEntry[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(OUTBOX_KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((e): e is OutboxEntry => !!e && typeof e.id === 'string' && typeof e.kind === 'string') : [];
  } catch {
    return [];
  }
}

function writeOutbox(list: OutboxEntry[]) {
  try {
    if (list.length) localStorage.setItem(OUTBOX_KEY, JSON.stringify(list));
    else localStorage.removeItem(OUTBOX_KEY);
  } catch {
    /* 저장 불가 환경 */
  }
  outboxListeners.forEach((fn) => fn());
}

/** flush 중에 같은 기록이 또 바뀌었는지 보려고, enqueue마다 올리는 메모리 버전 */
const versions = new Map<string, number>();

function enqueue(kind: RecordKind, id: string) {
  versions.set(id, (versions.get(id) ?? 0) + 1);
  const list = readOutbox();
  if (!list.some((e) => e.id === id)) writeOutbox([...list, { id, kind }]);
  else outboxListeners.forEach((fn) => fn());
}

export const pendingCount = () => readOutbox().length;

const subscribePending = (fn: () => void) => {
  outboxListeners.add(fn);
  return () => {
    outboxListeners.delete(fn);
  };
};

/** 아직 서버에 올리지 못한 기록 수 */
export function usePending(): number {
  return useSyncExternalStore(subscribePending, pendingCount, () => 0);
}

/* ───────── flush ───────── */

let currentUid: string | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | undefined;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let failures = 0;
let inflight: Promise<boolean> | null = null;
let rerun = false;

function clearTimers() {
  clearTimeout(debounceTimer);
  clearTimeout(retryTimer);
  debounceTimer = retryTimer = undefined;
}

function scheduleRetry() {
  clearTimeout(retryTimer);
  const delay = Math.min(RETRY_MAX_MS, RETRY_BASE_MS * 2 ** failures);
  failures += 1;
  retryTimer = setTimeout(() => void flush(), delay);
}

async function flushOnce(): Promise<boolean> {
  const client = supabase;
  if (!client || !currentUid) return readOutbox().length === 0;
  const store = loadStore();
  const entries = readOutbox();
  const stale = entries.filter((e) => !findRecord(store, e));
  if (stale.length) writeOutbox(entries.filter((e) => !stale.includes(e))); // 로컬에서 사라진 기록은 보낼 게 없다
  const todo = entries.filter((e) => !stale.includes(e));
  for (let i = 0; i < todo.length; i += BATCH) {
    const chunk = todo.slice(i, i + BATCH);
    const seen = new Map(chunk.map((e) => [e.id, versions.get(e.id) ?? 0]));
    const rows = chunk.map((e) => toRow(e.kind, findRecord(store, e)!));
    let error: unknown = null;
    try {
      ({ error } = await client.from('records').upsert(rows));
    } catch (e) {
      error = e;
    }
    if (error) return false; // outbox는 그대로 둔다
    // 보내는 동안 또 바뀐 기록은 outbox에 남겨 다음 flush에서 다시 보낸다
    writeOutbox(readOutbox().filter((e) => !seen.has(e.id) || (versions.get(e.id) ?? 0) !== seen.get(e.id)));
  }
  return true;
}

/** outbox를 서버로 보낸다. 이미 진행 중이면 그 뒤에 한 번 더 돈다. 전부 보냈으면 true. */
export function flush(): Promise<boolean> {
  if (inflight) {
    rerun = true;
    return inflight;
  }
  clearTimeout(debounceTimer);
  inflight = (async () => {
    let ok = true;
    do {
      rerun = false;
      ok = await flushOnce();
    } while (rerun && ok);
    if (ok) {
      failures = 0;
      clearTimeout(retryTimer);
      retryTimer = undefined;
    } else if (currentUid) scheduleRetry();
    return ok;
  })().finally(() => {
    inflight = null;
  });
  return inflight;
}

function scheduleFlush() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => void flush(), FLUSH_DEBOUNCE_MS);
}

/* ───────── 병합 ───────── */

type ServerRow = { id: string; kind: RecordKind; data: AnyRecord };

/** 로컬 캐시와 서버 행을 id 기준으로 합친다. outbox에 있는 로컬 기록만 로컬이 이기고, 나머지는 서버가 이긴다. */
export function mergeRecords(local: LogosStore, rows: ServerRow[], outboxIds: Set<string>, uid: string, today: string): LogosStore {
  const pick = <T extends { id?: string }>(localList: T[], kind: RecordKind): T[] => {
    const out = new Map<string, T>();
    for (const r of rows) {
      if (r.kind === kind && r.data) out.set(r.id, { ...r.data, id: r.id } as unknown as T);
    }
    for (const l of localList) {
      if (l.id && outboxIds.has(l.id)) out.set(l.id, l); // 아직 못 올린 로컬 변경이 우선
    }
    return Array.from(out.values());
  };
  const sessions = [...pick(local.sessions.filter((s) => s.kind === 'session'), 'session'), ...pick(local.sessions.filter((s) => s.kind === 'argue'), 'argue')].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const diagnostics = pick(local.diagnostics, 'diagnostic').sort((a, b) => a.at.localeCompare(b.at));
  const arenas = pick(local.arenas ?? [], 'arena').sort((a, b) => a.startedAt.localeCompare(b.startedAt));

  const days = new Set(local.streak.days);
  for (const s of sessions) days.add(localDate(s.startedAt));
  for (const d of diagnostics) days.add(localDate(d.at));
  for (const a of arenas) days.add(localDate(a.startedAt));
  const sortedDays = Array.from(days).sort();
  const freezesUsed = { ...local.streak.freezesUsed };
  for (const d of computeStreak(sortedDays, today).freezeDates) freezesUsed[isoWeekKey(d)] = d;

  const starts = [local.createdAt, ...sessions.map((s) => s.startedAt), ...diagnostics.map((d) => d.at), ...arenas.map((a) => a.startedAt)];
  const createdAt = starts.reduce((min, v) => (v < min ? v : min));

  return { ...local, ownerId: uid, createdAt, sessions, diagnostics, arenas, streak: { days: sortedDays, freezesUsed } };
}

/** 내 기록을 전부 받아 로컬과 병합한다. 실패하면 로컬은 그대로 둔다. */
export async function pullAll(uid: string): Promise<boolean> {
  const client = supabase;
  if (!client) return false;
  const rows: ServerRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await client.from('records').select('id, kind, data').order('started_at', { ascending: true }).range(from, from + PAGE - 1);
    if (error || !data) return false;
    rows.push(...(data as ServerRow[]));
    if (data.length < PAGE) break;
  }
  // 네트워크를 기다리는 동안 로컬이 바뀌었을 수 있으므로 병합 직전에 다시 읽는다
  const outboxIds = new Set(readOutbox().map((e) => e.id));
  replaceAll(mergeRecords(loadStore(), rows, outboxIds, uid, toISODate(new Date())));
  return true;
}

/* ───────── 로그인·로그아웃 ───────── */

export async function onSignIn(uid: string) {
  currentUid = uid;
  failures = 0;
  const store = loadStore();
  if (store.ownerId == null) {
    // 비회원 때 쌓은 기록(진단 포함)을 이 계정으로 옮긴다
    const arenas = store.arenas ?? [];
    const n = store.sessions.length + store.diagnostics.length + arenas.length;
    if (n > 0) {
      const list = readOutbox();
      const have = new Set(list.map((e) => e.id));
      const add: OutboxEntry[] = [
        ...store.sessions.map((s) => ({ id: s.id, kind: s.kind })),
        ...store.diagnostics.flatMap((d) => (d.id ? [{ id: d.id, kind: 'diagnostic' as const }] : [])),
        ...arenas.map((a) => ({ id: a.id, kind: 'arena' as const })),
      ].filter((e) => !have.has(e.id));
      add.forEach((e) => versions.set(e.id, (versions.get(e.id) ?? 0) + 1));
      writeOutbox([...list, ...add]);
      toast(translate('auth', 'migrated', { n }));
    }
  } else if (store.ownerId !== uid) {
    // 공용 기기에서 다른 계정의 기록이 섞이지 않게 캐시와 outbox를 버린다
    writeOutbox([]);
    clearLocal();
  }
  updateStore((s) => ({ ...s, ownerId: uid }));
  await flush();
  await pullAll(uid);
}

const wait = (ms: number) => new Promise<'timeout'>((r) => setTimeout(() => r('timeout'), ms));

/**
 * 로그아웃: 남은 기록을 3초 안에 올려 보고, 못 올린 게 있으면 확인을 받는다.
 * 취소하면 false(로그아웃하지 않음).
 */
export async function signOutFlow(): Promise<boolean> {
  await Promise.race([flush(), wait(SIGN_OUT_FLUSH_MS)]);
  const left = pendingCount();
  if (left > 0 && !confirm(translate('auth', 'signOutConfirm', { n: left }))) return false;
  clearTimers();
  currentUid = null;
  writeOutbox([]);
  clearLocal();
  await supabase?.auth.signOut();
  return true;
}

/* ───────── 초기화 ───────── */

let started = false;

/** store 구독과 online·visibilitychange 리스너를 한 번만 건다. */
export function initSync() {
  if (started || typeof window === 'undefined') return;
  started = true;
  onRecordChange((kind, id) => {
    if (loadStore().ownerId == null) return; // 비회원 기록은 로그인할 때 한꺼번에 옮긴다
    enqueue(kind, id);
    scheduleFlush();
  });
  window.addEventListener('online', () => void flush());
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') void flush();
    });
  }
}

initSync();
