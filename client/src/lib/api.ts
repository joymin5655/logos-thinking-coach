/*
 * api.ts — /api/coach 클라이언트. 서버 계약(server/logos/schemas.ts, docs/API_CONTRACT.md)과 1:1.
 * 오류 문구는 서버가 아니라 코드로 골라 i18n `errors`에서 가져온다.
 */
import { getLocale, translate } from '../i18n';
import { supabase } from './supabase';

export type Stage = '표면' | '도전' | '핵심' | '통합';
export type Control = 'DEEPEN' | 'ENOUGH' | 'THINK';
export type DetectedType = '고민형' | '지적형' | '검증형';
export type Position = 'agree' | 'disagree' | 'conditional';
export type ArenaSide = 'pro' | 'con';
export type ScoreKind = 'diagnostic' | 'session' | 'argue';
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

export type ArenaTurnRes = { argument: string; targetsClaim: string; promptVersion: string };
export type ArenaJudgeRes = {
  consistency: number;
  evidence: number;
  defense: number;
  total: number;
  verdict: 'win' | 'draw' | 'lose';
  rationale: string;
  lessons: { quote: string; lesson: string }[];
  promptVersion: string;
};

/** sid = 세션·판·진단 1건의 id(한도는 sid 단위로 센다). locale은 coach()가 붙인다. */
type Req =
  | { action: 'session.turn'; sid: string; topic: string; stage: Stage; history: HistoryItem[]; message: string; control?: Control; anchor?: string }
  | { action: 'session.report'; sid: string; topic: string; history: HistoryItem[] }
  | { action: 'argue.turn'; sid: string; topic: string; position: Position; round: number; history: HistoryItem[]; message: string }
  | { action: 'score'; sid: string; kind: ScoreKind; text: string; context?: string }
  | { action: 'arena.turn'; sid: string; topicId: string; side: ArenaSide; round: number; history: HistoryItem[]; message: string }
  | { action: 'arena.judge'; sid: string; topicId: string; side: ArenaSide; transcript: HistoryItem[] };

type ResOf<A extends Req['action']> = A extends 'session.turn'
  ? SessionTurnRes
  : A extends 'session.report'
    ? SessionReportRes
    : A extends 'argue.turn'
      ? ArgueTurnRes
      : A extends 'arena.turn'
        ? ArenaTurnRes
        : A extends 'arena.judge'
          ? ArenaJudgeRes
          : ScoreRes;

export type ApiErrorCode = 'auth' | 'quota' | 'rate' | 'upstream' | 'unavailable' | 'origin' | 'bad_request' | 'timeout' | 'network';
const CODES: readonly ApiErrorCode[] = ['auth', 'quota', 'rate', 'upstream', 'unavailable', 'origin', 'bad_request', 'timeout', 'network'];
const TIMEOUT_MS = 55_000; // 서버 타임아웃 25초 + 재시도 1회(최대 ~50초)보다 길게

export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode,
    public reason?: string,
    public status?: number,
  ) {
    super(translate('errors', code));
    this.name = 'ApiError';
  }
}

const codeFromStatus = (status: number): ApiErrorCode =>
  status === 401 ? 'auth' : status === 403 ? 'origin' : status === 429 ? 'rate' : status === 502 ? 'upstream' : status === 503 ? 'unavailable' : 'bad_request';

async function accessToken(): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

export async function coach<R extends Req>(payload: R): Promise<ResOf<R['action']>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = await accessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch('/api/coach', {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...payload, locale: getLocale() }),
      signal: ctrl.signal,
    });
  } catch {
    throw new ApiError(ctrl.signal.aborted ? 'timeout' : 'network');
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
    const o = data && typeof data === 'object' ? (data as { code?: unknown; reason?: unknown }) : {};
    const code = CODES.find((c) => c === o.code) ?? codeFromStatus(res.status);
    throw new ApiError(code, typeof o.reason === 'string' ? o.reason : undefined, res.status);
  }
  if (!data) throw new ApiError('upstream', undefined, res.status);
  return data as ResOf<R['action']>;
}

export function errorMessage(e: unknown): string {
  return e instanceof Error && e.message ? e.message : translate('errors', 'network');
}

/**
 * 로그인이 필요한 오류(401)면 /login?next=현재 경로로 보내고 true를 돌려준다.
 * 호출한 쪽은 true면 오류 문구를 띄우지 않아도 된다.
 */
export function handleAuthError(e: unknown, navigate: (to: string) => void): boolean {
  if (!(e instanceof ApiError) || e.code !== 'auth') return false;
  navigate(`/login?next=${encodeURIComponent(location.pathname + location.search)}`);
  return true;
}
