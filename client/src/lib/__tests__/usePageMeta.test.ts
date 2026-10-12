import { describe, expect, it } from 'vitest';
import { canonicalUrl, resolvePageMeta } from '../usePageMeta';

describe('canonicalUrl', () => {
  it('prefixes the origin and drops query, hash and trailing slash', () => {
    expect(canonicalUrl('/')).toBe('https://lo9os.org/');
    expect(canonicalUrl('/about/?x=1#top')).toBe('https://lo9os.org/about');
    expect(canonicalUrl('pricing')).toBe('https://lo9os.org/pricing');
  });
});

describe('resolvePageMeta', () => {
  it('builds "<page> — LOGOS" titles per locale', () => {
    expect(resolvePageMeta('ko', 'about', {}, '/about').title).toBe('서비스 소개 — LOGOS');
    expect(resolvePageMeta('en', 'pricing', {}, '/pricing').title).toBe('Pricing — LOGOS');
  });
  it('falls back to the site title and description without a key', () => {
    const r = resolvePageMeta('en', undefined, {}, '/');
    expect(r.title).toBe('LOGOS — Socratic Thinking Coach');
    expect(r.description).toContain('Socratic');
  });
  it('honours descKey, path and noindex', () => {
    const r = resolvePageMeta('ko', 'dashboard', { descKey: 'settings', noindex: true, path: '/dashboard/' }, '/x');
    expect(r.description).toBe(resolvePageMeta('ko', 'settings').description);
    expect(r.url).toBe('https://lo9os.org/dashboard');
    expect(r.noindex).toBe(true);
  });
});
