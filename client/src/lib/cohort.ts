/*
 * cohort.ts — 파일럿 코호트 참가·동의 철회·내 파일럿 상태 조회.
 * 서버 계약은 supabase/migrations/20261020000200_pilot.sql(join_cohort·withdraw_consent)이다.
 * 군(arm)은 사용자에게 보여 주지 않는다(블라인드): 서버가 반환하지도, user_meta 컬럼 select를 허용하지도 않는다.
 * 화면은 joined 여부와 cohort_code·consent_at만 쓴다.
 */
import { COHORT_CODE_RE, CONSENT_VERSION } from '../../../shared/pilot';
import { supabase } from './supabase';

export type JoinErrorCode = 'invalid_code' | 'consent_mismatch' | 'already_joined' | 'full' | 'unknown';
export type JoinResult = { ok: true; joined: boolean } | { error: JoinErrorCode };

export interface MyMeta {
  cohort_code: string | null;
  consent_at: string | null;
  consent_version: string | null;
  /** 최초 참가 시각. 이 시각 이후에 시작한 진단만 채점 자료가 된다. */
  joined_at: string | null;
}

/** 내 파일럿 상태 조회 결과: 오류(ok:false)와 "행 없음"(ok:true, meta:null)을 구분한다. */
export type MyMetaResult = { ok: true; meta: MyMeta | null } | { ok: false };

/** `?c=CODE` 형태의 쿼리 문자열에서 코호트 코드를 뽑는다. 형식이 맞지 않으면 null. */
export function parseCohortCode(search: string): string | null {
  const raw = new URLSearchParams(search).get('c');
  const code = raw?.trim().toUpperCase();
  return code && COHORT_CODE_RE.test(code) ? code : null;
}

type RpcError = { message?: string; code?: string } | null | undefined;

/** join_cohort가 던진 오류를 메시지(우선)·SQLSTATE로 구분한다. */
export function mapJoinError(error: RpcError): JoinErrorCode {
  const msg = error?.message ?? '';
  if (msg.includes('invalid_code')) return 'invalid_code';
  if (msg.includes('consent_mismatch')) return 'consent_mismatch';
  if (msg.includes('already_joined') || error?.code === '23505') return 'already_joined';
  if (/\bfull\b/.test(msg)) return 'full';
  return 'unknown';
}

/** join_cohort가 돌려준 jsonb를 결과로 바꾼다. 모양이 다르면 unknown. */
export function mapJoinData(data: unknown): JoinResult {
  if (!data || typeof data !== 'object') return { error: 'unknown' };
  const d = data as { joined?: unknown };
  if (typeof d.joined !== 'boolean') return { error: 'unknown' };
  return { ok: true, joined: d.joined };
}

export async function joinCohort(code: string): Promise<JoinResult> {
  if (!supabase) return { error: 'unknown' };
  try {
    const { data, error } = await supabase.rpc('join_cohort', { p_code: code, p_consent_version: CONSENT_VERSION });
    return error ? { error: mapJoinError(error) } : mapJoinData(data);
  } catch {
    return { error: 'unknown' };
  }
}

/** 동의 철회. 이후 채점용 내보내기에서 빠진다. 성공하면 true. */
export async function withdrawConsent(): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.rpc('withdraw_consent');
    return !error;
  } catch {
    return false;
  }
}

/** 내 파일럿 상태(user_meta 본인 행)를 한 번 조회한다. */
async function queryMyMeta(): Promise<MyMetaResult> {
  if (!supabase) return { ok: false };
  try {
    const { data, error } = await supabase.from('user_meta').select('cohort_code, consent_at, consent_version, joined_at').maybeSingle();
    return error ? { ok: false } : { ok: true, meta: data as MyMeta | null };
  } catch {
    return { ok: false };
  }
}

/** 조회가 오류면 retries번 더 시도한다. 행 없음은 오류가 아니므로 다시 묻지 않는다. */
export async function fetchMyMetaResult(retries = 1): Promise<MyMetaResult> {
  let r = await queryMyMeta();
  for (let i = 0; !r.ok && i < retries; i++) r = await queryMyMeta();
  return r;
}

/** 내 파일럿 상태(user_meta 본인 행). 없거나 실패하면 null. */
export async function fetchMyMeta(): Promise<MyMeta | null> {
  const r = await queryMyMeta();
  return r.ok ? r.meta : null;
}
