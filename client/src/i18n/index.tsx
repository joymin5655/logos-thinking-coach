/*
 * i18n — 라이브러리 없는 최소 한/영 전환.
 * 사전은 네임스페이스별 파일(ko/<ns>.ts가 기준, en/<ns>.ts는 같은 키를 강제)이다.
 * React 밖(api.ts·ics.ts 등)에서도 translate()·getLocale()로 쓸 수 있게 모듈 상태로 둔다.
 */
import { useSyncExternalStore } from 'react';
import { ko, type Dict } from './ko';
import { en } from './en';

export type Locale = 'ko' | 'en';
export type Namespace = keyof Dict;
type Vars = Record<string, string | number>;

const STORAGE_KEY = 'logos.locale';
const DICTS: Record<Locale, { [N in Namespace]: Record<string, string> }> = { ko, en };

function initialLocale(): Locale {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'ko' || v === 'en') return v;
  } catch {
    /* 저장소 접근 불가 */
  }
  const nav = typeof navigator !== 'undefined' ? navigator.language : 'ko';
  return nav.toLowerCase().startsWith('ko') ? 'ko' : 'en';
}

let current: Locale = initialLocale();
const listeners = new Set<() => void>();
if (typeof document !== 'undefined') document.documentElement.lang = current;

export const getLocale = () => current;

export function setLocale(l: Locale) {
  if (l === current) return;
  current = l;
  try {
    localStorage.setItem(STORAGE_KEY, l);
  } catch {
    /* 무시 */
  }
  document.documentElement.lang = l;
  listeners.forEach((fn) => fn());
}

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export function interpolate(s: string, vars?: Vars) {
  return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s;
}

/** React 밖에서 쓰는 번역. 키가 없으면 한국어 원문, 그것도 없으면 키를 돌려준다. */
export function translate<N extends Namespace>(ns: N, key: keyof Dict[N] & string, vars?: Vars, locale: Locale = current) {
  const s = DICTS[locale][ns][key] ?? DICTS.ko[ns][key] ?? key;
  return interpolate(s, vars);
}

export function useLocale() {
  const locale = useSyncExternalStore(subscribe, getLocale, getLocale);
  return { locale, setLocale };
}

/** 네임스페이스 하나에 묶인 t(). 컴포넌트마다 `const t = useT('arena')`로 쓴다. */
export function useT<N extends Namespace>(ns: N) {
  const { locale } = useLocale();
  return (key: keyof Dict[N] & string, vars?: Vars) => translate(ns, key, vars, locale);
}

const tag = (l: Locale) => (l === 'ko' ? 'ko-KR' : 'en-US');

export function formatDate(d: Date | string, opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }, locale: Locale = current) {
  return new Intl.DateTimeFormat(tag(locale), opts).format(typeof d === 'string' ? new Date(d) : d);
}

export function formatNumber(n: number, locale: Locale = current) {
  return new Intl.NumberFormat(tag(locale)).format(n);
}
