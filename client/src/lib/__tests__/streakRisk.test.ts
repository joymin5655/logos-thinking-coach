process.env.TZ = 'Asia/Seoul';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { STREAK_BANNER_KEY, loadDismissedDay, saveDismissedDay, streakRisk } from '../streakRisk';
import { emptyStore, type LogosStore } from '../store';

const withDays = (days: string[]): LogosStore => ({ ...emptyStore(), streak: { days, freezesUsed: {} } });
const at = (hhmm: string) => new Date(`2026-10-13T${hhmm}:00+09:00`);
const DAYS = ['2026-10-11', '2026-10-12']; // 어제까지 2일

describe('streakRisk', () => {
  it('19시 전에는 숨긴다, 19:00부터 보인다', () => {
    expect(streakRisk(withDays(DAYS), at('18:59')).show).toBe(false);
    expect(streakRisk(withDays(DAYS), at('19:00')).show).toBe(true);
  });

  it('자정까지 남은 시간과 연속 일수, 쉬어가기 잔여', () => {
    const r = streakRisk(withDays(DAYS), at('21:40'));
    expect(r).toEqual({ show: true, hoursLeft: 2, minutesLeft: 20, freezeLeft: 1, streak: 2 });
    expect(streakRisk(withDays(DAYS), at('23:30'))).toMatchObject({ hoursLeft: 0, minutesLeft: 30 });
  });

  it('연속이 없거나 오늘 이미 기록했으면 숨긴다', () => {
    expect(streakRisk(withDays([]), at('21:00')).show).toBe(false);
    expect(streakRisk(withDays(['2026-10-01']), at('21:00')).show).toBe(false); // 어제도 비어 끊김
    expect(streakRisk(withDays([...DAYS, '2026-10-13']), at('21:00')).show).toBe(false);
  });

  it('오늘 닫았으면 숨기고, 다른 날 닫은 것은 무시한다', () => {
    expect(streakRisk(withDays(DAYS), at('21:00'), '2026-10-13').show).toBe(false);
    expect(streakRisk(withDays(DAYS), at('21:00'), '2026-10-12').show).toBe(true);
    expect(streakRisk(withDays(DAYS), at('21:00'), null).show).toBe(true);
  });

  it('이번 주 쉬어가기 잔여: 안 썼으면 1, 이미 썼으면 0', () => {
    const now = new Date('2026-10-15T20:00:00+09:00'); // 목요일
    expect(streakRisk(withDays(['2026-10-12', '2026-10-13', '2026-10-14']), now).freezeLeft).toBe(1);
    const used = streakRisk(withDays(['2026-10-12', '2026-10-14']), now); // 10/13을 쉬어가기로 메움
    expect(used.freezeLeft).toBe(0);
    expect(used.streak).toBe(2);
  });
});

describe('닫은 날 저장', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('저장하고 다시 읽는다', () => {
    const mem = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) });
    expect(loadDismissedDay()).toBeNull();
    saveDismissedDay('2026-10-13');
    expect(mem.get(STREAK_BANNER_KEY)).toBe('2026-10-13');
    expect(loadDismissedDay()).toBe('2026-10-13');
  });

  it('저장소 접근 예외는 삼킨다', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });
    expect(loadDismissedDay()).toBeNull();
    expect(() => saveDismissedDay('2026-10-13')).not.toThrow();
  });
});
