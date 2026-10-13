import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();
vi.mock('../supabase', () => ({ supabase: { rpc: (...a: unknown[]) => rpc(...a) } }));
vi.mock('../sync', () => ({ onSignIn: vi.fn(), onSignedOut: vi.fn(), signOutFlow: vi.fn() }));
vi.mock('../acquisition', () => ({ getTouch: () => ({}) }));
vi.mock('../onboarding', () => ({ clearOnboardingLocal: vi.fn() }));
vi.mock('../track', () => ({ getAnonId: () => 'anon', privacyAllows: () => true, resetAnonymous: vi.fn(), track: vi.fn() }));

const { claimProfile, clearClaims } = await import('../auth');

beforeEach(() => {
  rpc.mockReset();
  rpc.mockResolvedValue({ data: { created: false }, error: null });
  clearClaims();
});

describe('claimProfile 캐시', () => {
  it('성공한 claim은 uid당 한 번만 보낸다', async () => {
    await claimProfile('u1');
    await claimProfile('u1');
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it('clearClaims(로그아웃) 뒤 같은 계정으로 다시 로그인하면 새 익명 이벤트를 잇도록 다시 보낸다', async () => {
    await claimProfile('u1');
    clearClaims();
    await claimProfile('u1');
    expect(rpc).toHaveBeenCalledTimes(2);
  });

  it('실패한 claim은 캐시하지 않아 다음 호출에서 다시 시도한다', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'x' } });
    await claimProfile('u1');
    await claimProfile('u1');
    expect(rpc).toHaveBeenCalledTimes(2);
  });
});
