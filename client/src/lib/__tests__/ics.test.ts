import { describe, it, expect } from 'vitest';
import { buildDailyArgueIcs, foldLine } from '../ics';

const octets = (s: string) => new TextEncoder().encode(s).length;

describe('buildDailyArgueIcs', () => {
  const ics = buildDailyArgueIcs('A;B,C\\D', 'https://x.test/a', new Date('2026-10-12T03:04:05Z'), 'ko');
  it('RFC 5545 이스케이프: 세미콜론·쉼표·역슬래시·개행', () => {
    expect(ics).toContain('DESCRIPTION:오늘의 주제: A\\;B\\,C\\\\D\\nhttps://x.test/a');
  });
  it('DTSTAMP는 UTC Z', () => {
    expect(ics).toContain('DTSTAMP:20261012T030405Z');
  });
  it('CRLF로 끝나고 모든 줄이 75옥텟 이하', () => {
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    const long = buildDailyArgueIcs('가'.repeat(100), 'https://x.test/a', new Date(), 'ko');
    for (const l of long.split('\r\n')) expect(octets(l)).toBeLessThanOrEqual(75);
  });
});

describe('buildDailyArgueIcs locale', () => {
  it('영어 로케일은 제목·설명·PRODID가 영어', () => {
    const en = buildDailyArgueIcs('Topic', 'https://x.test/a', new Date('2026-10-12T03:04:05Z'), 'en');
    expect(en).toContain('SUMMARY:LOGOS Daily Argument (10 min)');
    expect(en).toContain("DESCRIPTION:Today's topic: Topic\\nhttps://x.test/a");
    expect(en).toContain('PRODID:-//LOGOS//Daily Argue//EN');
  });
  it('한국어 로케일 제목', () => {
    const ko = buildDailyArgueIcs('주제', 'https://x.test/a', new Date('2026-10-12T03:04:05Z'), 'ko');
    expect(ko).toContain('SUMMARY:LOGOS 오늘의 논증 (10분)');
  });
});

describe('foldLine', () => {
  it('멀티바이트 문자를 쪼개지 않고 이어지는 줄은 공백으로 시작', () => {
    const folded = foldLine('SUMMARY:' + '가'.repeat(60));
    const lines = folded.split('\r\n');
    expect(lines.length).toBeGreaterThan(1);
    for (const l of lines) expect(octets(l)).toBeLessThanOrEqual(75);
    for (const l of lines.slice(1)) expect(l.startsWith(' ')).toBe(true);
    expect(lines.map((l, i) => (i ? l.slice(1) : l)).join('')).toBe('SUMMARY:' + '가'.repeat(60));
  });
});
