import { describe, it, expect } from 'vitest';
import { buildDailyArgueIcs, foldLine } from '../ics';

const octets = (s: string) => new TextEncoder().encode(s).length;

describe('buildDailyArgueIcs', () => {
  const ics = buildDailyArgueIcs('A;B,C\\D', 'https://x.test/a', new Date('2026-10-12T03:04:05Z'));
  it('RFC 5545 이스케이프: 세미콜론·쉼표·역슬래시·개행', () => {
    expect(ics).toContain('DESCRIPTION:A\\;B\\,C\\\\D\\nhttps://x.test/a');
  });
  it('DTSTAMP는 UTC Z', () => {
    expect(ics).toContain('DTSTAMP:20261012T030405Z');
  });
  it('CRLF로 끝나고 모든 줄이 75옥텟 이하', () => {
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    const long = buildDailyArgueIcs('가'.repeat(100), 'https://x.test/a');
    for (const l of long.split('\r\n')) expect(octets(l)).toBeLessThanOrEqual(75);
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
