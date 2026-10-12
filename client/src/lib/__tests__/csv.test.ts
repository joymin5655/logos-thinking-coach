import { describe, it, expect } from 'vitest';
import { toCSV, CSV_BOM } from '../csv';

type Row = { a: string | number | null; b?: string };

describe('toCSV', () => {
  it('BOM + 헤더 + CRLF', () => {
    const out = toCSV<Row>([{ a: 1, b: 'x' }], ['a', 'b']);
    expect(out.startsWith(CSV_BOM)).toBe(true);
    expect(out).toBe(`${CSV_BOM}a,b\r\n1,x\r\n`);
  });
  it('쉼표·따옴표·줄바꿈은 따옴표로 감싸고 따옴표는 두 번', () => {
    const out = toCSV<Row>([{ a: 'x,y', b: 'say "hi"\nok' }], ['a', 'b']);
    expect(out).toContain('"x,y","say ""hi""\nok"');
  });
  it('null·undefined는 빈 칸', () => {
    expect(toCSV<Row>([{ a: null }], ['a', 'b'])).toBe(`${CSV_BOM}a,b\r\n,\r\n`);
  });
  it('수식 주입 방어: = + - @ 탭 CR 시작 문자열에 \'', () => {
    for (const bad of ['=1+1', '+1', '-1', '@SUM(A1)', '\tx', '\rx']) {
      const body = toCSV<Row>([{ a: bad }], ['a']).slice(CSV_BOM.length).split('\r\n')[1] ?? '';
      expect(body.replace(/^"/, '').startsWith("'")).toBe(true);
    }
  });
  it('숫자(음수 포함)와 중간에 = 가 있는 문자열은 건드리지 않는다', () => {
    const out = toCSV<Row>([{ a: -3, b: 'a=b' }], ['a', 'b']);
    expect(out).toContain('\r\n-3,a=b\r\n');
  });
  it('한글 보존', () => {
    expect(toCSV<Row>([{ a: '가나' }], ['a'])).toContain('가나');
  });
});
