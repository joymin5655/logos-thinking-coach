process.env.TZ = 'Asia/Seoul'; // 로컬 날짜 계산 검증용 (UTC+9)
import { describe, it, expect } from 'vitest';
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
