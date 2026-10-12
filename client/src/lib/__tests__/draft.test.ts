import { describe, it, expect, beforeEach } from 'vitest';
import { draftKey, saveDraft, loadDraft, clearDraft, trackDraft, untrackDraft, flushDrafts, clearAllDrafts } from '../draft';

const mem = () => {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    m,
  };
};

describe('draft', () => {
  let s: ReturnType<typeof mem>;
  beforeEach(() => {
    s = mem();
  });

  it('keys by route and slot', () => {
    expect(draftKey('/dashboard/argue')).not.toBe(draftKey('/dashboard/argue', 'summary'));
    expect(draftKey('/a')).not.toBe(draftKey('/b'));
  });

  it('saves, loads and clears', () => {
    const k = draftKey('/dashboard/arena');
    saveDraft(k, '쓰던 글', s);
    expect(loadDraft(k, s)).toBe('쓰던 글');
    clearDraft(k, s);
    expect(loadDraft(k, s)).toBe('');
  });

  it('removes the entry when the text is blank', () => {
    const k = draftKey('/x');
    saveDraft(k, 'a', s);
    saveDraft(k, '   ', s);
    expect(s.m.size).toBe(0);
  });

  it('is a no-op without storage and survives throwing storage', () => {
    expect(() => saveDraft('k', 'a', null)).not.toThrow();
    expect(loadDraft('k', null)).toBe('');
    const bad = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); }, removeItem: () => { throw new Error('x'); } };
    expect(() => saveDraft('k', 'a', bad)).not.toThrow();
    expect(loadDraft('k', bad)).toBe('');
    expect(() => clearDraft('k', bad)).not.toThrow();
  });

  it('flushDrafts writes only tracked, non-blank drafts', () => {
    trackDraft('k1', 'hello');
    trackDraft('k2', 'bye');
    untrackDraft('k2');
    trackDraft('k3', '  ');
    flushDrafts(s);
    expect(s.m.get('k1')).toBe('hello');
    expect(s.m.has('k2')).toBe(false);
    expect(s.m.has('k3')).toBe(false);
    untrackDraft('k1');
  });

  it('clearAllDrafts removes only draft keys (sign-out / account switch)', () => {
    const m = new Map<string, string>();
    const st = {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => void m.set(k, v),
      removeItem: (k: string) => void m.delete(k),
      key: (i: number) => [...m.keys()][i] ?? null,
      get length() { return m.size; },
    } as unknown as Storage;
    saveDraft(draftKey('/dashboard/argue'), 'a', st);
    saveDraft(draftKey('/dashboard/session', 'msg'), 'b', st);
    st.setItem('other', 'keep');
    clearAllDrafts(st);
    expect(m.has('other')).toBe(true);
    expect(m.size).toBe(1);
  });
});
