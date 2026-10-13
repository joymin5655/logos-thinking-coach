import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TERMS_VERSION } from '../../../../shared/terms';
import { PENDING_KEY, PENDING_TTL_MS, clearPendingTermsConsent, flushPendingTermsConsent, markPendingTermsConsent } from '../termsConsent';

const mem = new Map<string, string>();
const storage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
};
const client = (res: () => unknown) => ({ rpc: vi.fn(() => Promise.resolve(res() as { error: unknown })) });

beforeEach(() => {
  mem.clear();
  vi.stubGlobal('localStorage', storage);
});

describe('termsConsent', () => {
  it('표시가 없으면 RPC를 부르지 않는다', async () => {
    const c = client(() => ({ error: null }));
    expect(await flushPendingTermsConsent(c)).toBe(false);
    expect(c.rpc).not.toHaveBeenCalled();
  });

  it('표시가 있으면 현재 버전으로 한 번 부르고 성공하면 표시를 지운다', async () => {
    markPendingTermsConsent();
    const c = client(() => ({ error: null }));
    expect(await flushPendingTermsConsent(c)).toBe(true);
    expect(c.rpc).toHaveBeenCalledWith('record_terms_consent', { p_version: TERMS_VERSION });
    expect(mem.has(PENDING_KEY)).toBe(false);
    expect(await flushPendingTermsConsent(c)).toBe(false);
    expect(c.rpc).toHaveBeenCalledTimes(1);
  });

  it('오류·예외면 표시를 남겨 다음 로드에 다시 시도하고, 던지지 않는다', async () => {
    markPendingTermsConsent();
    expect(await flushPendingTermsConsent(client(() => ({ error: { message: 'x' } })))).toBe(false);
    expect(mem.has(PENDING_KEY)).toBe(true);
    const boom = { rpc: vi.fn(() => Promise.reject(new Error('net'))) };
    expect(await flushPendingTermsConsent(boom)).toBe(false);
    expect(mem.has(PENDING_KEY)).toBe(true);
    expect(await flushPendingTermsConsent(client(() => ({ error: null })))).toBe(true);
  });

  it('만료·손상된 표시는 무시하고 지운다', async () => {
    const c = client(() => ({ error: null }));
    markPendingTermsConsent(1000);
    expect(await flushPendingTermsConsent(c, 1000 + PENDING_TTL_MS + 1)).toBe(false);
    expect(mem.has(PENDING_KEY)).toBe(false);
    mem.set(PENDING_KEY, 'not-json');
    expect(await flushPendingTermsConsent(c)).toBe(false);
    expect(mem.has(PENDING_KEY)).toBe(false);
    expect(c.rpc).not.toHaveBeenCalled();
  });

  it('유효 시간은 1시간이다', async () => {
    expect(PENDING_TTL_MS).toBe(60 * 60 * 1000);
    const c = client(() => ({ error: null }));
    markPendingTermsConsent(1000);
    expect(await flushPendingTermsConsent(c, 1000 + PENDING_TTL_MS)).toBe(true);
  });

  it('RPC 사이에 더 새 표시가 쓰였다면 지우지 않는다(compare-and-clear)', async () => {
    markPendingTermsConsent(1000);
    const c = { rpc: vi.fn(() => { markPendingTermsConsent(2000); return Promise.resolve({ error: null }); }) };
    expect(await flushPendingTermsConsent(c, 1500)).toBe(true);
    expect(mem.has(PENDING_KEY)).toBe(true);
    expect(JSON.parse(mem.get(PENDING_KEY)!).t).toBe(2000);
  });

  it('로그아웃 때 쓰는 clear는 표시를 지우고, 이후 flush는 아무것도 하지 않는다', async () => {
    markPendingTermsConsent();
    clearPendingTermsConsent();
    const c = client(() => ({ error: null }));
    expect(await flushPendingTermsConsent(c)).toBe(false);
    expect(c.rpc).not.toHaveBeenCalled();
  });

  it('supabase가 없으면 표시를 건드리지 않는다', async () => {
    markPendingTermsConsent();
    expect(await flushPendingTermsConsent(null)).toBe(false);
    expect(mem.has(PENDING_KEY)).toBe(true);
  });

  it('로그인 시작 실패 시 표시를 거둔다', () => {
    markPendingTermsConsent();
    clearPendingTermsConsent();
    expect(mem.has(PENDING_KEY)).toBe(false);
  });

  it('저장소 접근이 막혀도 던지지 않는다', async () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); }, removeItem: () => { throw new Error('denied'); } });
    expect(() => markPendingTermsConsent()).not.toThrow();
    expect(() => clearPendingTermsConsent()).not.toThrow();
    expect(await flushPendingTermsConsent(client(() => ({ error: null })))).toBe(false);
  });
});
