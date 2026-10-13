/*
 * track.ts — 제품 이벤트 계측 클라이언트. 익명 id(logos.aid)로 이벤트를 모아 `track` RPC로 배치 전송한다.
 *
 * 로컬 기록(store.ts)과 분리돼 있다: participantId·clearLocal과 무관하다. anon id는 로그아웃·데이터 삭제 때 resetAnonymous()로 회전한다.
 * GPC(Global Privacy Control)·DNT가 켜져 있으면 아무것도 저장하거나 보내지 않는다. env 없음·SSR·테스트에서는 조용히 no-op.
 * 큐는 메모리 + localStorage(logos.evq, 최대 50건). 전송 실패 시 네트워크·5xx는 큐를 유지하고 지수 백오프(5초→최대 5분)로 다시 보낸다.
 * 4xx(함수 없음·잘못된 요청·인증 거부 등 재시도로 낫지 않는 오류)는 그 배치를 버려 뒤 이벤트가 막히지 않게 한다.
 */
import { MAX_BATCH, MAX_PROPS_BYTES, type EventName, type EventProps } from '../../../shared/events';
import { TOUCH_KEY } from './acquisition';
import { supabase } from './supabase';

export const ANON_KEY = 'logos.aid';
export const QUEUE_KEY = 'logos.evq';
export const MAX_QUEUE = 50;
export const FLUSH_INTERVAL_MS = 5000;
export const FLUSH_AT = 10;
export const BACKOFF_MAX_MS = 5 * 60_000;
const MAX_STRING = 32;
const MAX_PATH = 64;

export type QueuedEvent = { name: EventName; props?: EventProps; path?: string; ts: number };

/* ───────── 순수 로직 ───────── */

/**
 * 숫자(유한)·불리언·≤32자 문자열만 남긴다. 나머지 키는 지우고, 512바이트를 넘으면 뒤 키부터 뺀다.
 * 서버는 jsonb 텍스트(`{"a": 1, "b": 2}` — 키마다 ': ' 공백, 키 사이 ', ' 공백)의 길이로 재므로 키당 2바이트를 더해 계산한다.
 */
export function sanitizeProps(props: Record<string, unknown> | undefined): EventProps | undefined {
  if (!props) return undefined;
  const out: EventProps = {};
  for (const [k, v] of Object.entries(props)) {
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    else if (typeof v === 'boolean') out[k] = v;
    else if (typeof v === 'string' && v.length <= MAX_STRING) out[k] = v;
  }
  const keys = Object.keys(out);
  while (keys.length && new TextEncoder().encode(JSON.stringify(out)).length + keys.length * 2 > MAX_PROPS_BYTES) {
    delete out[keys.pop()!];
  }
  return keys.length ? out : undefined;
}

/** GPC가 true이거나 DNT가 '1'이면 추적하지 않는다. */
export function shouldTrack(gpc: boolean | undefined | null, dnt: string | undefined | null): boolean {
  return gpc !== true && dnt !== '1';
}

/** 큐 끝에 붙이고 max를 넘으면 오래된 것부터 버린다. */
export function enqueueEvent(queue: QueuedEvent[], ev: QueuedEvent, max = MAX_QUEUE): QueuedEvent[] {
  const next = [...queue, ev];
  return next.length > max ? next.slice(next.length - max) : next;
}

/** 큐 앞에서 n건(기본 25)을 떼어 낸다. */
export function takeBatch(queue: QueuedEvent[], n = MAX_BATCH): { batch: QueuedEvent[]; rest: QueuedEvent[] } {
  return { batch: queue.slice(0, n), rest: queue.slice(n) };
}

/** 저장된 JSON에서 형식이 맞는 이벤트만 되살린다. */
export function parseQueue(raw: string | null): QueuedEvent[] {
  if (!raw) return [];
  try {
    const v: unknown = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    return v
      .filter((e): e is QueuedEvent => !!e && typeof e === 'object' && typeof (e as QueuedEvent).name === 'string' && typeof (e as QueuedEvent).ts === 'number')
      .slice(-MAX_QUEUE);
  } catch {
    return [];
  }
}

/** 재시도로 낫지 않는 응답인가: 4xx(요청 시간 초과 408·요청 과다 429 제외). 네트워크 오류(0/없음)·5xx는 일시적이다. */
export function isPermanentFailure(status: number | undefined | null): boolean {
  return typeof status === 'number' && status >= 400 && status < 500 && status !== 408 && status !== 429;
}

/** 다음 재시도 간격: 두 배로, 최대 5분. */
export function nextBackoff(cur: number): number {
  return Math.min(cur * 2, BACKOFF_MAX_MS);
}

/** keepalive 요청 헤더. 로그인 토큰이 있을 때만 Authorization을 붙인다(publishable key는 Bearer로 보내지 않는다). */
export function keepaliveHeaders(apiKey: string, token: string | null): Record<string, string> {
  return { 'Content-Type': 'application/json', apikey: apiKey, ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

/** KST(UTC+9) 기준 YYYY-MM-DD. */
export function kstDay(now: number): string {
  return new Date(now + 9 * 3600_000).toISOString().slice(0, 10);
}

/** 경로 → 라우트 진입 이벤트. '/dashboard' 하위는 app_open(하루 1회 제한은 호출 쪽). */
export function eventForPath(path: string): EventName | null {
  if (path === '/') return 'landing_view';
  if (path === '/join') return 'join_view';
  if (path === '/dashboard' || path.startsWith('/dashboard/')) return 'app_open';
  return null;
}

/* ───────── 환경 ───────── */

const hasWindow = () => typeof window !== 'undefined';

function store(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function privacyAllows(): boolean {
  if (typeof navigator === 'undefined') return true;
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return shouldTrack(nav.globalPrivacyControl, navigator.doNotTrack);
}

const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL;
const PUBLISHABLE_KEY = import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY;

/** 보낼 수 있는 환경인가: 브라우저 + Supabase 설정 + 프라이버시 신호 허용. */
export function trackingEnabled(): boolean {
  return hasWindow() && !!supabase && !!SUPABASE_URL && !!PUBLISHABLE_KEY && privacyAllows();
}

const newUuid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 3) | 8).toString(16);
      });

let memAnon: string | null = null;

/** 익명 id. 없으면 만들어 저장한다(저장이 막힌 환경에서는 이 탭 동안만 유지). */
export function getAnonId(): string {
  if (memAnon) return memAnon;
  const ls = store();
  try {
    const cur = ls?.getItem(ANON_KEY);
    if (cur) return (memAnon = cur);
  } catch {
    /* 읽기 불가 */
  }
  memAnon = newUuid();
  try {
    ls?.setItem(ANON_KEY, memAnon);
  } catch {
    /* 저장 불가 */
  }
  return memAnon;
}

/* ───────── 큐·전송 ───────── */

let queue: QueuedEvent[] | null = null;
let inflight = new Set<QueuedEvent>();
let timer: ReturnType<typeof setTimeout> | null = null;
let started = false;
let accessToken: string | null = null;
let backoff = FLUSH_INTERVAL_MS; // 다음 일시적 실패 뒤 기다릴 시간. 실패가 이어질수록 늘고, 성공하면 되돌린다
let retryAt = 0; // 이 시각 전에는 예약 flush·track()의 즉시 flush가 기다린다
let generation = 0; // resetAnonymous마다 +1 — 그 전에 보낸 keepalive가 실패해도 이전 사용자의 이벤트를 큐로 되살리지 않는다

/** 저장된 큐를 읽는다. 저장소가 없거나 읽기에서 던져도(차단된 쿠키·프라이빗 모드) 빈 큐로 계속 동작한다. */
export function readStoredQueue(): QueuedEvent[] {
  try {
    return parseQueue(store()?.getItem(QUEUE_KEY) ?? null);
  } catch {
    return [];
  }
}

function q(): QueuedEvent[] {
  if (!queue) queue = readStoredQueue();
  return queue;
}

function persist() {
  try {
    store()?.setItem(QUEUE_KEY, JSON.stringify(q()));
  } catch {
    /* 저장 불가 — 메모리 큐만 쓴다 */
  }
}

function drop(sent: QueuedEvent[]) {
  const set = new Set(sent);
  queue = q().filter((e) => !set.has(e));
  persist();
}

function schedule() {
  if (timer || !q().length) return;
  timer = setTimeout(() => {
    timer = null;
    void flush();
  }, Math.max(retryAt - Date.now(), FLUSH_INTERVAL_MS)); // 실패 직후라면 백오프가 끝나는 때까지 기다린다
}

/** 전송 결과를 반영한다. 성공은 백오프 초기화, 4xx는 버리되 초기화(서버는 살아 있다), 그 밖은 백오프를 늘린다. 버려야 하면 true. */
function settle(status: number | undefined, ok: boolean): boolean {
  if (ok || isPermanentFailure(status)) {
    backoff = FLUSH_INTERVAL_MS;
    retryAt = 0;
    return true;
  }
  retryAt = Date.now() + backoff;
  backoff = nextBackoff(backoff);
  return false;
}

/** 큐 앞쪽 최대 25건을 RPC로 보낸다. 네트워크·5xx 실패는 큐에 남겨 백오프 뒤 다시 보내고, 4xx는 그 배치를 버린다. */
export async function flush(): Promise<void> {
  if (!trackingEnabled() || !supabase) return;
  if (Date.now() < retryAt) return schedule(); // 실패 직후 백오프 중이면 기다린다
  const { batch } = takeBatch(q().filter((e) => !inflight.has(e)));
  if (!batch.length) return;
  batch.forEach((e) => inflight.add(e));
  try {
    const { error, status } = await supabase.rpc('track', { p_anon: getAnonId(), p_events: batch.map(toWire) });
    if (settle(error ? status : undefined, !error)) drop(batch);
  } catch {
    settle(undefined, false); // 네트워크 오류 — 큐 유지
  } finally {
    batch.forEach((e) => inflight.delete(e));
    schedule();
  }
}

const toWire = (e: QueuedEvent) => ({ name: e.name, props: e.props ?? {}, ...(e.path ? { path: e.path } : {}), ts: e.ts });

/** 페이지를 떠날 때: 응답을 기다릴 수 없으므로 keepalive fetch로 직접 보낸다. 큐에서는 먼저 뺀다(네트워크·5xx 실패 시 되돌리고, 4xx는 버린다). */
function flushOnHide() {
  if (!trackingEnabled()) return;
  const { batch } = takeBatch(q().filter((e) => !inflight.has(e)));
  if (!batch.length) return;
  // 큐에서 먼저 뺀다. keepalive는 페이지가 닫혀도 전송되고, 미리 빼지 않으면 성공했을 때 다음 방문에 같은 배치가 중복 전송된다.
  // 그 대가로 페이지가 닫히며 요청이 실제로 실패하면(복원할 JS가 이미 없음) 그 배치는 손실될 수 있다 — 의도적으로 감수한다.
  drop(batch);
  const key = PUBLISHABLE_KEY!;
  const gen = generation;
  const restore = () => {
    if (gen !== generation) return; // 로그아웃·데이터 삭제로 리셋된 뒤라면 이전 사용자의 이벤트다 — 되살리지 않는다
    settle(undefined, false);
    queue = [...batch, ...q()].slice(-MAX_QUEUE);
    persist();
    schedule(); // 타이머가 이미 빈 큐로 지나갔을 수 있다
  };
  try {
    void fetch(`${SUPABASE_URL}/rest/v1/rpc/track`, {
      method: 'POST',
      keepalive: true,
      headers: keepaliveHeaders(key, accessToken),
      body: JSON.stringify({ p_anon: getAnonId(), p_events: batch.map(toWire) }),
    }).then((r) => {
      if (r.ok || isPermanentFailure(r.status)) {
        if (gen === generation) settle(r.status, r.ok);
      } else restore();
    }, restore);
  } catch {
    restore();
  }
}

function start() {
  if (started || !hasWindow()) return;
  started = true;
  window.addEventListener('pagehide', flushOnHide);
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flushOnHide();
    });
  }
  window.addEventListener('online', () => void flush());
  // 다른 탭에서 로그아웃·데이터 삭제로 익명 id가 바뀌면 이 탭의 옛 id·큐도 버린다(삭제 전 이벤트를 다시 보내지 않게)
  window.addEventListener('storage', (e) => {
    // oldValue가 있으면 기존 id가 지워지거나 바뀐 것(회전) — 이 탭이 아직 id를 읽지 않았어도(memAnon=null) 쌓인 큐는 옛 사용자 것이다
    const rotated = e.key === null || (e.key === ANON_KEY && e.oldValue !== null);
    if (rotated) resetMemory(); // storage 이벤트는 바꾼 탭 자신에게는 오지 않는다
  });
  // keepalive 요청은 동기적으로 토큰이 필요하다 — 세션 변화를 따라가며 캐시해 둔다
  if (supabase) {
    supabase.auth.onAuthStateChange((_e, s) => {
      accessToken = s?.access_token ?? null;
    });
    void supabase.auth.getSession().then(({ data }) => {
      accessToken ??= data.session?.access_token ?? null;
    });
  }
}

/**
 * 로그아웃·데이터 삭제 뒤: 익명 id를 버려 다음 id가 새로 만들어지게 하고(회전), 보내지 못한 큐·first-touch를 지운다.
 * 남은 큐는 보내지 않고 버린다 — 새 id나 다음 사용자에게 귀속되면 안 된다.
 */
export function resetAnonymous(): void {
  resetMemory();
  const ls = store();
  for (const k of [ANON_KEY, QUEUE_KEY, TOUCH_KEY]) {
    try {
      ls?.removeItem(k);
    } catch {
      /* 저장 불가 */
    }
  }
}

/** 메모리 상태만 비운다. 다른 탭이 익명 id를 회전했을 때는 저장소를 건드리지 않고 이것만 부른다. */
function resetMemory(): void {
  generation++;
  queue = [];
  inflight = new Set();
  backoff = FLUSH_INTERVAL_MS;
  retryAt = 0;
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  memAnon = null;
}

/** 이벤트를 기록한다. 보낼 수 없는 환경이면 아무 일도 하지 않는다. */
export function track(name: EventName, props?: Record<string, unknown>): void {
  if (!trackingEnabled()) return;
  start();
  const path = location.pathname.length <= MAX_PATH ? location.pathname : undefined;
  queue = enqueueEvent(q(), { name, props: sanitizeProps(props), path, ts: Date.now() });
  persist();
  if (q().length >= FLUSH_AT && Date.now() >= retryAt) void flush();
  else schedule();
}
