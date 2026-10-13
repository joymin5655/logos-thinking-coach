import { afterEach, describe, expect, it, vi } from 'vitest';
import { MAX_PROPS_BYTES } from '../../../../shared/events';
import { ANON_KEY, BACKOFF_MAX_MS, enqueueEvent, eventForPath, FLUSH_INTERVAL_MS, getAnonId, isPermanentFailure, keepaliveHeaders, kstDay, nextBackoff, parseQueue, QUEUE_KEY, resetAnonymous, sanitizeProps, shouldTrack, takeBatch, track, trackingEnabled, type QueuedEvent } from '../track';
import { TOUCH_KEY } from '../acquisition';

const ev = (i: number): QueuedEvent => ({ name: 'app_open', ts: i });

describe('sanitizeProps', () => {
  it('숫자·불리언·짧은 문자열만 남긴다', () => {
    expect(sanitizeProps({ n: 3, b: false, s: 'f2', long: 'x'.repeat(33), nul: null, obj: { a: 1 }, arr: [1], u: undefined, nan: NaN, inf: Infinity })).toEqual({ n: 3, b: false, s: 'f2' });
  });
  it('32자 문자열은 허용, 33자는 제거', () => {
    expect(sanitizeProps({ a: 'x'.repeat(32), b: 'x'.repeat(33) })).toEqual({ a: 'x'.repeat(32) });
  });
  it('남는 값이 없거나 입력이 없으면 undefined', () => {
    expect(sanitizeProps(undefined)).toBeUndefined();
    expect(sanitizeProps({ a: null })).toBeUndefined();
  });
  it('512바이트를 넘으면 뒤 키부터 뺀다', () => {
    const props: Record<string, string> = {};
    for (let i = 0; i < 30; i++) props[`key_${String(i).padStart(2, '0')}`] = 'v'.repeat(30);
    const out = sanitizeProps(props)!;
    expect(new TextEncoder().encode(JSON.stringify(out)).length).toBeLessThanOrEqual(MAX_PROPS_BYTES);
    expect(Object.keys(out)[0]).toBe('key_00');
    expect(Object.keys(out).length).toBeLessThan(30);
  });
});

describe('sanitizeProps — 서버 jsonb 텍스트 길이', () => {
  // 서버 검사: octet_length(props::text) <= 512. jsonb 텍스트는 키마다 ': ', 키 사이 ', ' 공백이 붙는다(키 n개면 2n-1바이트 더 길다).
  const jsonbLen = (o: object) => new TextEncoder().encode(JSON.stringify(o).replace(/":/g, '": ').replace(/,"/g, ', "')).length;

  it('jsonb 텍스트 기준으로도 512바이트 이하', () => {
    for (const [n, len] of [[30, 30], [60, 4], [12, 30], [7, 32]]) {
      const props: Record<string, string> = {};
      for (let i = 0; i < n; i++) props[`k${String(i).padStart(2, '0')}`] = 'v'.repeat(len);
      const out = sanitizeProps(props)!;
      expect(jsonbLen(out)).toBeLessThanOrEqual(MAX_PROPS_BYTES);
    }
  });
  it('compact JSON은 512 이하이지만 jsonb 텍스트는 넘는 경계에서 키를 더 뺀다', () => {
    // 키 'kNN'(3자)+값 'v'*26 → 항목당 compact 35바이트(따옴표·콜론·쉼표 포함). 14개면 compact 491, jsonb 텍스트는 +27 = 518 > 512
    const props: Record<string, string> = {};
    for (let i = 0; i < 14; i++) props[`k${String(i).padStart(2, '0')}`] = 'v'.repeat(26);
    const compact = new TextEncoder().encode(JSON.stringify(props)).length;
    expect(compact).toBeLessThanOrEqual(MAX_PROPS_BYTES);
    expect(jsonbLen(props)).toBeGreaterThan(MAX_PROPS_BYTES);
    const out = sanitizeProps(props)!;
    expect(Object.keys(out)).toHaveLength(13);
    expect(jsonbLen(out)).toBeLessThanOrEqual(MAX_PROPS_BYTES);
  });
});

describe('전송 실패 분류·백오프', () => {
  it('4xx는 영구 오류(함수 없음 404·잘못된 요청 400·인증 401/403), 408·429·5xx·네트워크는 일시적', () => {
    for (const st of [400, 401, 403, 404, 409, 422]) expect(isPermanentFailure(st)).toBe(true);
    for (const st of [408, 429, 500, 502, 503, 0, undefined, null, 200]) expect(isPermanentFailure(st)).toBe(false);
  });
  it('백오프는 5초에서 두 배씩 늘어 최대 5분', () => {
    const seq = [FLUSH_INTERVAL_MS];
    while (seq[seq.length - 1] < BACKOFF_MAX_MS) seq.push(nextBackoff(seq[seq.length - 1]));
    expect(seq).toEqual([5000, 10000, 20000, 40000, 80000, 160000, 300000]);
    expect(nextBackoff(BACKOFF_MAX_MS)).toBe(BACKOFF_MAX_MS);
  });
  it('keepalive 헤더: apikey는 항상, Authorization은 토큰이 있을 때만(publishable key를 Bearer로 보내지 않는다)', () => {
    expect(keepaliveHeaders('pk', null)).toEqual({ 'Content-Type': 'application/json', apikey: 'pk' });
    expect(keepaliveHeaders('pk', 'jwt')).toEqual({ 'Content-Type': 'application/json', apikey: 'pk', Authorization: 'Bearer jwt' });
  });
});

describe('shouldTrack', () => {
  it('GPC true 또는 DNT "1"이면 false', () => {
    expect(shouldTrack(true, null)).toBe(false);
    expect(shouldTrack(undefined, '1')).toBe(false);
    expect(shouldTrack(false, '0')).toBe(true);
    expect(shouldTrack(undefined, undefined)).toBe(true);
    expect(shouldTrack(null, null)).toBe(true);
  });
});

describe('큐', () => {
  it('최대치를 넘으면 오래된 것부터 버린다', () => {
    let q: QueuedEvent[] = [];
    for (let i = 0; i < 55; i++) q = enqueueEvent(q, ev(i));
    expect(q).toHaveLength(50);
    expect(q[0].ts).toBe(5);
    expect(q[49].ts).toBe(54);
  });
  it('takeBatch는 앞에서 25건씩 뗀다', () => {
    const q = Array.from({ length: 30 }, (_, i) => ev(i));
    const { batch, rest } = takeBatch(q);
    expect(batch).toHaveLength(25);
    expect(rest).toHaveLength(5);
    expect(rest[0].ts).toBe(25);
  });
  it('parseQueue는 손상된 값과 형식이 틀린 항목을 걸러 낸다', () => {
    expect(parseQueue(null)).toEqual([]);
    expect(parseQueue('{bad')).toEqual([]);
    expect(parseQueue('{"a":1}')).toEqual([]);
    expect(parseQueue(JSON.stringify([ev(1), { name: 5 }, null, ev(2)]))).toEqual([ev(1), ev(2)]);
  });
});

describe('라우트 이벤트', () => {
  it('경로별 이벤트', () => {
    expect(eventForPath('/')).toBe('landing_view');
    expect(eventForPath('/join')).toBe('join_view');
    expect(eventForPath('/dashboard')).toBe('app_open');
    expect(eventForPath('/dashboard/arena')).toBe('app_open');
    expect(eventForPath('/dashboardx')).toBeNull();
    expect(eventForPath('/about')).toBeNull();
  });
  it('kstDay는 UTC+9 날짜', () => {
    expect(kstDay(Date.parse('2026-10-13T14:59:59Z'))).toBe('2026-10-13');
    expect(kstDay(Date.parse('2026-10-13T15:00:00Z'))).toBe('2026-10-14');
  });
});

describe('환경이 없을 때', () => {
  it('window·Supabase가 없으면 track은 조용히 no-op', () => {
    expect(trackingEnabled()).toBe(false);
    expect(() => track('landing_view', { a: 1 })).not.toThrow();
  });
});

describe('resetAnonymous', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('익명 id를 새로 만들고 큐·first-touch를 지운다', () => {
    const mem = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    });
    resetAnonymous(); // 앞선 테스트의 메모리 상태를 비운다
    const before = getAnonId();
    expect(mem.get(ANON_KEY)).toBe(before);
    mem.set(QUEUE_KEY, JSON.stringify([{ name: 'app_open', ts: 1 }]));
    mem.set(TOUCH_KEY, '{"source":"kakao"}');
    resetAnonymous();
    expect(mem.has(QUEUE_KEY)).toBe(false);
    expect(mem.has(TOUCH_KEY)).toBe(false);
    expect(mem.has(ANON_KEY)).toBe(false);
    const after = getAnonId();
    expect(after).not.toBe(before);
    expect(mem.get(ANON_KEY)).toBe(after);
  });

  it('저장소가 없어도 던지지 않고 id는 바뀐다', () => {
    const before = getAnonId();
    expect(() => resetAnonymous()).not.toThrow();
    expect(getAnonId()).not.toBe(before);
  });
});
