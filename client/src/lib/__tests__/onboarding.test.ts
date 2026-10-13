process.env.TZ = 'Asia/Seoul';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { emptyStore, type DiagnosticRecord, type SessionRecord } from '../store';
import { DONE_KEY, PROGRESS_KEY, SKIPPED_KEY, clearOnboardingLocal, isCompletedLocally, isDismissed, nextStep, onboardingState, recordCount, shouldRedirectToWelcome, type OnboardingState } from '../onboarding';

const base: OnboardingState = {
  hasDiagnostic: false,
  fieldsChosen: false,
  fieldsSkipped: false,
  hasArgue: false,
  reminderDone: false,
  reminderSkipped: false,
  onboardedAt: null,
};
const s = (o: Partial<OnboardingState>): OnboardingState => ({ ...base, ...o });

describe('nextStep', () => {
  it('starts with the diagnostic', () => expect(nextStep(base)).toBe('diagnostic'));
  it('moves to interests after a diagnostic', () => expect(nextStep(s({ hasDiagnostic: true }))).toBe('interests'));
  it('chosen or skipped fields both move on to the argue step', () => {
    expect(nextStep(s({ hasDiagnostic: true, fieldsChosen: true }))).toBe('argue');
    expect(nextStep(s({ hasDiagnostic: true, fieldsSkipped: true }))).toBe('argue');
  });
  it('a started argue moves to the reminder', () => {
    expect(nextStep(s({ hasDiagnostic: true, fieldsChosen: true, hasArgue: true }))).toBe('reminder');
  });
  it('reminder done or skipped finishes', () => {
    const all = { hasDiagnostic: true, fieldsSkipped: true, hasArgue: true };
    expect(nextStep(s({ ...all, reminderDone: true }))).toBe('done');
    expect(nextStep(s({ ...all, reminderSkipped: true }))).toBe('done');
  });
  it('onboardedAt wins over everything', () => expect(nextStep(s({ onboardedAt: '2026-10-13T00:00:00Z' }))).toBe('done'));
  it('does not skip a step: argue before the diagnostic still asks for the diagnostic', () => {
    expect(nextStep(s({ hasArgue: true, fieldsChosen: true }))).toBe('diagnostic');
  });
  it('a done reminder does not skip interests', () => {
    expect(nextStep(s({ hasDiagnostic: true, hasArgue: true, reminderDone: true }))).toBe('interests');
  });
});

const diag: DiagnosticRecord = { id: 'd', at: '2026-10-13T00:00:00Z', prompt: 'p', text: 't', score: { consistency: 15, evidence: 20, defense: 15, total: 50, rationale: '' } };
const sess = (o: Partial<SessionRecord>): SessionRecord => ({
  id: 'a', kind: 'argue', topic: 't', startedAt: '2026-10-13T00:00:00Z', stageReached: 'anchor' as SessionRecord['stageReached'], turns: [], promptVersion: 'v', ...o,
});

describe('onboardingState', () => {
  it('reads the store, prefs and meta', () => {
    const store = { ...emptyStore(), diagnostics: [diag], sessions: [sess({})] };
    expect(onboardingState(store, { fields: ['경제'], reminderSkipped: true }, { onboardedAt: null })).toEqual({
      hasDiagnostic: true, fieldsChosen: true, fieldsSkipped: false, hasArgue: true, reminderDone: false, reminderSkipped: true, onboardedAt: null,
    });
  });
  it('a coaching session is not a first argue', () => {
    const store = { ...emptyStore(), sessions: [sess({ kind: 'session' })] };
    expect(onboardingState(store, { fields: [] }).hasArgue).toBe(false);
  });
  it('empty everything', () => expect(onboardingState(emptyStore(), { fields: [] })).toEqual(base));
});

describe('recordCount', () => {
  it('is 0 for a fresh store and ignores unfinished sessions', () => {
    expect(recordCount(emptyStore())).toBe(0);
    expect(recordCount({ ...emptyStore(), sessions: [sess({})] })).toBe(0);
  });
  it('counts diagnostics and completed sessions', () => {
    expect(recordCount({ ...emptyStore(), diagnostics: [diag] })).toBe(1);
    expect(recordCount({ ...emptyStore(), sessions: [sess({ completedAt: '2026-10-13T01:00:00Z' })] })).toBe(1);
  });
});

describe('shouldRedirectToWelcome', () => {
  it('redirects a new user', () => expect(shouldRedirectToWelcome({ onboardedAt: null, records: 0, dismissed: false })).toBe(true));
  it('leaves existing users alone', () => expect(shouldRedirectToWelcome({ onboardedAt: null, records: 1, dismissed: false })).toBe(false));
  it('respects the skip flag', () => expect(shouldRedirectToWelcome({ onboardedAt: null, records: 0, dismissed: true })).toBe(false));
  it('does not redirect after onboarding', () => expect(shouldRedirectToWelcome({ onboardedAt: '2026-10-13T00:00:00Z', records: 0, dismissed: false })).toBe(false));
  it('treats an unknown onboardedAt as not onboarded', () => expect(shouldRedirectToWelcome({ records: 0, dismissed: false })).toBe(true));
});

describe('clearOnboardingLocal', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('건너뜀·완료·진행 플래그만 지운다', () => {
    const mem = new Map<string, string>([[SKIPPED_KEY, 'x'], [DONE_KEY, 'x'], [PROGRESS_KEY, '{}'], ['logos.fields', '["a"]']]);
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    });
    expect(isDismissed() && isCompletedLocally()).toBe(true);
    clearOnboardingLocal();
    expect(isDismissed() || isCompletedLocally() || mem.has(PROGRESS_KEY)).toBe(false);
    expect(mem.has('logos.fields')).toBe(true);
  });

  it('저장소가 없거나 던져도 조용하다', () => {
    expect(() => clearOnboardingLocal()).not.toThrow();
    vi.stubGlobal('localStorage', { removeItem: () => { throw new Error('blocked'); } });
    expect(() => clearOnboardingLocal()).not.toThrow();
  });
});
