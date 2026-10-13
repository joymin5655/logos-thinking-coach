import { describe, expect, it } from 'vitest';
import { getTouch, parseTouch } from '../acquisition';

const u = (s: string) => new URL(s);

describe('parseTouch', () => {
  it('utm이 우선이고 referrer는 host만', () => {
    expect(parseTouch(u('https://logos.test/?utm_source=ig&utm_medium=bio&utm_campaign=oct'), 'https://l.instagram.com/path?x=1', 'logos.test')).toEqual({
      source: 'ig',
      medium: 'bio',
      campaign: 'oct',
      ref_host: 'l.instagram.com',
    });
  });
  it('utm 없이 referrer만 있으면 ref_host만', () => {
    expect(parseTouch(u('https://logos.test/'), 'https://news.ycombinator.com/item?id=1', 'logos.test')).toEqual({ ref_host: 'news.ycombinator.com' });
  });
  it('selfHost와 같은 referrer는 무시', () => {
    expect(parseTouch(u('https://logos.test/'), 'https://LOGOS.test/about', 'logos.test')).toEqual({});
  });
  it('referrer가 비었거나 잘못된 URL이면 무시', () => {
    expect(parseTouch(u('https://logos.test/'), '', 'logos.test')).toEqual({});
    expect(parseTouch(u('https://logos.test/'), 'not a url', 'logos.test')).toEqual({});
  });
  it('각 값은 64자로 자르고 제어문자와 빈 값은 뺀다', () => {
    const t = parseTouch(u(`https://logos.test/?utm_source=${'a'.repeat(100)}&utm_medium=%0A&utm_campaign=x%00y`), '', 'logos.test');
    expect(t.source).toHaveLength(64);
    expect(t.medium).toBeUndefined();
    expect(t.campaign).toBe('xy');
  });
});

describe('getTouch', () => {
  it('저장소가 없으면 빈 객체', () => {
    expect(getTouch()).toEqual({});
  });
});
