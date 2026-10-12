/*
 * api.ts — /api/coach 클라이언트. 서버 계약(server/logos/schemas.ts)과 1:1.
 */

export type Stage = '표면' | '도전' | '핵심' | '통합';
export type Control = 'DEEPEN' | 'ENOUGH' | 'THINK';
export type DetectedType = '고민형' | '지적형' | '검증형';
export type Position = 'agree' | 'disagree' | 'conditional';
export type HistoryItem = { role: 'user' | 'assistant'; content: string };

export type SessionTurnRes = {
  question: string;
  stage: Stage;
  detectedType: DetectedType | null;
  aporia: boolean;
  promptVersion: string;
};
export type SessionReportRes = {
  stuckPoints: string[];
  assumptions: string[];
  nextQuestions: string[];
  turningPoint: string;
  promptVersion: string;
};
export type ArgueTurnRes = { question: string; targetWeakness: string; promptVersion: string };
export type ScoreRes = {
  consistency: number;
  evidence: number;
  defense: number;
  total: number;
  rationale: string;
  promptVersion: string;
};

type Req =
  | { action: 'session.turn'; topic: string; stage: Stage; history: HistoryItem[]; message: string; control?: Control; anchor?: string }
  | { action: 'session.report'; topic: string; history: HistoryItem[] }
  | { action: 'argue.turn'; topic: string; position: Position; round: number; history: HistoryItem[]; message: string }
  | { action: 'score'; text: string; context?: string };

type ResOf<A extends Req['action']> = A extends 'session.turn'
  ? SessionTurnRes
  : A extends 'session.report'
    ? SessionReportRes
    : A extends 'argue.turn'
      ? ArgueTurnRes
      : ScoreRes;

export const NETWORK_ERROR = '네트워크 연결을 확인해 주세요.';
export const TIMEOUT_ERROR = 'AI 응답이 늦어지고 있어요. 잠시 후 다시 시도해 주세요.';
const TIMEOUT_MS = 55_000; // 서버 타임아웃 25초 + 재시도 1회(최대 ~50초)보다 길게

export class ApiError extends Error {}

export async function coach<R extends Req>(payload: R): Promise<ResOf<R['action']>> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch('/api/coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
  } catch {
    throw new ApiError(ctrl.signal.aborted ? TIMEOUT_ERROR : NETWORK_ERROR);
  } finally {
    clearTimeout(timer);
  }
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* 본문이 JSON이 아님 */
  }
  if (!res.ok) {
    const msg = data && typeof data === 'object' && 'error' in data ? String((data as { error: unknown }).error) : '';
    throw new ApiError(msg || '요청을 처리하지 못했어요. 잠시 뒤 다시 시도해 주세요.');
  }
  if (!data) throw new ApiError('응답을 읽지 못했어요. 다시 시도해 주세요.');
  return data as ResOf<R['action']>;
}

export function errorMessage(e: unknown): string {
  return e instanceof Error && e.message ? e.message : NETWORK_ERROR;
}
