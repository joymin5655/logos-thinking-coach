/*
 * usePageMeta — 라우트별 <title>·description·OG·canonical·robots를 갱신한다.
 * 사용: usePageMeta('about') → i18n `meta.aboutTitle`/`meta.aboutDesc`.
 * 키 없이 부르면 사이트 기본 제목·설명. 비공개 화면은 usePageMeta('dashboard', { noindex: true }).
 */
import { useEffect } from 'react';
import { translate, useLocale, type Locale } from '../i18n';
import type { Dict } from '../i18n/ko';

export const SITE_ORIGIN = 'https://lo9os.org';
const BRAND = 'LOGOS';

type MetaKey = keyof Dict['meta'];
/** 'home' | 'about' | … — meta 사전의 `<name>Title` 키에서 뽑은 이름. */
export type PageMetaName = Extract<MetaKey, `${string}Title`> extends `${infer N}Title` ? Exclude<N, 'site'> : never;

export interface PageMetaOpts {
  /** 설명용 키 이름(기본: 제목 키와 같음). */
  descKey?: PageMetaName;
  noindex?: boolean;
  /** canonical·og:url에 쓸 경로(기본: 현재 location.pathname). */
  path?: string;
}

export interface ResolvedMeta {
  title: string;
  description: string;
  url: string;
  noindex: boolean;
}

export function canonicalUrl(path: string): string {
  const clean = path.split(/[?#]/)[0] || '/';
  const p = clean.startsWith('/') ? clean : `/${clean}`;
  return SITE_ORIGIN + (p.length > 1 ? p.replace(/\/+$/, '') : p);
}

/** DOM 없이 값만 계산한다(테스트 대상). */
export function resolvePageMeta(locale: Locale, name: PageMetaName | undefined, opts: PageMetaOpts = {}, pathname = '/'): ResolvedMeta {
  const url = canonicalUrl(opts.path ?? pathname);
  if (!name) {
    return { title: translate('meta', 'siteTitle', undefined, locale), description: translate('meta', 'siteDesc', undefined, locale), url, noindex: !!opts.noindex };
  }
  const page = translate('meta', `${name}Title` as MetaKey, undefined, locale);
  return {
    title: `${page} — ${BRAND}`,
    description: translate('meta', `${opts.descKey ?? name}Desc` as MetaKey, undefined, locale),
    url,
    noindex: !!opts.noindex,
  };
}

function upsert(selector: string, create: () => HTMLElement): HTMLElement {
  let el = document.head.querySelector<HTMLElement>(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  return el;
}

const metaTag = (attr: 'name' | 'property', key: string) => () => {
  const m = document.createElement('meta');
  m.setAttribute(attr, key);
  return m;
};

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  upsert(`meta[${attr}="${key}"]`, metaTag(attr, key)).setAttribute('content', content);
}

export function usePageMeta(name?: PageMetaName, opts: PageMetaOpts = {}) {
  const { locale } = useLocale();
  const { descKey, noindex, path } = opts;

  useEffect(() => {
    const r = resolvePageMeta(locale, name, { descKey, noindex, path }, window.location.pathname);
    document.title = r.title;
    setMeta('name', 'description', r.description);
    setMeta('property', 'og:title', r.title);
    setMeta('property', 'og:description', r.description);
    setMeta('property', 'og:url', r.url);
    setMeta('name', 'twitter:title', r.title);
    setMeta('name', 'twitter:description', r.description);
    upsert('link[rel="canonical"]', () => {
      const l = document.createElement('link');
      l.rel = 'canonical';
      return l;
    }).setAttribute('href', r.url);

    if (!r.noindex) return;
    const robots = upsert('meta[name="robots"]', metaTag('name', 'robots'));
    robots.setAttribute('content', 'noindex, nofollow');
    return () => robots.remove();
  }, [locale, name, descKey, noindex, path]);
}
