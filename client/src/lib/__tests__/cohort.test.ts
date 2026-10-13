import { describe, it, expect } from 'vitest';
import { mapJoinData, mapJoinError, parseCohortCode } from '../cohort';

describe('parseCohortCode', () => {
  it('대문자로 바꾸고 앞뒤 공백을 지운다', () => {
    expect(parseCohortCode('?c=pilot-a7k2')).toBe('PILOT-A7K2');
    expect(parseCohortCode('c=%20abcd1234%20')).toBe('ABCD1234');
  });
  it('코드가 없거나 형식이 틀리면 null', () => {
    expect(parseCohortCode('')).toBeNull();
    expect(parseCohortCode('?x=1')).toBeNull();
    expect(parseCohortCode('?c=')).toBeNull();
    expect(parseCohortCode('?c=abcdefg')).toBeNull(); // 8자 미만
    expect(parseCohortCode(`?c=${'A'.repeat(25)}`)).toBeNull(); // 24자 초과
    expect(parseCohortCode('?c=ab_cd')).toBeNull();
    expect(parseCohortCode('?c=한글코드')).toBeNull();
  });
  it('경계 길이는 통과', () => {
    expect(parseCohortCode('?c=abcdefgh')).toBe('ABCDEFGH');
    expect(parseCohortCode(`?c=${'a'.repeat(24)}`)).toBe('A'.repeat(24));
  });
});

describe('mapJoinError', () => {
  it('메시지로 구분한다', () => {
    expect(mapJoinError({ message: 'invalid_code', code: '22023' })).toBe('invalid_code');
    expect(mapJoinError({ message: 'consent_mismatch', code: '22023' })).toBe('consent_mismatch');
    expect(mapJoinError({ message: 'already_joined', code: '23505' })).toBe('already_joined');
    expect(mapJoinError({ message: 'full', code: 'P0001' })).toBe('full');
  });
  it('23505는 메시지가 달라도 already_joined', () => {
    expect(mapJoinError({ message: 'duplicate key', code: '23505' })).toBe('already_joined');
  });
  it('그 외·빈 값은 unknown', () => {
    expect(mapJoinError({ message: 'not authenticated', code: '28000' })).toBe('unknown');
    expect(mapJoinError({ message: 'fulfilled', code: 'P0001' })).toBe('unknown'); // 단어 경계
    expect(mapJoinError(null)).toBe('unknown');
    expect(mapJoinError(undefined)).toBe('unknown');
  });
});

describe('mapJoinData', () => {
  it('joined만 돌려준다', () => {
    expect(mapJoinData({ joined: true, cohort_code: 'X' })).toEqual({ ok: true, joined: true });
    expect(mapJoinData({ joined: false })).toEqual({ ok: true, joined: false });
  });
  it('arm이 섞여 와도 결과에 싣지 않는다(블라인드)', () => {
    expect(mapJoinData({ joined: true, arm: 'A' })).toEqual({ ok: true, joined: true });
  });
  it('모양이 다르면 unknown', () => {
    expect(mapJoinData(null)).toEqual({ error: 'unknown' });
    expect(mapJoinData('x')).toEqual({ error: 'unknown' });
    expect(mapJoinData({})).toEqual({ error: 'unknown' });
    expect(mapJoinData({ joined: 'yes' })).toEqual({ error: 'unknown' });
  });
});
