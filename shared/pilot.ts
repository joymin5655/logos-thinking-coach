// 파일럿(코호트) 공용 상수 — 참가 화면, join_cohort RPC 검증과 같은 값을 쓴다.

/** 동의서 버전. 동의 문구를 바꾸면 올리고, cohorts.consent_version도 맞춘다. */
export const CONSENT_VERSION = "2026-10-pilot-v1";

/** 코호트 코드 형식(대문자 정규화 후). `20261020000200_pilot.sql`의 join_cohort와 같은 규칙. */
export const COHORT_CODE_RE = /^[A-Z0-9-]{8,24}$/;

/** A = 코칭 포함, B = 대조군 */
export type Arm = "A" | "B";
