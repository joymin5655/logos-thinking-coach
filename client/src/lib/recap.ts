/*
 * recap.ts — 주간 리캡(이번 주 vs 지난주). 순수 함수, today를 인자로 받는다.
 * 주는 ISO 8601(월요일 시작), 날짜는 store.ts와 같은 로컬 달력 날짜를 쓴다.
 * 코칭·논증 기록(sessions)만 센다 — 완주율·상승폭이 대시보드 KPI와 같은 기준이다.
 */
import { addDays, avgDelta, completionRate, computeStreak, isoWeekKey, localDate, toISODate, weekdayIndex, type LogosStore, type SessionRecord } from './store';

export type Dim = 'consistency' | 'evidence' | 'defense';
export const DIMS: { key: Dim; max: number }[] = [
  { key: 'consistency', max: 30 },
  { key: 'evidence', max: 40 },
  { key: 'defense', max: 30 },
];

export type WeekStats = { started: number; completed: number; avgDelta: number | null; streak: number };

export type RecapPart = {
  /** growth 사전의 키 */
  key: 'recapEmpty' | 'recapStartedOnly' | 'recapCompUp' | 'recapCompSame' | 'recapCompThis' | 'recapDimGrew' | 'recapDimTop';
  vars: Record<string, number>;
  /** recapDim* 문구에서 항목 이름 자리에 들어갈 항목 */
  dim?: Dim;
};

export type WeeklyRecap = {
  /** 이번 주 월요일 ~ 오늘 (YYYY-MM-DD) */
  range: { from: string; to: string };
  thisWeek: WeekStats;
  lastWeek: WeekStats;
  bestStreak: number;
  bestDimension: { key: Dim; thisAvg: number; lastAvg: number | null; max: number } | null;
  /** 카피 조립용 — 문장 조각을 순서대로 이어 붙인다 */
  parts: RecapPart[];
  /** 이번 주에 시작한 기록이 하나도 없다 */
  empty: boolean;
};

const inWeek = (s: SessionRecord, week: string) => isoWeekKey(localDate(s.startedAt)) === week;

function dimAvg(sessions: SessionRecord[], dim: Dim): number | null {
  const v = sessions.filter((s) => s.completedAt && s.scoreAfter).map((s) => s.scoreAfter![dim]);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

/** 기록한 날 중 가장 길게 이어진 연속 일수(쉬어가기 포함, store.computeStreak 기준). */
export function bestStreak(days: string[]): number {
  let best = 0;
  for (const d of days) best = Math.max(best, computeStreak(days, d).count);
  return best;
}

export function weeklyRecap(store: LogosStore, today: Date): WeeklyRecap {
  const todayStr = toISODate(today);
  const from = addDays(todayStr, -weekdayIndex(todayStr));
  const lastSunday = addDays(from, -1);
  const thisKey = isoWeekKey(todayStr);
  const lastKey = isoWeekKey(lastSunday);

  const thisSessions = store.sessions.filter((s) => inWeek(s, thisKey));
  const lastSessions = store.sessions.filter((s) => inWeek(s, lastKey));
  const tc = completionRate(thisSessions);
  const lc = completionRate(lastSessions);

  const thisWeek: WeekStats = {
    started: tc.started,
    completed: tc.completed,
    avgDelta: avgDelta(thisSessions),
    streak: computeStreak(store.streak.days, todayStr).count,
  };
  const lastWeek: WeekStats = {
    started: lc.started,
    completed: lc.completed,
    avgDelta: avgDelta(lastSessions),
    streak: computeStreak(store.streak.days, lastSunday).count,
  };

  // 가장 많이 자란 항목: 지난주와 비교할 수 있으면 (이번-지난)/만점이 가장 큰 항목(0 이하는 제외),
  // 지난주 데이터가 아예 없으면 만점 대비 이번 주 평균이 가장 높은 항목.
  const rows = DIMS.map(({ key, max }) => ({ key, max, thisAvg: dimAvg(thisSessions, key), lastAvg: dimAvg(lastSessions, key) }))
    .filter((x): x is { key: Dim; max: number; thisAvg: number; lastAvg: number | null } => x.thisAvg !== null);
  const comparable = rows.filter((x) => x.lastAvg !== null);
  const pool = comparable.length ? comparable.filter((x) => x.thisAvg > x.lastAvg!) : rows;
  const gain = (x: (typeof rows)[number]) => (x.lastAvg === null ? x.thisAvg : x.thisAvg - x.lastAvg) / x.max;
  const best: WeeklyRecap['bestDimension'] = pool.length
    ? pool.reduce((a, b) => (gain(b) > gain(a) ? b : a))
    : null;

  const r = (n: number) => Math.round(n);
  const parts: RecapPart[] = [];
  if (thisWeek.started === 0) {
    parts.push({ key: 'recapEmpty', vars: {} });
  } else {
    if (thisWeek.completed === 0) {
      parts.push({ key: 'recapStartedOnly', vars: { started: thisWeek.started } });
    } else if (lastWeek.started > 0 && thisWeek.completed > lastWeek.completed) {
      parts.push({ key: 'recapCompUp', vars: { n: thisWeek.completed - lastWeek.completed } });
    } else if (lastWeek.started > 0 && thisWeek.completed === lastWeek.completed) {
      parts.push({ key: 'recapCompSame', vars: { n: thisWeek.completed } });
    } else {
      parts.push({ key: 'recapCompThis', vars: { n: thisWeek.completed } });
    }
    if (best) {
      parts.push(
        best.lastAvg === null
          ? { key: 'recapDimTop', vars: { thisAvg: r(best.thisAvg), max: best.max }, dim: best.key }
          : { key: 'recapDimGrew', vars: { lastAvg: r(best.lastAvg), thisAvg: r(best.thisAvg), max: best.max }, dim: best.key },
      );
    }
  }

  return {
    range: { from, to: todayStr },
    thisWeek,
    lastWeek,
    bestStreak: bestStreak(store.streak.days),
    bestDimension: best,
    parts,
    empty: thisWeek.started === 0,
  };
}
