process.env.TZ = 'Asia/Seoul'; // 로컬 날짜 계산 검증용 (UTC+9)
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  computeStreak,
  completionRate,
  sessionDelta,
  avgDelta,
  isoWeekKey,
  returnFlags,
  emptyStore,
  pickComparison,
  addDays,
  localDate,
  activeDays,
  daysUntilRediagnosis,
  nextDiagnosticDate,
  STORE_KEY,
  loadStore,
  upsertSession,
  upsertArena,
  addDiagnostic,
  onRecordChange,
  replaceAll,
  clearLocal,
  arenaRecord,
  type ArenaRecord,
  type SessionRecord,
  type Score,
} from '../store';

const score = (total: number): Score => ({ consistency: 0, evidence: 0, defense: 0, total, rationale: '' });
const sess = (over: Partial<SessionRecord>): SessionRecord => ({
  id: Math.random().toString(36),
  kind: 'session',
  topic: 't',
  startedAt: '2026-10-01T00:00:00.000Z',
  stageReached: '표면',
  turns: [],
  promptVersion: 'v',
  ...over,
});

describe('isoWeekKey', () => {
  it('월요일 시작, 연말 경계', () => {
    expect(isoWeekKey('2026-10-12')).toBe('2026-W42'); // 월
    expect(isoWeekKey('2026-10-18')).toBe('2026-W42'); // 일
    expect(isoWeekKey('2026-10-19')).toBe('2026-W43');
    expect(isoWeekKey('2026-01-01')).toBe('2026-W01');
    expect(isoWeekKey('2027-01-01')).toBe('2026-W53');
  });
});

describe('computeStreak', () => {
  it('연속 일수를 센다', () => {
    const r = computeStreak(['2026-10-10', '2026-10-11', '2026-10-12'], '2026-10-12');
    expect(r.count).toBe(3);
    expect(r.freezeDates).toEqual([]);
    expect(r.freezesLeftThisWeek).toBe(1);
  });
  it('오늘이 비어 있어도 어제까지 이어졌으면 유지', () => {
    expect(computeStreak(['2026-10-10', '2026-10-11'], '2026-10-12').count).toBe(2);
  });
  it('하루 빠진 날을 그 주 쉬어가기로 메운다', () => {
    // 10/12(월)~: 수(14) 빠짐, 화(13)·목(15) 기록
    const r = computeStreak(['2026-10-12', '2026-10-13', '2026-10-15', '2026-10-16'], '2026-10-16');
    expect(r.count).toBe(4);
    expect(r.freezeDates).toEqual(['2026-10-14']);
    expect(r.freezesLeftThisWeek).toBe(0);
  });
  it('같은 주에 두 번 빠지면 끊긴다', () => {
    // 월 기록, 화 빠짐, 수 기록, 목 빠짐, 금 기록
    const r = computeStreak(['2026-10-12', '2026-10-14', '2026-10-16'], '2026-10-16');
    expect(r.count).toBe(2); // 금, (목 쉬어가기), 수 → 화는 쉬어가기 소진으로 끊김
    expect(r.freezeDates).toEqual(['2026-10-15']);
  });
  it('이틀 연속 빠지면 끊긴다', () => {
    const r = computeStreak(['2026-10-10', '2026-10-13'], '2026-10-13');
    expect(r.count).toBe(1);
  });
  it('주가 다르면 쉬어가기가 각각 있다', () => {
    // 일(11) 빠짐(W41), 수(14) 빠짐(W42)
    const days = ['2026-10-10', '2026-10-12', '2026-10-13', '2026-10-15'];
    const r = computeStreak(days, '2026-10-15');
    expect(r.freezeDates.sort()).toEqual(['2026-10-11', '2026-10-14']);
    expect(r.count).toBe(4);
  });
  it('기록이 없으면 0', () => {
    expect(computeStreak([], '2026-10-12').count).toBe(0);
  });
});

describe('completionRate / delta', () => {
  it('완주율', () => {
    const r = completionRate([sess({ completedAt: 'x' }), sess({}), sess({ completedAt: 'y' }), sess({})]);
    expect(r).toEqual({ started: 4, completed: 2, rate: 0.5 });
    expect(completionRate([]).rate).toBeNull();
  });
  it('세션 내 상승폭 평균', () => {
    const a = sess({ scoreBefore: score(30), scoreAfter: score(60) });
    const b = sess({ scoreBefore: score(50), scoreAfter: score(60) });
    const c = sess({ scoreBefore: score(50) });
    expect(sessionDelta(a)).toBe(30);
    expect(sessionDelta(c)).toBeNull();
    expect(avgDelta([a, b, c])).toBe(20);
    expect(avgDelta([c])).toBeNull();
  });
});

describe('returnFlags', () => {
  it('D1/D7', () => {
    const s = { ...emptyStore(new Date('2026-10-01T09:00:00')), createdAt: '2026-10-01T09:00:00' };
    s.streak.days = ['2026-10-01', '2026-10-02'];
    expect(returnFlags(s, '2026-10-01')).toEqual({ d1: null, d7: null });
    expect(returnFlags(s, '2026-10-05')).toEqual({ d1: true, d7: null });
    expect(returnFlags(s, '2026-10-09')).toEqual({ d1: true, d7: false });
    s.streak.days.push('2026-10-08');
    expect(returnFlags(s, '2026-10-09').d7).toBe(true);
  });
});

describe('pickComparison', () => {
  const now = new Date('2026-10-12T12:00:00');
  it('21일 이상 지난 같은 주제를 우선', () => {
    const old = sess({ topic: '재택', startedAt: '2026-09-14T10:00:00', completedAt: 'x', finalSummary: 'a' });
    const other = sess({ topic: '다른', startedAt: '2026-09-01T10:00:00', completedAt: 'x', finalSummary: 'b' });
    const cur = sess({ topic: '재택', startedAt: '2026-10-12T10:00:00', completedAt: 'x', finalSummary: 'c' });
    const r = pickComparison([other, old, cur], now);
    expect(r?.older).toBe(old);
    expect(r?.sameTopic).toBe(true);
  });
  it('같은 주제가 없으면 가장 오래된 것', () => {
    const a = sess({ topic: 'a', startedAt: '2026-09-01T10:00:00', completedAt: 'x', finalSummary: 'a' });
    const b = sess({ topic: 'b', startedAt: '2026-10-12T10:00:00', completedAt: 'x', finalSummary: 'b' });
    const r = pickComparison([b, a], now);
    expect(r?.older).toBe(a);
    expect(r?.sameTopic).toBe(false);
  });
  it('기록이 2개 미만이면 null', () => {
    expect(pickComparison([sess({ completedAt: 'x', finalSummary: 'a' })], now)).toBeNull();
  });
});

describe('addDays', () => {
  it('월 경계', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('UTC 타임스탬프 → 로컬 날짜 (KST)', () => {
  it('localDate: Z 시각이 로컬 날짜로 넘어간다', () => {
    expect(localDate('2026-10-01T16:00:00.000Z')).toBe('2026-10-02'); // KST 01:00
    expect(localDate('2026-10-01T14:59:00.000Z')).toBe('2026-10-01'); // KST 23:59
  });
  it('activeDays·returnFlags·재진단 날짜가 로컬 기준', () => {
    const s = emptyStore();
    s.createdAt = '2026-10-01T16:00:00.000Z'; // 로컬 10-02
    s.sessions = [sess({ startedAt: '2026-10-02T16:30:00.000Z' })]; // 로컬 10-03
    s.diagnostics = [{ at: '2026-10-01T16:00:00.000Z', prompt: 'p', text: 't', score: score(50) }];
    expect(activeDays(s).has('2026-10-03')).toBe(true);
    expect(activeDays(s).has('2026-10-02')).toBe(true);
    expect(returnFlags(s, '2026-10-03').d1).toBe(true);
    expect(nextDiagnosticDate(s.diagnostics[0].at)).toBe('2026-10-30');
    expect(daysUntilRediagnosis(s, '2026-10-29')).toBe(1);
  });
});

describe('로컬 저장소 확장(arenas·ownerId·진단 id·onRecordChange)', () => {
  it('arenaRecord: 판정별 전적, 판정 없는 판은 제외', () => {
    const a = (verdict?: 'win' | 'draw' | 'lose'): ArenaRecord => ({
      id: Math.random().toString(36), topicId: 't', side: 'pro', startedAt: 'x', turns: [],
      result: verdict && { consistency: 0, evidence: 0, defense: 0, total: 0, verdict, rationale: '', lessons: [] },
    });
    expect(arenaRecord([a('win'), a('win'), a('draw'), a('lose'), a()])).toEqual({ w: 2, d: 1, l: 1 });
    expect(arenaRecord()).toEqual({ w: 0, d: 0, l: 0 });
  });
});

describe('저장소 정규화·변경 알림', () => {
  const mem = new Map<string, string>();
  beforeEach(() => {
    mem.clear();
    vi.stubGlobal('window', new EventTarget());
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('옛 저장 값(arenas·ownerId·진단 id 없음)을 읽으면 보정하고 id를 한 번만 부여한다', () => {
    const old = { ...emptyStore(), diagnostics: [{ at: '2026-10-01T00:00:00.000Z', prompt: 'p', text: 't', score: score(50) }] } as Record<string, unknown>;
    delete old.arenas;
    delete old.ownerId;
    mem.set(STORE_KEY, JSON.stringify(old));
    const s = loadStore();
    expect(s.arenas).toEqual([]);
    expect(s.ownerId).toBeNull();
    const id = s.diagnostics[0].id;
    expect(id).toBeTruthy();
    expect(JSON.parse(mem.get(STORE_KEY)!).diagnostics[0].id).toBe(id);
  });
  it('upsertSession·addDiagnostic·upsertArena가 구독자에게 알린다', () => {
    const seen: [string, string][] = [];
    const off = onRecordChange((k, id) => seen.push([k, id]));
    upsertSession(sess({ id: 's1', kind: 'argue' }));
    addDiagnostic({ at: '2026-10-01T00:00:00.000Z', prompt: 'p', text: 't', score: score(50) });
    upsertArena({ id: 'a1', topicId: 't', side: 'con', startedAt: '2026-10-01T00:00:00.000Z', turns: [] });
    off();
    upsertSession(sess({ id: 's2' }));
    expect(seen.map(([k]) => k)).toEqual(['argue', 'diagnostic', 'arena']);
    expect(seen[0][1]).toBe('s1');
    const d = loadStore().diagnostics[0];
    expect(d.id).toBe(seen[1][1]);
    expect(loadStore().arenas?.map((a) => a.id)).toEqual(['a1']);
  });
  it('replaceAll·clearLocal', () => {
    upsertSession(sess({ id: 's1' }));
    replaceAll({ ...loadStore(), ownerId: 'u1', sessions: [] });
    expect(loadStore().ownerId).toBe('u1');
    clearLocal();
    expect(loadStore().ownerId).toBeNull();
    expect(loadStore().sessions).toEqual([]);
  });
});
