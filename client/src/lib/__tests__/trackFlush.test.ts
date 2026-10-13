import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// 브라우저 환경을 흉내 낸다: window 이벤트 핸들러를 잡아 두고, localStorage·fetch를 스텁으로 둔다.
vi.mock('../supabase', () => ({
  supabase: { auth: { onAuthStateChange: vi.fn(), getSession: () => Promise.resolve({ data: { session: null } }) } },
}));
vi.stubEnv('VITE_SUPABASE_URL', 'https://x.supabase.test');
vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'pk');

const handlers: Record<string, () => void> = {};
const mem = new Map<string, string>();
const storage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
};

const { track, resetAnonymous, readStoredQueue, QUEUE_KEY } = await import('../track');

beforeEach(() => {
  mem.clear();
  vi.stubGlobal('window', { addEventListener: (n: string, h: () => void) => void (handlers[n] = h) });
  vi.stubGlobal('document', { addEventListener: () => {}, visibilityState: 'visible' });
  vi.stubGlobal('location', { pathname: '/dashboard' });
  vi.stubGlobal('navigator', {});
  vi.stubGlobal('localStorage', storage);
  resetAnonymous();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.stubEnv('VITE_SUPABASE_URL', 'https://x.supabase.test');
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'pk');
});

const queued = () => JSON.parse(mem.get(QUEUE_KEY) ?? '[]') as unknown[];

describe('flushOnHide — keepalive 실패 복원', () => {
  it('실패하면 큐로 되살린다', async () => {
    let fail!: () => void;
    vi.stubGlobal('fetch', () => new Promise((_, rej) => (fail = () => rej(new Error('net')))));
    track('app_open');
    handlers.pagehide();
    expect(queued()).toHaveLength(0); // 보낸 배치는 먼저 큐에서 뺀다
    fail();
    await Promise.resolve();
    await Promise.resolve();
    expect(queued()).toHaveLength(1);
  });

  it('resetAnonymous 이후에 실패해도 이전 사용자의 이벤트를 되살리지 않는다', async () => {
    let fail!: () => void;
    vi.stubGlobal('fetch', () => new Promise((_, rej) => (fail = () => rej(new Error('net')))));
    track('app_open');
    handlers.pagehide();
    resetAnonymous(); // 로그아웃
    fail();
    await Promise.resolve();
    await Promise.resolve();
    expect(queued()).toHaveLength(0);
  });
});

describe('저장소 읽기 예외', () => {
  it('getItem이 던져도 readStoredQueue·track은 던지지 않고 메모리 큐로 계속 동작한다', () => {
    vi.stubGlobal('localStorage', { ...storage, getItem: () => { throw new Error('denied'); } });
    expect(readStoredQueue()).toEqual([]);
    resetAnonymous();
    expect(() => track('app_open')).not.toThrow();
    expect(queued()).toHaveLength(1); // 쓰기는 가능하므로 저장된다
  });
});

describe('다른 탭의 익명 id 회전', () => {
  const fire = (ev: { key: string | null; oldValue: string | null; newValue: string | null }) =>
    (handlers.storage as unknown as (e: typeof ev) => void)(ev);

  it('다른 탭이 기존 id를 지우면 이 탭에 쌓인 큐도 버린다(아직 id를 읽기 전이어도)', () => {
    const fetchSpy = vi.fn(() => Promise.resolve({ ok: true, status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);
    track('app_open');
    fire({ key: 'logos.aid', oldValue: 'old-id', newValue: null });
    handlers.pagehide();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('다른 탭이 처음 id를 만든 것(oldValue 없음)은 회전이 아니다', () => {
    const fetchSpy = vi.fn(() => Promise.resolve({ ok: true, status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);
    track('app_open');
    fire({ key: 'logos.aid', oldValue: null, newValue: 'new-id' });
    handlers.pagehide();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
