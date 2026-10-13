/*
 * store.ts — LOGOS 로컬 기록 (localStorage 'logos.v1', 버전 있음)
 *
 * 이 파일은 로컬 캐시만 다룬다(supabase를 import하지 않는다). 로그인 사용자의 서버 동기화는 sync.ts가
 * onRecordChange 구독으로 따로 처리한다. 파일럿용 JSON 내보내기도 가능하다.
 * 아래 순수 함수(streak·완주율·상승폭·재방문)는 today/now를 인자로 받아 테스트 가능하게 둔다.
 */
import { useSyncExternalStore } from 'react';
import type { Stage, Control, Position } from './api';
import { translate } from '../i18n';
import { DIAGNOSTIC_FORMS, formFromPromptIndex, type DiagnosticForm } from '../../../shared/diagnosticForms';

export const STORE_KEY = 'logos.v1';
export const STORE_VERSION = 1;
const CHANGE_EVENT = 'logos:store-changed';

export type Turn = {
  role: 'user' | 'assistant';
  content: string;
  at: string; // ISO
  stage?: Stage;
  control?: Control;
  aporia?: boolean;
  targetWeakness?: string;
};

export type Score = {
  consistency: number; // 0|15|30
  evidence: number; // 0|20|40
  defense: number; // 0|15|30
  total: number;
  rationale: string;
};

export type Report = {
  stuckPoints: string[];
  assumptions: string[];
  nextQuestions: string[];
  turningPoint: string;
};

export type SessionRecord = {
  id: string;
  kind: 'session' | 'argue';
  topic: string;
  field?: string;
  position?: Position;
  startedAt: string;
  completedAt?: string;
  stageReached: Stage;
  turns: Turn[];
  anchor?: string;
  firstClaim?: string;
  finalSummary?: string;
  scoreBefore?: Score;
  scoreAfter?: Score;
  report?: Report;
  survey?: { differentFromAI: number; selfAuthored: number };
  promptVersion: string;
};

/** form: 문항 폼(f0..f3). 폼 도입 전 기록에는 없다 — diagnosticForm()으로 역추적한다. */
export type DiagnosticRecord = { id?: string; at: string; prompt: string; text: string; score: Score; form?: DiagnosticForm };

export type ArenaRecord = {
  id: string;
  topicId: string;
  side: 'pro' | 'con';
  startedAt: string;
  completedAt?: string;
  turns: { role: 'user' | 'assistant'; content: string; at: string; targetsClaim?: string }[];
  result?: {
    consistency: number;
    evidence: number;
    defense: number;
    total: number;
    verdict: 'win' | 'draw' | 'lose';
    rationale: string;
    lessons: { quote: string; lesson: string }[];
  };
  promptVersion?: string;
};

export type RecordKind = 'session' | 'argue' | 'arena' | 'diagnostic';

export type Streak = { days: string[]; freezesUsed: Record<string, string> };

export type LogosStore = {
  version: number;
  participantId: string;
  createdAt: string;
  sessions: SessionRecord[];
  diagnostics: DiagnosticRecord[];
  streak: Streak;
  /** 이 캐시가 속한 계정(uid). null·없음 = 비회원 기록. */
  ownerId?: string | null;
  arenas?: ArenaRecord[];
};

/* ───────── 날짜 유틸 (로컬 YYYY-MM-DD) ───────── */

const pad = (n: number) => String(n).padStart(2, '0');

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 저장된 ISO 타임스탬프(UTC)가 속한 로컬 달력 날짜. */
export function localDate(iso: string): string {
  return toISODate(new Date(iso));
}

function dayNum(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}

function fromDayNum(n: number): string {
  const d = new Date(n * 86_400_000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function addDays(date: string, n: number): string {
  return fromDayNum(dayNum(date) + n);
}

/** ISO 8601 주 키 (예: 2026-W42). 주는 월요일 시작. */
export function isoWeekKey(date: string): string {
  const n = dayNum(date);
  const dow = (((n + 3) % 7) + 7) % 7; // 0=월 (1970-01-01은 목요일)
  const thursday = n - dow + 3;
  const yearOfThursday = new Date(thursday * 86_400_000).getUTCFullYear();
  const jan1 = Math.round(Date.UTC(yearOfThursday, 0, 1) / 86_400_000);
  return `${yearOfThursday}-W${pad(Math.floor((thursday - jan1) / 7) + 1)}`;
}

/** 0=월 … 6=일 */
export function weekdayIndex(date: string): number {
  return (((dayNum(date) + 3) % 7) + 7) % 7;
}

/* ───────── streak (주 1회 쉬어가기) ───────── */

export type StreakInfo = {
  count: number;
  /** 쉬어가기로 메운 날짜 */
  freezeDates: string[];
  /** 오늘이 속한 주에 남은 쉬어가기 횟수 */
  freezesLeftThisWeek: number;
};

/**
 * 오늘(또는 오늘이 비었으면 어제)부터 거꾸로 이어진 기록 일수.
 * 하루만 빠진 날은 그 주의 쉬어가기가 남아 있으면 자동으로 메운다(일수에는 세지 않는다).
 * 오늘이 아직 비어 있는 것은 끊김이 아니다.
 */
export function computeStreak(days: string[], today: string): StreakInfo {
  const set = new Set(days);
  const usedWeeks = new Set<string>();
  const freezeDates: string[] = [];
  let count = 0;
  let cursor: string;
  if (set.has(today)) count = 1;
  cursor = addDays(today, -1);
  for (;;) {
    if (set.has(cursor)) {
      count += 1;
    } else {
      const week = isoWeekKey(cursor);
      const bridgeable = !usedWeeks.has(week) && set.has(addDays(cursor, -1));
      if (!bridgeable) break;
      usedWeeks.add(week);
      freezeDates.push(cursor);
    }
    cursor = addDays(cursor, -1);
  }
  const thisWeek = isoWeekKey(today);
  return { count, freezeDates, freezesLeftThisWeek: usedWeeks.has(thisWeek) ? 0 : 1 };
}

/* ───────── 지표 ───────── */

export function completionRate(sessions: SessionRecord[]): { started: number; completed: number; rate: number | null } {
  const started = sessions.length;
  const completed = sessions.filter((s) => s.completedAt).length;
  return { started, completed, rate: started ? completed / started : null };
}

/** scoreAfter.total - scoreBefore.total (둘 다 있을 때만) */
export function sessionDelta(s: SessionRecord): number | null {
  return s.scoreBefore && s.scoreAfter ? s.scoreAfter.total - s.scoreBefore.total : null;
}

export function avgDelta(sessions: SessionRecord[]): number | null {
  const ds = sessions.map(sessionDelta).filter((d): d is number => d !== null);
  return ds.length ? ds.reduce((a, b) => a + b, 0) / ds.length : null;
}

/** 시작한 적 있는 모든 날 + 기록한 날 */
export function activeDays(store: LogosStore): Set<string> {
  const set = new Set(store.streak.days);
  for (const s of store.sessions) set.add(localDate(s.startedAt));
  for (const d of store.diagnostics) set.add(localDate(d.at));
  for (const a of store.arenas ?? []) set.add(localDate(a.startedAt));
  return set;
}

/** 첫 이용일 기준 D1/D7 재방문. 아직 기간이 안 지났으면 null. */
export function returnFlags(store: LogosStore, today: string): { d1: boolean | null; d7: boolean | null } {
  const first = localDate(store.createdAt);
  const days = activeDays(store);
  const check = (n: number) => (dayNum(today) < dayNum(first) + n ? null : days.has(addDays(first, n)));
  return { d1: check(1), d7: check(7) };
}

/* ───────── 진단 ───────── */

export const REDIAGNOSE_DAYS = 28;

export function daysUntilRediagnosis(store: LogosStore, today: string): number | null {
  const last = store.diagnostics[store.diagnostics.length - 1];
  if (!last) return null;
  return Math.max(0, dayNum(localDate(last.at)) + REDIAGNOSE_DAYS - dayNum(today));
}

export function nextDiagnosticDate(at: string): string {
  return addDays(localDate(at), REDIAGNOSE_DAYS);
}

/* ───────── 한 달 전의 나 ───────── */

export type CompareResult = { older: SessionRecord; newer: SessionRecord; sameTopic: boolean } | null;

const textOf = (s: SessionRecord) => s.finalSummary ?? s.firstClaim ?? '';

/**
 * 완료된 기록 중 ≥21일 전 것을 찾아 가장 최근 기록과 비교.
 * 같은 분야·주제가 있으면 우선, 없으면 가장 오래된 것 vs 가장 최근 것.
 */
export function pickComparison(sessions: SessionRecord[], now: Date): CompareResult {
  const done = sessions
    .filter((s) => s.completedAt && textOf(s))
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  if (done.length < 2) return null;
  const newer = done[done.length - 1];
  const cutoff = now.getTime() - 21 * 86_400_000;
  const old = done.filter((s) => s !== newer && new Date(s.startedAt).getTime() <= cutoff);
  const sameField = (s: SessionRecord) => s.topic === newer.topic || (!!s.field && s.field === newer.field);
  const sameOld = old.find(sameField);
  if (sameOld) return { older: sameOld, newer, sameTopic: true };
  if (old.length) return { older: old[0], newer, sameTopic: false };
  return { older: done[0], newer, sameTopic: false };
}

/* ───────── 저장소 ───────── */

function randomId(prefix = ''): string {
  const c = typeof crypto !== 'undefined' ? crypto : undefined;
  if (c && 'randomUUID' in c) return prefix + c.randomUUID();
  return prefix + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const newId = () => randomId();

export function emptyStore(now = new Date()): LogosStore {
  return {
    version: STORE_VERSION,
    participantId: randomId('p-'),
    createdAt: now.toISOString(),
    sessions: [],
    diagnostics: [],
    streak: { days: [], freezesUsed: {} },
    ownerId: null,
    arenas: [],
  };
}

function isStore(v: unknown): v is LogosStore {
  if (!v || typeof v !== 'object') return false;
  const o = v as Partial<LogosStore>;
  return (
    o.version === STORE_VERSION &&
    typeof o.participantId === 'string' &&
    typeof o.createdAt === 'string' &&
    Array.isArray(o.sessions) &&
    Array.isArray(o.diagnostics) &&
    !!o.streak &&
    Array.isArray(o.streak.days)
  );
}

let cacheRaw: string | null | undefined;
let cacheVal: LogosStore | null = null;
let memoryFallback: LogosStore | null = null;

function readRaw(): string | null {
  try {
    return localStorage.getItem(STORE_KEY);
  } catch {
    return null;
  }
}

export function loadStore(): LogosStore {
  if (typeof window === 'undefined') return emptyStore();
  const raw = readRaw();
  if (cacheVal && raw === cacheRaw) return cacheVal;
  let parsed: LogosStore | null = null;
  if (raw) {
    try {
      const v: unknown = JSON.parse(raw);
      if (isStore(v)) {
        let needsId = false;
        const diagnostics = v.diagnostics.map((d) => {
          if (d.id) return d;
          needsId = true;
          return { ...d, id: randomId() };
        });
        parsed = {
          ...v,
          diagnostics,
          ownerId: v.ownerId ?? null,
          arenas: Array.isArray(v.arenas) ? v.arenas : [],
          streak: { days: v.streak.days, freezesUsed: v.streak.freezesUsed ?? {} },
        };
        if (needsId) {
          // 예전 진단 기록에 id를 한 번만 부여해 저장한다(매번 달라지면 동기화 id가 흔들린다)
          try {
            localStorage.setItem(STORE_KEY, JSON.stringify(parsed));
          } catch {
            /* 저장 불가 환경 */
          }
        }
      }
    } catch {
      /* 손상된 값은 무시 */
    }
  }
  if (!parsed) {
    if (raw) {
      try {
        localStorage.setItem(STORE_KEY + '.bak', raw); // 손상·다른 버전 값은 덮어쓰기 전에 백업
      } catch {
        /* 저장 불가 환경 */
      }
    }
    parsed = memoryFallback ?? emptyStore();
    memoryFallback = parsed;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(parsed));
    } catch {
      /* 저장 불가 환경 */
    }
  }
  cacheRaw = readRaw();
  cacheVal = parsed;
  return parsed;
}

function writeStore(next: LogosStore) {
  memoryFallback = next;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(next));
  } catch {
    /* 저장 불가 */
  }
  cacheRaw = undefined;
  cacheVal = null;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function updateStore(fn: (s: LogosStore) => LogosStore) {
  writeStore(fn(loadStore()));
}

function subscribe(cb: () => void) {
  window.addEventListener(CHANGE_EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(CHANGE_EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}

export function useStore(): LogosStore {
  return useSyncExternalStore(subscribe, loadStore, () => emptyStoreStable);
}
const emptyStoreStable = emptyStore();

/* ───────── 변경 헬퍼 ───────── */

type RecordChangeListener = (kind: RecordKind, id: string) => void;
const recordListeners = new Set<RecordChangeListener>();

/** 기록이 만들어지거나 바뀔 때마다 호출된다(동기화 outbox용). 해제 함수를 돌려준다. */
export function onRecordChange(cb: RecordChangeListener) {
  recordListeners.add(cb);
  return () => {
    recordListeners.delete(cb);
  };
}

const notifyRecord: RecordChangeListener = (kind, id) => recordListeners.forEach((fn) => fn(kind, id));

export function upsertSession(rec: SessionRecord) {
  updateStore((s) => {
    const i = s.sessions.findIndex((x) => x.id === rec.id);
    const sessions = i >= 0 ? s.sessions.map((x, j) => (j === i ? rec : x)) : [...s.sessions, rec];
    return { ...s, sessions };
  });
  notifyRecord(rec.kind, rec.id);
}

export function upsertArena(rec: ArenaRecord) {
  updateStore((s) => {
    const arenas = s.arenas ?? [];
    const i = arenas.findIndex((x) => x.id === rec.id);
    return { ...s, arenas: i >= 0 ? arenas.map((x, j) => (j === i ? rec : x)) : [...arenas, rec] };
  });
  notifyRecord('arena', rec.id);
}

/** 아레나 전적(판정별 횟수). 판정이 난 판만 센다. */
export function arenaRecord(arenas: ArenaRecord[] = []): { w: number; d: number; l: number } {
  const r = { w: 0, d: 0, l: 0 };
  for (const a of arenas) {
    const v = a.result?.verdict;
    if (v === 'win') r.w += 1;
    else if (v === 'draw') r.d += 1;
    else if (v === 'lose') r.l += 1;
  }
  return r;
}

const replacedListeners = new Set<() => void>();

/** replaceAll(서버 동기화)로 저장소가 통째로 바뀐 뒤마다 호출된다. 기록별 변경 알림(onRecordChange)은 따로 오지 않는다. 해제 함수를 돌려준다. */
export function onStoreReplaced(cb: () => void) {
  replacedListeners.add(cb);
  return () => {
    replacedListeners.delete(cb);
  };
}

/** 서버에서 받은 데이터로 로컬 캐시를 통째로 바꾼다(기록별 변경 알림 없음 — onStoreReplaced로만 알린다. 동기화 전용). */
export function replaceAll(data: LogosStore) {
  writeStore({ ...data, arenas: data.arenas ?? [], ownerId: data.ownerId ?? null });
  replacedListeners.forEach((fn) => fn());
}

/** 로컬 캐시를 비운다(로그아웃·다른 계정 전환). 새 participantId가 만들어진다. */
export function clearLocal() {
  writeStore(emptyStore());
}

/** 오늘을 기록한 날로 추가하고 streak.freezesUsed를 다시 계산해 저장한다. */
export function recordActivity(now = new Date()) {
  const today = toISODate(now);
  updateStore((s) => {
    const days = s.streak.days.includes(today) ? s.streak.days : [...s.streak.days, today].sort();
    const info = computeStreak(days, today);
    const freezesUsed = { ...s.streak.freezesUsed };
    for (const d of info.freezeDates) freezesUsed[isoWeekKey(d)] = d;
    return { ...s, streak: { days, freezesUsed } };
  });
}

/**
 * 진단 기록이 받은 폼. form이 있으면 그것, 없으면(옛 기록) 문항 텍스트를 ko/en 사전과 맞춰 찾고,
 * 그래도 없으면 옛 방식(기록 순번 % 4)으로 추정한다. index = 기록 배열에서의 위치.
 */
export function diagnosticForm(rec: DiagnosticRecord, index: number): DiagnosticForm {
  if (rec.form) return rec.form;
  for (const locale of ['ko', 'en'] as const) {
    const i = DIAGNOSTIC_FORMS.findIndex((_, n) => translate('diagnostic', `prompt${n}` as 'prompt0', undefined, locale) === rec.prompt);
    if (i >= 0) return formFromPromptIndex(i);
  }
  return formFromPromptIndex(index % DIAGNOSTIC_FORMS.length);
}

/**
 * 기존 진단 기록이 받은 폼들, 오래된 것부터 (pickForm의 used).
 * since(파일럿 최초 참가 시각)를 주면 그 이후 기록만 센다 — 참가 전 진단은 채점 대상이 아니므로 사전/사후 순서에서 뺀다.
 */
export function usedDiagnosticForms(diagnostics: DiagnosticRecord[], since?: string | null): DiagnosticForm[] {
  const t = since ? Date.parse(since) : NaN;
  return diagnostics
    .map((d, i) => ({ d, i }))
    .filter(({ d }) => Number.isNaN(t) || Date.parse(d.at) >= t)
    .map(({ d, i }) => diagnosticForm(d, i));
}

export function addDiagnostic(rec: DiagnosticRecord) {
  const withId = rec.id ? rec : { ...rec, id: newId() };
  updateStore((s) => ({ ...s, diagnostics: [...s.diagnostics, withId] }));
  recordActivity(new Date(withId.at));
  notifyRecord('diagnostic', withId.id!);
}

/* ───────── 내보내기 ───────── */

export function buildExport(store: LogosStore, now = new Date()) {
  const today = toISODate(now);
  return {
    note: translate('common', 'exportNote'),
    exportedAt: now.toISOString(),
    participantId: store.participantId,
    version: store.version,
    createdAt: store.createdAt,
    metrics: {
      completion: completionRate(store.sessions),
      avgInSessionDelta: avgDelta(store.sessions),
      streak: computeStreak(store.streak.days, today),
      returns: returnFlags(store, today),
    },
    sessions: store.sessions,
    diagnostics: store.diagnostics,
    arenas: store.arenas ?? [],
    streak: store.streak,
  };
}

export function exportJSON(now = new Date()): string {
  return JSON.stringify(buildExport(loadStore(), now), null, 2);
}
