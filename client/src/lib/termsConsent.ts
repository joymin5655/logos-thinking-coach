/*
 * termsConsent.ts — 가입 동의(약관·방침)를 서버에 남긴다.
 * 동의는 OAuth 이동 전에 받으므로, 이동 전에 "대기 표시"를 저장하고 로그인이 끝난 뒤 RPC를 한 번 부른다.
 * 실패해도 로그인은 막지 않는다. 실패하면 표시를 지우지 않아 다음 로드에서 다시 시도한다.
 */
import { TERMS_VERSION } from '../../../shared/terms';

export const PENDING_KEY = 'logos.terms-consent.pending';
/** 로그인을 끝내지 않은 채 오래 방치된 표시가 다른 사람의 로그인에 쓰이지 않도록 하는 유효 시간 */
export const PENDING_TTL_MS = 60 * 60 * 1000;

type RpcClient = { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ error: unknown }> };

/** 로그인 버튼을 누르는 순간(체크박스가 켜진 상태) 호출한다. */
export function markPendingTermsConsent(now = Date.now()): void {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify({ v: TERMS_VERSION, t: now }));
  } catch {
    /* 저장소 접근 불가 */
  }
}

/** 로그인 시작이 실패했을 때 표시를 거둔다. */
export function clearPendingTermsConsent(): void {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {
    /* 저장소 접근 불가 */
  }
}

function readPending(now: number): { raw: string; version: string } | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    try {
      const p = JSON.parse(raw) as { v?: unknown; t?: unknown } | null;
      if (p && typeof p.v === 'string' && typeof p.t === 'number' && now - p.t <= PENDING_TTL_MS) return { raw, version: p.v };
    } catch {
      /* 손상된 표시 — 아래에서 지운다 */
    }
    localStorage.removeItem(PENDING_KEY); // 깨졌거나 만료된 표시
  } catch {
    /* 저장소 접근 불가 */
  }
  return null;
}

/**
 * 대기 표시가 있으면 RPC를 한 번 부르고, 성공했을 때만 표시를 지운다. 기록했으면 true. 던지지 않는다.
 * RPC 사이에 더 새 표시가 쓰였다면(저장된 값이 읽은 값과 다르면) 지우지 않는다.
 */
export async function flushPendingTermsConsent(client: RpcClient | null, now = Date.now()): Promise<boolean> {
  if (!client) return false;
  const pending = readPending(now);
  if (!pending) return false;
  try {
    const { error } = await client.rpc('record_terms_consent', { p_version: pending.version });
    if (error) return false;
  } catch {
    return false;
  }
  try {
    if (localStorage.getItem(PENDING_KEY) === pending.raw) localStorage.removeItem(PENDING_KEY);
  } catch {
    /* 저장소 접근 불가 */
  }
  return true;
}
