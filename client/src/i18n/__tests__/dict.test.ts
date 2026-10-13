import { describe, expect, it } from 'vitest';
import { ko } from '../ko';
import { en } from '../en';
import { interpolate } from '../index';

describe('i18n dictionaries', () => {
  it('en has exactly the ko keys in every namespace', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(ko).sort());
    for (const ns of Object.keys(ko) as (keyof typeof ko)[]) {
      expect(Object.keys(en[ns]).sort(), ns).toEqual(Object.keys(ko[ns]).sort());
    }
  });
  it('keeps the same {placeholders} in both languages', () => {
    const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
    for (const ns of Object.keys(ko) as (keyof typeof ko)[]) {
      const k = ko[ns] as Record<string, string>;
      const e = en[ns] as Record<string, string>;
      for (const key of Object.keys(k)) expect(ph(e[key]), `${ns}.${key}`).toEqual(ph(k[key]));
    }
  });
  it('uses the 18+ age rule everywhere and no stale draft badge', () => {
    for (const d of [ko, en] as const) {
      for (const ns of ['privacy', 'terms', 'pilot', 'auth'] as const) {
        const text = Object.values(d[ns]).join('\n');
        expect(text, ns).not.toMatch(/14세|under 14|14 or older/);
      }
      expect(Object.values(d.terms).join('\n')).toMatch(/18/);
      expect(Object.values(d.privacy).join('\n')).toMatch(/18/);
      expect(Object.keys(d.privacy)).not.toContain('draft');
    }
  });
  it('interpolates variables', () => {
    expect(interpolate('{n}회 남음', { n: 2 })).toBe('2회 남음');
  });
});
