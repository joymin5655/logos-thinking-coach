// 베타 이용 한도 — 서버(consume_quota 인자)와 요금제 문구가 함께 쓰는 단일 출처.
// 하루 = 한국 시간 자정 기준. 수치를 바꾸면 요금제 페이지 문구도 자동으로 따라간다.

export type QuotaKind = "session" | "argue" | "arena" | "diagnostic";

export interface KindQuota {
  /** 하루에 시작할 수 있는 세션(판) 수 */
  perDay: number;
  /** 세션 하나에서 허용하는 API 호출 수(턴·채점·리포트·재시도 포함) */
  callsPerSession: number;
}

export const QUOTAS: Record<QuotaKind, KindQuota> = {
  session: { perDay: 2, callsPerSession: 32 },
  argue: { perDay: 3, callsPerSession: 8 },
  arena: { perDay: 3, callsPerSession: 8 },
  diagnostic: { perDay: 2, callsPerSession: 2 },
};

/** 로그인 사용자 1인의 하루 전체 호출 상한(비용 방어선) */
export const DAILY_CALL_CEILING = 100;

/** 비로그인 진단 채점: IP(IPv6는 /64)당 하루 횟수, 인스턴스 메모리 기준 best-effort */
export const GUEST_DIAGNOSTICS_PER_DAY = 3;
