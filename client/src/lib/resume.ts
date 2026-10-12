/*
 * resume.ts — 이어서 할 수 있는 기록 고르기. 지금은 끊긴 코칭 세션만 이어갈 수 있다
 * (오늘의 논증·아레나는 상태를 저장소에서 복원하지 않는다).
 */
import type { SessionRecord } from './store';
import type { Stage } from './api';

export const STAGE_ORDER: Stage[] = ['표면', '도전', '핵심', '통합'];

/** 사용자 답이 한 번이라도 있고 아직 끝나지 않은 가장 최근 코칭 세션. 없으면 null. */
export function pickResume(store: { sessions: SessionRecord[] }): SessionRecord | null {
  return [...store.sessions].reverse().find((s) => s.kind === 'session' && !s.completedAt && s.turns.some((t) => t.role === 'user')) ?? null;
}

/** 마지막 AI 질문의 단계(없으면 표면). */
export function stageOf(r: SessionRecord): Stage {
  return [...r.turns].reverse().find((t) => t.role === 'assistant' && t.stage)?.stage ?? '표면';
}

/** 1~4. 진행 막대·"n/4단계" 표기용. */
export const stageStep = (r: SessionRecord) => STAGE_ORDER.indexOf(stageOf(r)) + 1;

export const resumeHref = (r: SessionRecord) => `/dashboard/session?resume=${encodeURIComponent(r.id)}`;
