/*
 * store.ts — LOGOS 로컬 기록 (localStorage 'logos.v1', 버전 있음)
 *
 * 서버에는 아무것도 저장하지 않는다. 기록은 이 기기에만 남고, 파일럿용으로 JSON 내보내기만 가능하다.
 * 아래 순수 함수(streak·완주율·상승폭·재방문)는 today/now를 인자로 받아 테스트 가능하게 둔다.
 */
import { useSyncExternalStore } from 'react';
import type { Stage, Control, Position } from './api';

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

export type DiagnosticRecord = { at: string; prompt: string; text: string; score: Score };

export type Streak = { days: string[]; freezesUsed: Record<string, string> };

export type LogosStore = {
  version: number;
  participantId: string;
  createdAt: string;
  sessions: SessionRecord[];
  diagnostics: DiagnosticRecord[];
  streak: Streak;
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
      if (isStore(v)) parsed = { ...v, streak: { days: v.streak.days, freezesUsed: v.streak.freezesUsed ?? {} } };
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

export function upsertSession(rec: SessionRecord) {
  updateStore((s) => {
    const i = s.sessions.findIndex((x) => x.id === rec.id);
    const sessions = i >= 0 ? s.sessions.map((x, j) => (j === i ? rec : x)) : [...s.sessions, rec];
    return { ...s, sessions };
  });
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

export function addDiagnostic(rec: DiagnosticRecord) {
  updateStore((s) => ({ ...s, diagnostics: [...s.diagnostics, rec] }));
  recordActivity(new Date(rec.at));
}

/* ───────── 내보내기 ───────── */

export function buildExport(store: LogosStore, now = new Date()) {
  const today = toISODate(now);
  return {
    note:
      '이 파일은 LOGOS 파일럿용 내보내기입니다. 사용자가 직접 쓴 글과 AI 대화 전문이 그대로 들어 있고, 이름·이메일은 포함되지 않습니다. participantId는 이 기기에서 한 번 만든 임의 값입니다. 점수는 AI 추정치이며 사람 채점으로 보정되지 않았습니다.',
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
    streak: store.streak,
  };
}

export function exportJSON(now = new Date()): string {
  return JSON.stringify(buildExport(loadStore(), now), null, 2);
}
