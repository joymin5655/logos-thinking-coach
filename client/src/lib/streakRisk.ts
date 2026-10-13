/*
 * streakRisk.ts — "오늘 안 하면 연속 기록이 끊겨요" 배너 판정. 순수 함수 + 닫은 날 저장.
 * 오늘 완료 = 오늘이 streak.days에 있다(recordActivity는 코칭·논증·아레나 완주 때만 호출된다).
 * 쉬어가기는 하루 빠진 날을 자동으로 메우는 방식이라 수동으로 쓰는 기능은 없다 — 남은 횟수만 보여 준다.
 */
import { computeStreak, toISODate, type LogosStore } from './store';

export const STREAK_BANNER_KEY = 'logos.streakBanner.dismissed';
/** 이 시각(로컬) 이후에만 배너를 띄운다 */
export const RISK_FROM_HOUR = 19;

export type StreakRisk = {
  show: boolean;
  /** 로컬 자정까지 남은 시간 */
  hoursLeft: number;
  minutesLeft: number;
  /** 이번 주 남은 쉬어가기(0|1) */
  freezeLeft: number;
  /** 지금까지 이어 온 연속 일수 */
  streak: number;
};

export function streakRisk(store: LogosStore, now: Date, dismissedDay?: string | null): StreakRisk {
  const today = toISODate(now);
  const info = computeStreak(store.streak.days, today);
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
  const left = Math.max(0, Math.floor((midnight - now.getTime()) / 60_000));
  const doneToday = store.streak.days.includes(today);
  const show = now.getHours() >= RISK_FROM_HOUR && info.count >= 1 && !doneToday && dismissedDay !== today;
  return { show, hoursLeft: Math.floor(left / 60), minutesLeft: left % 60, freezeLeft: info.freezesLeftThisWeek, streak: info.count };
}

export function loadDismissedDay(): string | null {
  try {
    return localStorage.getItem(STREAK_BANNER_KEY);
  } catch {
    return null;
  }
}

export function saveDismissedDay(day: string): void {
  try {
    localStorage.setItem(STREAK_BANNER_KEY, day);
  } catch {
    /* 저장 불가 환경 */
  }
}
