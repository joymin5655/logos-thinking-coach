import { describe, it, expect } from 'vitest';
import { barPercent, formatRate, parsePeriod, scoreBuckets, stageEntries, stepConversions } from '../funnel';

const step = (name: string, persons: number, rate: number | null = null) => ({ name, persons, rate_from_landing: rate });

describe('stepConversions', () => {
  it('직전 단계 대비 전환율과 이탈 수', () => {
    const out = stepConversions([step('landing_view', 100, 1), step('diagnostic_start', 40, 0.4), step('diagnostic_done', 30, 0.3)]);
    expect(out[0]).toMatchObject({ fromPrev: null, dropped: null, fromLanding: 1 });
    expect(out[1]).toMatchObject({ fromPrev: 0.4, dropped: 60 });
    expect(out[2]).toMatchObject({ fromPrev: 0.75, dropped: 10, fromLanding: 0.3 });
  });
  it('직전이 0명이면 전환율 null, 늘어난 단계는 이탈 0', () => {
    const out = stepConversions([step('a', 0), step('b', 5), step('c', 8)]);
    expect(out[1]).toMatchObject({ fromPrev: null, dropped: 0 });
    expect(out[2]).toMatchObject({ fromPrev: 1.6, dropped: 0 });
  });
  it('빈 배열', () => {
    expect(stepConversions([])).toEqual([]);
  });
});

describe('formatRate', () => {
  it('null·NaN은 —', () => {
    expect(formatRate(null)).toBe('—');
    expect(formatRate(undefined)).toBe('—');
    expect(formatRate(NaN)).toBe('—');
  });
  it('0~1 비율을 백분율로', () => {
    expect(formatRate(0.1234)).toBe('12.3%');
    expect(formatRate(0)).toBe('0.0%');
    expect(formatRate(1, 0)).toBe('100%');
  });
});

describe('parsePeriod', () => {
  it('허용값만 통과, 나머지는 30', () => {
    expect(parsePeriod(7)).toBe(7);
    expect(parsePeriod('90')).toBe(90);
    expect(parsePeriod(14)).toBe(30);
    expect(parsePeriod('abc')).toBe(30);
    expect(parsePeriod(undefined)).toBe(30);
    expect(parsePeriod(null)).toBe(30);
  });
});

describe('barPercent', () => {
  it('0~100으로 자른다', () => {
    expect(barPercent(50, 200)).toBe(25);
    expect(barPercent(300, 200)).toBe(100);
    expect(barPercent(5, 0)).toBe(0);
    expect(barPercent(-1, 10)).toBe(0);
  });
});

describe('stageEntries', () => {
  it('kind:stage를 풀고 많은 순으로', () => {
    expect(stageEntries({ 'session:round1': 2, 'argue:unknown': 5, 'session:round2': 2, raw: 1 })).toEqual([
      { kind: 'argue', stage: 'unknown', count: 5 },
      { kind: 'session', stage: 'round1', count: 2 },
      { kind: 'session', stage: 'round2', count: 2 },
      { kind: 'raw', stage: '', count: 1 },
    ]);
  });
  it('stage에 콜론이 더 있어도 첫 콜론에서만 자른다', () => {
    expect(stageEntries({ 'session:a:b': 1 })).toEqual([{ kind: 'session', stage: 'a:b', count: 1 }]);
  });
});

describe('scoreBuckets', () => {
  it('구간 순서 고정, 빠진 구간은 0', () => {
    expect(scoreBuckets({ n: 3, '0-19': 1, '60-79': 2 })).toEqual([
      { bucket: '0-19', count: 1 },
      { bucket: '20-39', count: 0 },
      { bucket: '40-59', count: 0 },
      { bucket: '60-79', count: 2 },
      { bucket: '80-100', count: 0 },
    ]);
  });
});
