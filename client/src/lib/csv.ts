/*
 * csv.ts — RFC 4180 CSV 직렬화. 엑셀 수식 주입 방어와 한글용 UTF-8 BOM을 포함한다.
 */
export const CSV_BOM = '﻿';

/** 문자열이 = + - @ 탭 CR로 시작하면 앞에 '를 붙여 수식으로 해석되지 않게 한다(숫자는 그대로). */
function cell(v: unknown): string {
  if (v === null || v === undefined) return '';
  let s = typeof v === 'string' ? v : String(v);
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** 첫 줄은 columns 헤더, 줄바꿈은 CRLF, 앞에 BOM. */
export function toCSV<R extends object>(rows: readonly R[], columns: readonly (keyof R & string)[]): string {
  const lines = [columns.map(cell).join(',')];
  for (const r of rows) lines.push(columns.map((c) => cell(r[c])).join(','));
  return CSV_BOM + lines.join('\r\n') + '\r\n';
}
