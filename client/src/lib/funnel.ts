/*
 * funnel.ts — 관리자 퍼널 화면의 순수 로직(RPC 응답 타입, 단계 전환율, 표기, 기간 검증).
 * 서버 계약: supabase/migrations/20261020000300_admin_kpi.sql
 */
export const FUNNEL_STEPS = ['landing_view', 'diagnostic_start', 'diagnostic_done', 'signup', 'session_start', 'session_complete'] as const;
export type FunnelStepName = (typeof FUNNEL_STEPS)[number];

export const PERIODS = [7, 30, 90] as const;
export type Period = (typeof PERIODS)[number];
export const DEFAULT_PERIOD: Period = 30;

export const SCORE_BUCKETS = ['0-19', '20-39', '40-59', '60-79', '80-100'] as const;

export type FunnelStep = { name: string; persons: number; rate_from_landing: number | null };
export type Retention = { eligible: number; returned: number; rate: number | null };
export type NorthStar = { started: number; summarized: number; rate: number | null };
export type FunnelData = {
  days: number;
  steps: FunnelStep[];
  d1: Retention;
  d7: Retention;
  guest_scores: { n: number } & Partial<Record<(typeof SCORE_BUCKETS)[number], number>>;
  north_star: { session: NorthStar; argue: NorthStar };
  d7_session: Retention;
};
export type AbandonData = {
  incomplete: number;
  by_stage: Record<string, number>;
  summary_no_complete: number;
  open_no_record: number;
  opens: number;
};
export type AcquisitionData = {
  days: number;
  signups: number;
  by_source: { source: string; signups: number; onboarded: number; completed_any: number }[];
  by_ref_host: { ref_host: string; signups: number }[];
};
export type ArmStats = {
  n: number;
  consented: number;
  started: number;
  completed: number;
  completion_rate: number | null;
  avg_delta: number | null;
  n_delta: number;
  survey_diff: number | null;
  survey_self: number | null;
  n_survey: number;
  rediagnostic: { n: number; avg_change: number | null };
  d7: Retention;
  contaminated: number;
};
export type ArmsData = Partial<Record<'A' | 'B', ArmStats>>;

export type StepConversion = {
  name: string;
  persons: number;
  /** 직전 단계 대비 비율. 첫 단계이거나 직전이 0명이면 null. 단계별 고유 인원이라 100%를 넘을 수 있다. */
  fromPrev: number | null;
  /** 직전 단계에서 줄어든 인원(늘었으면 0). 첫 단계는 null. */
  dropped: number | null;
  /** 랜딩 대비 비율(서버 값). */
  fromLanding: number | null;
};

const round4 = (n: number) => Math.round(n * 10000) / 10000;

export function stepConversions(steps: readonly FunnelStep[]): StepConversion[] {
  return steps.map((s, i) => {
    const prev = i > 0 ? steps[i - 1].persons : null;
    return {
      name: s.name,
      persons: s.persons,
      fromPrev: prev != null && prev > 0 ? round4(s.persons / prev) : null,
      dropped: prev != null ? Math.max(prev - s.persons, 0) : null,
      fromLanding: s.rate_from_landing,
    };
  });
}

/** 0~1 비율 → "12.3%". null·NaN은 '—'. */
export function formatRate(r: number | null | undefined, digits = 1): string {
  return r == null || !Number.isFinite(r) ? '—' : `${(r * 100).toFixed(digits)}%`;
}

/** 막대 너비(%) — 최대값 대비, 0~100으로 자른다. */
export function barPercent(value: number, max: number): number {
  return max > 0 && Number.isFinite(value) ? Math.min(Math.max((value / max) * 100, 0), 100) : 0;
}

/** 기간 선택 값 검증. 허용 목록(7/30/90)에 없으면 기본 30. 문자열도 받는다. */
export function parsePeriod(v: unknown): Period {
  const n = typeof v === 'string' ? Number(v) : v;
  return (PERIODS as readonly unknown[]).includes(n) ? (n as Period) : DEFAULT_PERIOD;
}

/** by_stage의 "kind:stage" 키를 풀어 많은 순(동률은 키 순)으로 정렬. ':'가 없으면 kind만 채운다. */
export function stageEntries(byStage: Record<string, number>): { kind: string; stage: string; count: number }[] {
  return Object.entries(byStage)
    .map(([key, count]) => {
      const i = key.indexOf(':');
      return { key, kind: i < 0 ? key : key.slice(0, i), stage: i < 0 ? '' : key.slice(i + 1), count };
    })
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
    .map(({ kind, stage, count }) => ({ kind, stage, count }));
}

/** 비회원 점수 분포를 구간 순서대로. 없는 구간은 0. */
export function scoreBuckets(g: FunnelData['guest_scores']): { bucket: string; count: number }[] {
  return SCORE_BUCKETS.map((bucket) => ({ bucket, count: g[bucket] ?? 0 }));
}
