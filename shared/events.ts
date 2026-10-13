// 제품 이벤트 — 클라이언트(track.ts)와 DB(`20261020000100_events.sql`의 CHECK 화이트리스트)가 함께 쓰는 단일 출처.
// 이름을 바꾸면 마이그레이션 CHECK도 같이 바꿔야 한다(shared/__tests__/events.test.ts가 일치를 검사한다).

export const EVENT_NAMES = [
  "landing_view",
  "join_view",
  "app_open",
  "diagnostic_start",
  "diagnostic_done",
  "session_open",
  "session_start",
  "session_summary",
  "session_complete",
  "argue_start",
  "argue_complete",
  "arena_start",
  "arena_complete",
  "onboarding_step",
  "recap_view",
  "milestone_seen",
  "streak_banner_view",
  "streak_banner_click",
  "reminder_ics",
  "signup",
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

/**
 * 이벤트 props: 숫자·불리언·짧은 열거형 문자열만. 자유 텍스트·IP·전체 URL은 넣지 않는다.
 * 문자열은 ≤32자 열거형이어야 한다(클라이언트에서 검증, DB는 전체 크기만 제한).
 */
export type EventProps = Record<string, number | boolean | string>;

/** track() 한 번에 보낼 수 있는 이벤트 수 */
export const MAX_BATCH = 25;
/** 이벤트 하나의 props 최대 크기(JSON 바이트) */
export const MAX_PROPS_BYTES = 512;
