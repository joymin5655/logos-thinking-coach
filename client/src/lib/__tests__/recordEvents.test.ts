import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installRecordEvents, recordTransitions, type RecSnap, type RecView } from '../recordEvents';
import { emptyStore, loadStore, replaceAll, STORE_KEY, upsertSession, type SessionRecord } from '../store';
import { track } from '../track';

vi.mock('../track', () => ({ track: vi.fn() }));

const NOW = Date.parse('2026-10-13T03:00:00Z');
const fresh = new Date(NOW - 10_000).toISOString();
const old = new Date(NOW - 86_400_000).toISOString();

const snap = (o: Partial<RecSnap> = {}): RecSnap => ({ kind: 'session', startedAt: fresh, hasSummary: false, ...o });
const v = (id: string, s: RecSnap): RecView => ({ [id]: s });

describe('recordTransitions', () => {
  it('새 기록 → kind_start', () => {
    expect(recordTransitions({}, v('a', snap()), NOW)).toEqual(['session_start']);
    expect(recordTransitions({}, v('a', snap({ kind: 'argue' })), NOW)).toEqual(['argue_start']);
    expect(recordTransitions({}, v('a', snap({ kind: 'arena' })), NOW)).toEqual(['arena_start']);
  });
  it('completedAt이 새로 생기면 kind_complete', () => {
    expect(recordTransitions(v('a', snap()), v('a', snap({ completedAt: fresh })), NOW)).toEqual(['session_complete']);
    expect(recordTransitions(v('a', snap({ kind: 'arena' })), v('a', snap({ kind: 'arena', completedAt: fresh })), NOW)).toEqual(['arena_complete']);
  });
  it('session에 finalSummary가 새로 생기면 session_summary', () => {
    expect(recordTransitions(v('a', snap()), v('a', snap({ hasSummary: true })), NOW)).toEqual(['session_summary']);
  });
  it('argue의 요약은 session_summary가 아니다', () => {
    expect(recordTransitions(v('a', snap({ kind: 'argue' })), v('a', snap({ kind: 'argue', hasSummary: true })), NOW)).toEqual([]);
  });
  it('요약과 완료가 함께 오면 둘 다(summary → complete)', () => {
    expect(recordTransitions(v('a', snap()), v('a', snap({ hasSummary: true, completedAt: fresh })), NOW)).toEqual(['session_summary', 'session_complete']);
  });
  it('변화가 없으면 아무 이벤트도 없다(재저장·이미 완료된 기록)', () => {
    const s = snap({ hasSummary: true, completedAt: fresh });
    expect(recordTransitions(v('a', s), v('a', s), NOW)).toEqual([]);
  });
  it('스냅샷에 없는 오래된 기록(동기화로 들어온 것)은 이벤트를 내지 않는다', () => {
    expect(recordTransitions({}, v('a', snap({ startedAt: old, completedAt: old, hasSummary: true })), NOW)).toEqual([]);
  });
  it('한 번에 만들어진 완료 기록은 start → summary → complete', () => {
    expect(recordTransitions({}, v('a', snap({ hasSummary: true, completedAt: fresh })), NOW)).toEqual(['session_start', 'session_summary', 'session_complete']);
  });
});

describe('installRecordEvents — 동기화(replaceAll) 이후', () => {
  const mem = new Map<string, string>();
  const rec = (over: Partial<SessionRecord>): SessionRecord => ({
    id: 's1', kind: 'session', topic: 't', startedAt: old, stageReached: '표면', turns: [], promptVersion: 'v', ...over,
  });
  beforeEach(() => {
    mem.clear();
    vi.mocked(track).mockClear();
    vi.stubGlobal('window', new EventTarget());
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    });
    mem.set(STORE_KEY, JSON.stringify(emptyStore()));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('동기화로 받은 진행 중 기록을 여기서 완료하면 *_complete가 나가고, 옛 기록 자체는 이벤트를 내지 않는다', () => {
    installRecordEvents();
    // 다른 기기에서 시작한(오래된) 진행 중 기록이 동기화로 들어온다 — 이벤트 없음
    replaceAll({ ...loadStore(), sessions: [rec({})] });
    expect(track).not.toHaveBeenCalled();
    // 이 기기에서 이어서 끝낸다
    upsertSession(rec({ completedAt: fresh }));
    expect(vi.mocked(track).mock.calls.map((c) => c[0])).toEqual(['session_complete']);
  });
});
