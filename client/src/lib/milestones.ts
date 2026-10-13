/*
 * milestones.ts — 루브릭 항목별 "처음 도달" 기록. 순수 함수 + 본 마일스톤 저장(localStorage).
 * 항목 점수는 0 / 중간 / 만점의 3단계다(prompts.ts, schemas.ts): 0 = L1, 중간 = L2, 만점 = L3.
 * 대상은 점수가 있는 코칭·논증 기록(scoreAfter), 진단, 아레나 판정이다.
 */
import type { LogosStore, RecordKind } from './store';
import { DIMS, type Dim } from './recap';

export const SEEN_KEY = 'logos.ms.seen';

export type Level = 1 | 2 | 3;

export type Milestone = {
  /** `${dim}:L${level}` — seen 저장 키 */
  id: string;
  dim: Dim;
  level: 2 | 3;
  recordId: string;
  kind: RecordKind;
  /** 그 기록의 완료 시각(ISO) */
  at: string;
  topic?: string;
  isNew: boolean;
};

export type NextMilestone = { dim: Dim; level: 2 | 3; hintKey: 'hintConsistency' | 'hintEvidence' | 'hintDefense' };

const HINT = { consistency: 'hintConsistency', evidence: 'hintEvidence', defense: 'hintDefense' } as const;
const maxOf = (dim: Dim) => DIMS.find((d) => d.key === dim)!.max;

/** 점수 → 단계. 만점 이상 L3, 중간(만점의 절반) 이상 L2, 그 밖에는 L1. */
export function levelOf(dim: Dim, value: number): Level {
  const max = maxOf(dim);
  if (value >= max) return 3;
  if (value >= max / 2) return 2;
  return 1;
}

type Scored = { recordId: string; kind: RecordKind; at: string; topic?: string; scores: Record<Dim, number> };

function scoredRecords(store: LogosStore): Scored[] {
  const out: Scored[] = [];
  for (const s of store.sessions) {
    if (s.scoreAfter) out.push({ recordId: s.id, kind: s.kind, at: s.completedAt ?? s.startedAt, topic: s.topic, scores: s.scoreAfter });
  }
  for (const d of store.diagnostics) {
    out.push({ recordId: d.id ?? d.at, kind: 'diagnostic', at: d.at, scores: d.score });
  }
  for (const a of store.arenas ?? []) {
    if (a.result) out.push({ recordId: a.id, kind: 'arena', at: a.completedAt ?? a.startedAt, scores: a.result });
  }
  return out.sort((x, y) => x.at.localeCompare(y.at));
}

export function loadSeen(): Set<string> {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]');
    return new Set(Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

export function markSeen(ids: string[]): void {
  if (!ids.length) return;
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(new Set(Array.from(loadSeen()).concat(ids)))));
  } catch {
    /* 저장 불가 환경 */
  }
}

/**
 * 항목별로 L2·L3에 처음 닿은 기록. 첫 기록이 곧바로 만점이면 L2·L3 둘 다 그 기록이다.
 * 최신순(같은 시각이면 높은 단계 먼저)으로 돌려준다.
 */
export function detectMilestones(store: LogosStore, seen: ReadonlySet<string> = loadSeen()): Milestone[] {
  const recs = scoredRecords(store);
  const out: Milestone[] = [];
  for (const { key: dim } of DIMS) {
    for (const level of [2, 3] as const) {
      const r = recs.find((x) => levelOf(dim, x.scores[dim]) >= level);
      if (!r) continue;
      const id = `${dim}:L${level}`;
      out.push({ id, dim, level, recordId: r.recordId, kind: r.kind, at: r.at, topic: r.topic, isNew: !seen.has(id) });
    }
  }
  return out.sort((a, b) => b.at.localeCompare(a.at) || b.level - a.level);
}

/**
 * 이번 방문 동안 NEW를 유지한다: isNew였던 id를 sticky에 모아 두고(호출자가 방문 동안 같은 Set을 들고 있는다),
 * 이후 markSeen·store 변경으로 다시 계산돼도 그 id는 계속 isNew로 돌려준다.
 */
export function keepNew(milestones: Milestone[], sticky: Set<string>): Milestone[] {
  for (const m of milestones) if (m.isNew) sticky.add(m.id);
  return milestones.map((m) => (m.isNew === sticky.has(m.id) ? m : { ...m, isNew: true }));
}

/**
 * 아직 못 간 목표 중 가장 가까운 것. 항목마다 지금까지의 최고 단계 다음 단계를 목표로 두고,
 * 가장 최근 기록의 점수가 그 문턱에 얼마나 모자란지(만점 대비)로 비교한다. 점수 기록이 없거나 모두 L3면 null.
 */
export function nextMilestone(store: LogosStore): NextMilestone | null {
  const recs = scoredRecords(store);
  if (!recs.length) return null;
  const latest = recs[recs.length - 1].scores;
  let best: { dim: Dim; level: 2 | 3; gap: number } | null = null;
  for (const { key: dim, max } of DIMS) {
    const reached = Math.max(...recs.map((r) => levelOf(dim, r.scores[dim])));
    if (reached >= 3) continue;
    const level = (reached + 1) as 2 | 3;
    const gap = Math.max(0, (level === 3 ? max : max / 2) - latest[dim]) / max;
    if (!best || gap < best.gap || (gap === best.gap && level < best.level)) best = { dim, level, gap };
  }
  return best && { dim: best.dim, level: best.level, hintKey: HINT[best.dim] };
}
