process.env.TZ = 'Asia/Seoul';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// store.ts·sync.ts는 window·localStorage가 필요하다(테스트 환경은 node). import보다 먼저 만든다.
const fake = vi.hoisted(() => {
  const mem = new Map<string, string>();
  (globalThis as Record<string, unknown>).localStorage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
  };
  (globalThis as Record<string, unknown>).window = new EventTarget();
  (globalThis as Record<string, unknown>).document = { visibilityState: 'visible', addEventListener: () => {}, documentElement: {} };
  type Row = { id: string; kind: string; data: unknown };
  const state = { rows: new Map<string, Row>(), failUpsert: false, upserts: [] as Row[][] };
  const client = {
    from: () => ({
      upsert: async (rows: Row[]) => {
        if (state.failUpsert) return { error: { message: 'offline' } };
        state.upserts.push(rows);
        rows.forEach((r) => state.rows.set(r.id, r));
        return { error: null };
      },
      select: () => ({
        order: () => ({
          order: () => ({
            range: async (a: number, b: number) => ({ data: [...state.rows.values()].slice(a, b + 1), error: null }),
          }),
        }),
      }),
    }),
    auth: { signOut: vi.fn(async () => ({ error: null })) },
  };
  return { state, client };
});
vi.mock('../supabase', () => ({ supabase: fake.client }));
vi.mock('sonner', () => ({ toast: vi.fn() }));

import { toast } from 'sonner';
import {
  OUTBOX_KEY, flush, mergeRecords, onSignIn, pendingCount, pullAll, signOutFlow, toRow,
} from '../sync';
import {
  addDiagnostic, clearLocal, emptyStore, loadStore, updateStore, upsertArena, upsertSession,
  type ArenaRecord, type DiagnosticRecord, type Score, type SessionRecord,
} from '../store';

const score = (total: number): Score => ({ consistency: 15, evidence: 20, defense: 15, total, rationale: 'r' });
const sess = (id: string, over: Partial<SessionRecord> = {}): SessionRecord => ({
  id, kind: 'session', topic: 't', startedAt: '2026-10-01T00:00:00.000Z', stageReached: '표면', turns: [], promptVersion: 'v1', ...over,
});
const diag = (id: string, at = '2026-10-02T03:00:00.000Z'): DiagnosticRecord => ({ id, at, prompt: 'p', text: 'x', score: score(55) });
const arena = (id: string): ArenaRecord => ({
  id, topicId: 'a1', side: 'pro', startedAt: '2026-10-03T00:00:00.000Z', completedAt: '2026-10-03T00:10:00.000Z', turns: [], promptVersion: 'v2',
  result: { consistency: 30, evidence: 20, defense: 30, total: 80, verdict: 'win', rationale: 'r', lessons: [] },
});
const serverRow = (kind: string, rec: { id?: string }) => ({ id: rec.id!, kind, data: rec });
const outbox = () => JSON.parse(localStorage.getItem(OUTBOX_KEY) ?? '[]') as { id: string; kind: string }[];

beforeEach(() => {
  vi.useFakeTimers();
  fake.state.rows.clear();
  fake.state.upserts.length = 0;
  fake.state.failUpsert = false;
  localStorage.removeItem(OUTBOX_KEY);
  clearLocal();
  vi.mocked(toast).mockClear();
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('toRow', () => {
  it('설문 일부만 답한 기록(0)은 서버 제약(1~5)을 위해 null로 보낸다', () => {
    const r = toRow('session', sess('s9', { survey: { differentFromAI: 0, selfAuthored: 4 } }));
    expect(r.survey_diff).toBeNull();
    expect(r.survey_self).toBe(4);
    expect(toRow('session', sess('s8', { survey: { differentFromAI: 6, selfAuthored: 3 } })).survey_diff).toBeNull();
  });

  it('세션: 점수·설문·완료 시각을 열로 뽑고 data에 원본을 둔다', () => {
    const rec = sess('s1', { completedAt: '2026-10-01T01:00:00.000Z', scoreBefore: score(40), scoreAfter: score(70), survey: { differentFromAI: 4, selfAuthored: 5 } });
    expect(toRow('session', rec)).toEqual({
      id: 's1', kind: 'session', started_at: rec.startedAt, completed_at: rec.completedAt, score_before: 40, score_after: 70,
      survey_diff: 4, survey_self: 5, verdict: null, prompt_version: 'v1', data: rec,
    });
  });
  it('진행 중 세션은 빈 값이 null이고 빈 promptVersion은 null', () => {
    const r = toRow('argue', sess('s2', { kind: 'argue', promptVersion: '' }));
    expect([r.kind, r.completed_at, r.score_before, r.score_after, r.survey_diff, r.prompt_version]).toEqual(['argue', null, null, null, null, null]);
  });
  it('진단: 점수는 score_after, 시작=완료=날짜', () => {
    const d = diag('d1');
    expect(toRow('diagnostic', d)).toMatchObject({ id: 'd1', kind: 'diagnostic', started_at: d.at, completed_at: d.at, score_before: null, score_after: 55, verdict: null });
  });
  it('아레나: 판정과 총점', () => {
    expect(toRow('arena', arena('a1'))).toMatchObject({ kind: 'arena', score_after: 80, verdict: 'win', prompt_version: 'v2' });
  });
});

describe('mergeRecords', () => {
  const base = () => ({ ...emptyStore(new Date('2026-10-10T00:00:00.000Z')), ownerId: 'u1' });
  it('outbox에 없는 로컬은 서버가 이기고, outbox에 있는 로컬은 로컬이 이긴다', () => {
    const local = { ...base(), sessions: [sess('a', { topic: '로컬A' }), sess('b', { topic: '로컬B' })] };
    const rows = [serverRow('session', sess('a', { topic: '서버A' })), serverRow('session', sess('b', { topic: '서버B' }))];
    const m = mergeRecords(local, rows, new Set(['b']), 'u1', '2026-10-10');
    expect(Object.fromEntries(m.sessions.map((s) => [s.id, s.topic]))).toEqual({ a: '서버A', b: '로컬B' });
  });
  it('서버에 없고 outbox에도 없는 로컬 기록은 버리고, outbox에 있으면 남긴다', () => {
    const local = { ...base(), sessions: [sess('gone'), sess('pending')] };
    const m = mergeRecords(local, [], new Set(['pending']), 'u1', '2026-10-10');
    expect(m.sessions.map((s) => s.id)).toEqual(['pending']);
  });
  it('세 종류를 합치고 createdAt은 가장 이른 시작, streak 날짜는 합집합', () => {
    const local = { ...base(), streak: { days: ['2026-10-09'], freezesUsed: {} } };
    const rows = [serverRow('session', sess('s')), serverRow('diagnostic', diag('d')), serverRow('arena', arena('a'))];
    const m = mergeRecords(local, rows, new Set(), 'u1', '2026-10-10');
    expect([m.sessions.length, m.diagnostics.length, m.arenas?.length]).toEqual([1, 1, 1]);
    expect(m.createdAt).toBe('2026-10-01T00:00:00.000Z');
    expect(m.streak.days).toEqual(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-09']);
    expect(m.ownerId).toBe('u1');
  });
});

describe('로그인 동기화', () => {
  it('비회원 기록(진단 포함)은 계정으로 옮긴다', async () => {
    addDiagnostic(diag('d1'));
    upsertSession(sess('s1'));
    expect(pendingCount()).toBe(0); // 비회원은 outbox에 쌓지 않는다
    await onSignIn('u1');
    expect([...fake.state.rows.keys()].sort()).toEqual(['d1', 's1']);
    expect(toast).toHaveBeenCalledWith('2개 기록을 계정에 저장했어요');
    expect(loadStore().ownerId).toBe('u1');
    expect(pendingCount()).toBe(0);
    expect(loadStore().sessions.map((s) => s.id)).toEqual(['s1']);
  });
  it('기록이 없으면 알림 없이 소유자만 지정한다', async () => {
    await onSignIn('u1');
    expect(toast).not.toHaveBeenCalled();
    expect(loadStore().ownerId).toBe('u1');
  });
  it('다른 계정의 캐시는 올리지 않고 버린다', async () => {
    await onSignIn('u1');
    upsertSession(sess('mine'));
    await flush();
    fake.state.rows.clear();
    fake.state.upserts.length = 0;
    // 서버에서 받아 온 u2 기록이 이미 있다고 가정
    fake.state.rows.set('theirs', serverRow('session', sess('theirs')));
    await onSignIn('u2');
    expect(fake.state.upserts).toEqual([]);
    expect(loadStore().sessions.map((s) => s.id)).toEqual(['theirs']);
    expect(loadStore().ownerId).toBe('u2');
    expect(pendingCount()).toBe(0);
  });
  it('서버 기록을 받아 병합한다', async () => {
    await onSignIn('u1');
    fake.state.rows.set('x', serverRow('arena', arena('x')));
    expect(await pullAll('u1')).toBe(true);
    expect(loadStore().arenas?.map((a) => a.id)).toEqual(['x']);
  });
});

describe('outbox', () => {
  it('실패하면 outbox에 남고, 복구되면 비운다', async () => {
    await onSignIn('u1');
    fake.state.failUpsert = true;
    upsertSession(sess('s1'));
    upsertArena(arena('a1'));
    expect(await flush()).toBe(false);
    expect(outbox().map((e) => e.id)).toEqual(['s1', 'a1']);
    expect(pendingCount()).toBe(2);
    fake.state.failUpsert = false;
    expect(await flush()).toBe(true);
    expect(pendingCount()).toBe(0);
    expect([...fake.state.rows.keys()].sort()).toEqual(['a1', 's1']);
  });
  it('1초 디바운스 뒤에 자동으로 보낸다', async () => {
    await onSignIn('u1');
    upsertSession(sess('s1'));
    expect(fake.state.rows.size).toBe(0);
    await vi.advanceTimersByTimeAsync(1100);
    expect(fake.state.rows.has('s1')).toBe(true);
  });
  it('실패 뒤 백오프 재시도로 다시 보낸다', async () => {
    await onSignIn('u1');
    fake.state.failUpsert = true;
    upsertSession(sess('s1'));
    await vi.advanceTimersByTimeAsync(1100);
    expect(pendingCount()).toBe(1);
    fake.state.failUpsert = false;
    await vi.advanceTimersByTimeAsync(2100);
    expect(pendingCount()).toBe(0);
  });
});

describe('signOutFlow', () => {
  it('못 올린 기록이 있고 취소하면 로그아웃하지 않는다', async () => {
    await onSignIn('u1');
    fake.state.failUpsert = true;
    upsertSession(sess('s1'));
    vi.stubGlobal('confirm', vi.fn(() => false));
    expect(await signOutFlow()).toBe(false);
    expect(loadStore().sessions.length).toBe(1);
    expect(fake.client.auth.signOut).not.toHaveBeenCalled();
  });
  it('확인하면 캐시와 outbox를 비우고 로그아웃한다', async () => {
    await onSignIn('u1');
    fake.state.failUpsert = true;
    upsertSession(sess('s1'));
    vi.stubGlobal('confirm', vi.fn(() => true));
    expect(await signOutFlow()).toBe(true);
    expect(loadStore().sessions).toEqual([]);
    expect(loadStore().ownerId).toBeNull();
    expect(pendingCount()).toBe(0);
    expect(fake.client.auth.signOut).toHaveBeenCalled();
  });
  it('전부 올렸으면 묻지 않는다', async () => {
    await onSignIn('u1');
    upsertSession(sess('s1'));
    const ask = vi.fn(() => false);
    vi.stubGlobal('confirm', ask);
    expect(await signOutFlow()).toBe(true);
    expect(ask).not.toHaveBeenCalled();
  });
});

// updateStore는 outbox를 거치지 않는 직접 변경이라 동기화 대상이 아니다
it('onRecordChange 없이 updateStore만 바꾸면 outbox가 안 쌓인다', async () => {
  await onSignIn('u1');
  updateStore((s) => ({ ...s, sessions: [sess('direct')] }));
  expect(pendingCount()).toBe(0);
});
