/* ics.ts — 캘린더(.ics) 단일 이벤트 생성. 로컬 시각 기준 floating time. */
import { getLocale, translate, type Locale } from '../i18n';

const pad = (n: number) => String(n).padStart(2, '0');

function stamp(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}

/** DTSTAMP는 UTC(Z) 형식이어야 한다. */
function utcStamp(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

const encoder = new TextEncoder();

/** RFC 5545 줄 접기: 75 옥텟 이하, UTF-8 문자를 쪼개지 않고, 이어지는 줄은 공백 하나로 시작. */
export function foldLine(line: string): string {
  const out: string[] = [];
  let cur = '';
  let bytes = 0;
  let limit = 75;
  for (const ch of line) {
    const n = encoder.encode(ch).length;
    if (bytes + n > limit) {
      out.push(cur);
      cur = '';
      bytes = 0;
      limit = 74; // 선행 공백 1옥텟
    }
    cur += ch;
    bytes += n;
  }
  out.push(cur);
  return out.join('\r\n ');
}

/** 내일 08:00 (로컬) 시작, 10분짜리 이벤트. */
export function buildDailyArgueIcs(topic: string, url: string, now = new Date(), locale?: Locale): string {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 8, 0, 0);
  const end = new Date(start.getTime() + 10 * 60_000);
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//LOGOS//Daily Argue//${(locale ?? getLocale()).toUpperCase()}`,
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:logos-argue-${stamp(start)}@logos`,
    `DTSTAMP:${utcStamp(now)}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(translate('ics', 'summary', undefined, locale))}`,
    `DESCRIPTION:${esc(`${translate('ics', 'description', { topic }, locale)}\n${url}`)}`,
    `URL:${url}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].map(foldLine).join('\r\n') + '\r\n';
}

/** 실제 클릭 핸들러 안에서 호출해야 한다. */
export function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}
