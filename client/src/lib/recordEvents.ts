/*
 * recordEvents.ts — 로컬 기록(store.ts)의 변화를 제품 이벤트로 바꾼다. 진단(diagnostic)은 Diagnostic.tsx가 직접 보내므로 여기서 제외한다.
 *
 * onRecordChange는 (kind, id)만 알려 주고 replaceAll(서버 동기화)은 알리지 않으므로, 기록별 마지막 스냅샷을 이 모듈이 들고 비교한다.
 * 동기화(onStoreReplaced) 뒤에는 스냅샷을 새로 떠서, 동기화로 받은 진행 중 기록을 이어서 끝내면 *_complete가 나가게 한다(옛 완료 기록은 이미 완료 상태라 이벤트가 없다).
 * 스냅샷에 없는 기록은 startedAt이 최근일 때만 "방금 만든 것"으로 보고 이벤트를 낸다(동기화로 들어온 옛 기록의 중복 방지).
 */
import type { EventName } from '@shared/events';
import { loadStore, onRecordChange, onStoreReplaced, type RecordKind } from './store';
import { track } from './track';

type TrackedKind = Exclude<RecordKind, 'diagnostic'>;
export type RecSnap = { kind: TrackedKind; startedAt?: string; completedAt?: string; hasSummary: boolean };
export type RecView = Record<string, RecSnap>;

const FRESH_MS = 2 * 60_000;

/** prev → next 사이에 생긴 이벤트(이름 순서: start → summary → complete). */
export function recordTransitions(prev: RecView, next: RecView, now = Date.now()): EventName[] {
  const out: EventName[] = [];
  for (const [id, n] of Object.entries(next)) {
    const p = prev[id];
    if (!p) {
      const t = n.startedAt ? Date.parse(n.startedAt) : NaN;
      if (!(now - t < FRESH_MS)) continue; // 오래된 기록이 처음 보이는 것 = 동기화
      out.push(`${n.kind}_start` as EventName);
      if (n.kind === 'session' && n.hasSummary) out.push('session_summary');
      if (n.completedAt) out.push(`${n.kind}_complete` as EventName);
      continue;
    }
    if (n.kind === 'session' && n.hasSummary && !p.hasSummary) out.push('session_summary');
    if (n.completedAt && !p.completedAt) out.push(`${n.kind}_complete` as EventName);
  }
  return out;
}

function view(): RecView {
  const s = loadStore();
  const v: RecView = {};
  for (const r of s.sessions) v[r.id] = { kind: r.kind, startedAt: r.startedAt, completedAt: r.completedAt, hasSummary: !!r.finalSummary };
  for (const r of s.arenas ?? []) v[r.id] = { kind: 'arena', startedAt: r.startedAt, completedAt: r.completedAt, hasSummary: false };
  return v;
}

let installed = false;

/** store의 기록 변경 구독에 연결한다(한 번만). */
export function installRecordEvents(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  let snap = view();
  onStoreReplaced(() => {
    snap = view();
  });
  onRecordChange((kind, id) => {
    const next = view();
    const prev = snap;
    snap = next;
    if (kind === 'diagnostic') return;
    // 알림이 온 기록만 비교한다 — 다른 기록의 차이(동기화로 바뀐 것 등)는 이벤트로 만들지 않는다
    const one = (v: RecView): RecView => (v[id] ? { [id]: v[id] } : {});
    for (const name of recordTransitions(one(prev), one(next))) track(name);
  });
}
