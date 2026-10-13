process.env.TZ = 'Asia/Seoul'; // 로컬 날짜·주 경계 검증용 (UTC+9)
import { describe, it, expect } from 'vitest';
import { bestStreak, weeklyRecap } from '../recap';
import { emptyStore, type LogosStore, type Score, type SessionRecord } from '../store';

const sc = (consistency: number, evidence: number, defense: number): Score => ({ consistency, evidence, defense, total: consistency + evidence + defense, rationale: '' });
const done = (startedAt: string, before: Score, after: Score): SessionRecord => ({
  id: startedAt,
  kind: 'argue',
  topic: 't',
  startedAt,
  completedAt: startedAt,
  stageReached: '통합',
  turns: [],
  promptVersion: 'v',
  scoreBefore: before,
  scoreAfter: after,
});
const open = (startedAt: string): SessionRecord => ({ id: startedAt, kind: 'session', topic: 't', startedAt, stageReached: '표면', turns: [], promptVersion: 'v' });
const withSessions = (sessions: SessionRecord[], days: string[] = []): LogosStore => ({ ...emptyStore(), sessions, streak: { days, freezesUsed: {} } });

const TODAY = new Date('2026-10-13T12:00:00+09:00'); // 화요일, 2026-W42 (월 10/12 시작)

describe('weeklyRecap', () => {
  it('기록이 없으면 빈 상태', () => {
    const r = weeklyRecap(emptyStore(TODAY), TODAY);
    expect(r.empty).toBe(true);
    expect(r.parts).toEqual([{ key: 'recapEmpty', vars: {} }]);
    expect(r.bestDimension).toBeNull();
    expect(r.range).toEqual({ from: '2026-10-12', to: '2026-10-13' });
  });

  it('주 경계: 일요일 밤은 지난주, 월요일 새벽은 이번 주 (KST)', () => {
    const r = weeklyRecap(
      withSessions([done('2026-10-11T23:30:00+09:00', sc(0, 0, 0), sc(15, 20, 15)), done('2026-10-12T00:10:00+09:00', sc(0, 0, 0), sc(15, 20, 15))]),
      TODAY,
    );
    expect(r.lastWeek.completed).toBe(1);
    expect(r.thisWeek.completed).toBe(1);
  });

  it('완주·평균 Δ를 주별로 세고, 시작만 한 기록은 완주에서 뺀다', () => {
    const r = weeklyRecap(
      withSessions([
        done('2026-10-12T10:00:00+09:00', sc(0, 0, 0), sc(15, 20, 15)), // +50
        open('2026-10-13T09:00:00+09:00'),
        done('2026-10-06T10:00:00+09:00', sc(15, 20, 15), sc(15, 20, 15)), // 0
      ]),
      TODAY,
    );
    expect(r.thisWeek).toMatchObject({ started: 2, completed: 1, avgDelta: 50 });
    expect(r.lastWeek).toMatchObject({ started: 1, completed: 1, avgDelta: 0 });
  });

  it('지난주보다 늘면 recapCompUp과 가장 많이 자란 항목', () => {
    const r = weeklyRecap(
      withSessions([
        done('2026-10-06T10:00:00+09:00', sc(15, 20, 15), sc(15, 20, 15)),
        done('2026-10-12T10:00:00+09:00', sc(15, 20, 15), sc(15, 40, 15)),
        done('2026-10-13T10:00:00+09:00', sc(15, 20, 15), sc(15, 40, 15)),
      ]),
      TODAY,
    );
    expect(r.parts[0]).toEqual({ key: 'recapCompUp', vars: { n: 1 } });
    expect(r.bestDimension).toEqual({ key: 'evidence', thisAvg: 40, lastAvg: 20, max: 40 });
    expect(r.parts[1]).toEqual({ key: 'recapDimGrew', vars: { lastAvg: 20, thisAvg: 40, max: 40 }, dim: 'evidence' });
  });

  it('지난주와 비교할 수 있는데 오른 항목이 없으면 성장 문구를 쓰지 않는다', () => {
    const r = weeklyRecap(
      withSessions([done('2026-10-06T10:00:00+09:00', sc(30, 40, 30), sc(30, 40, 30)), done('2026-10-12T10:00:00+09:00', sc(0, 0, 0), sc(15, 20, 15))]),
      TODAY,
    );
    expect(r.bestDimension).toBeNull();
    expect(r.parts.map((p) => p.key)).toEqual(['recapCompSame']);
  });

  it('지난주 데이터가 없으면 이번 주 최고 항목만 알린다', () => {
    const r = weeklyRecap(withSessions([done('2026-10-12T10:00:00+09:00', sc(15, 40, 15), sc(15, 40, 15))]), TODAY);
    expect(r.bestDimension).toEqual({ key: 'evidence', thisAvg: 40, lastAvg: null, max: 40 });
    expect(r.parts.map((p) => p.key)).toEqual(['recapCompThis', 'recapDimTop']);
  });

  it('시작만 하고 완주가 없으면 recapStartedOnly', () => {
    const r = weeklyRecap(withSessions([open('2026-10-12T10:00:00+09:00')]), TODAY);
    expect(r.parts).toEqual([{ key: 'recapStartedOnly', vars: { started: 1 } }]);
  });

  it('연속 일수: 이번 주 기준과 지난 일요일 기준, 최고 기록', () => {
    const days = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11', '2026-10-13'];
    const r = weeklyRecap(withSessions([], days), TODAY);
    expect(r.lastWeek.streak).toBe(7);
    expect(r.thisWeek.streak).toBe(8); // 10/12 하루는 쉬어가기로 메워진다
    expect(r.bestStreak).toBe(8);
  });
});

describe('bestStreak', () => {
  it('끊긴 구간 중 가장 긴 것', () => {
    expect(bestStreak(['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-20', '2026-09-21'])).toBe(3);
    expect(bestStreak([])).toBe(0);
  });
});
