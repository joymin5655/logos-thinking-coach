import { beforeEach, describe, expect, it, vi } from 'vitest';

// user_meta 조회를 흉내 낸다: 호출마다 results에서 하나씩 꺼낸다.
const results: Array<{ data: unknown; error: unknown } | 'throw'> = [];
const maybeSingle = vi.fn(async () => {
  const r = results.shift();
  if (r === 'throw') throw new Error('network');
  return r ?? { data: null, error: null };
});
vi.mock('../supabase', () => ({ supabase: { from: () => ({ select: () => ({ maybeSingle }) }) } }));

const { fetchMyMeta, fetchMyMetaResult } = await import('../cohort');

const meta = { cohort_code: 'PILOT-A7K2', consent_at: '2026-10-05T00:00:00Z', consent_version: 'v1', joined_at: '2026-10-05T00:00:00Z' };

beforeEach(() => {
  results.length = 0;
  maybeSingle.mockClear();
});

describe('fetchMyMetaResult — 오류와 행 없음을 구분', () => {
  it('행 없음은 ok:true, meta:null이고 다시 묻지 않는다', async () => {
    results.push({ data: null, error: null });
    expect(await fetchMyMetaResult()).toEqual({ ok: true, meta: null });
    expect(maybeSingle).toHaveBeenCalledTimes(1);
  });
  it('오류는 1회 재시도하고 성공하면 그 결과', async () => {
    results.push({ data: null, error: { message: 'x' } }, { data: meta, error: null });
    expect(await fetchMyMetaResult()).toEqual({ ok: true, meta });
    expect(maybeSingle).toHaveBeenCalledTimes(2);
  });
  it('재시도도 실패하면 ok:false (예외도 오류로 본다)', async () => {
    results.push('throw', { data: null, error: { message: 'x' } });
    expect(await fetchMyMetaResult()).toEqual({ ok: false });
    expect(maybeSingle).toHaveBeenCalledTimes(2);
  });
  it('fetchMyMeta는 오류·없음 모두 null (재시도 없음)', async () => {
    results.push({ data: null, error: { message: 'x' } });
    expect(await fetchMyMeta()).toBeNull();
    expect(maybeSingle).toHaveBeenCalledTimes(1);
    results.push({ data: meta, error: null });
    expect(await fetchMyMeta()).toEqual(meta);
  });
});
