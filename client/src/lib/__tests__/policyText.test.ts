import { describe, expect, it } from 'vitest';
import { splitPolicyText } from '../policyText';

describe('splitPolicyText', () => {
  it('returns plain text unchanged', () => {
    expect(splitPolicyText('안녕')).toEqual(['안녕']);
  });
  it('splits out urls at odd indexes', () => {
    expect(splitPolicyText('보세요 https://a.com/x 끝')).toEqual(['보세요 ', 'https://a.com/x', ' 끝']);
  });
  it('stops at closing paren and quotes and drops trailing punctuation', () => {
    expect(splitPolicyText('(https://a.com/p).')).toEqual(['(', 'https://a.com/p', ').']);
    expect(splitPolicyText('따라요(https://a.com/p).\n다음')).toEqual(['따라요(', 'https://a.com/p', ').\n다음']);
    expect(splitPolicyText('"https://a.com", https://b.com;')).toEqual(['"', 'https://a.com', '", ', 'https://b.com', ';']);
    expect(splitPolicyText('「https://a.com」')).toEqual(['「', 'https://a.com', '」']);
  });
});
