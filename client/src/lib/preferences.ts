/*
 * preferences.ts — LOGOS 사용자 선호 분야 (localStorage)
 *
 * 스펙(business_context v5.0): "개인화: 분야 선택 = 온보딩 = 분야별 랭킹"
 *   - 사용자는 관심 분야를 최대 N개 고른다
 *   - Argue(Session 1) 일일 주제는 선택 분야 우선 노출
 *   - 분야별 랭크(레벨)가 별도 표시된다
 */

export type Field =
  | '기술·사회'
  | '사회'
  | '경제'
  | '철학'
  | '윤리'
  | '노동'
  | '커리어'
  | '라이프스타일'
  | '교육';

export const ALL_FIELDS: { value: Field; en: string; desc: string }[] = [
  { value: '기술·사회',     en: 'Tech & Society', desc: 'AI, 디지털, 플랫폼' },
  { value: '사회',         en: 'Society',         desc: '제도, 여론, 시민사회' },
  { value: '경제',         en: 'Economy',         desc: '시장, 정책, 자본' },
  { value: '철학',         en: 'Philosophy',      desc: '존재, 가치, 인식' },
  { value: '윤리',         en: 'Ethics',          desc: '도덕, 책임, 정의' },
  { value: '노동',         en: 'Labor',           desc: '일, 휴식, 자동화' },
  { value: '커리어',       en: 'Career',          desc: '직업, 성장, 전환' },
  { value: '라이프스타일',  en: 'Lifestyle',       desc: '습관, 관계, 일상' },
  { value: '교육',         en: 'Education',       desc: '학습, 사고력, 양성' },
];

export const MAX_FIELDS = 3;
const KEY = 'logos.fields';

export function loadFields(): Field[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((f) => ALL_FIELDS.some((opt) => opt.value === f)).slice(0, MAX_FIELDS) : [];
  } catch {
    return [];
  }
}

export function saveFields(fields: Field[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(fields.slice(0, MAX_FIELDS)));
    window.dispatchEvent(new CustomEvent('logos:fields-changed'));
  } catch {
    /* ignore */
  }
}

export function clearFields() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(KEY);
    window.dispatchEvent(new CustomEvent('logos:fields-changed'));
  } catch {
    /* ignore */
  }
}
