import { describe, it, expect } from 'vitest';
import { pickResume, stageStep, stageOf, resumeHref } from '../resume';
import type { SessionRecord } from '../store';

const rec = (o: Partial<SessionRecord>): SessionRecord => ({
  id: 'a', kind: 'session', topic: 't', startedAt: '2026-10-01T00:00:00.000Z', stageReached: '표면',
  turns: [{ role: 'user', content: 'x', at: '' }], promptVersion: '', ...o,
});

describe('pickResume', () => {
  it('returns null with nothing to resume', () => {
    expect(pickResume({ sessions: [] })).toBeNull();
    expect(pickResume({ sessions: [rec({ completedAt: 'd' })] })).toBeNull();
    expect(pickResume({ sessions: [rec({ turns: [{ role: 'assistant', content: 'q', at: '' }] })] })).toBeNull();
    expect(pickResume({ sessions: [rec({ kind: 'argue' })] })).toBeNull();
  });
  it('picks the most recent unfinished coaching session', () => {
    const s = [rec({ id: '1' }), rec({ id: '2', completedAt: 'd' }), rec({ id: '3' }), rec({ id: '4', kind: 'argue' })];
    expect(pickResume({ sessions: s })?.id).toBe('3');
  });
});

describe('stage helpers', () => {
  it('reads the stage from the last assistant turn', () => {
    const r = rec({ turns: [{ role: 'assistant', content: 'q', at: '', stage: '도전' }, { role: 'user', content: 'a', at: '' }] });
    expect(stageOf(r)).toBe('도전');
    expect(stageStep(r)).toBe(2);
    expect(stageStep(rec({}))).toBe(1);
  });
  it('builds an encoded href', () => expect(resumeHref(rec({ id: 'a b' }))).toBe('/dashboard/session?resume=a%20b'));
});
