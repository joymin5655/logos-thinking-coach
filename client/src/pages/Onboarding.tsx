/*
 * Onboarding.tsx — /welcome 첫 실행 온보딩
 * 진단 → 관심 분야 → 첫 논증 → 알림 4단계. 단계는 저장된 기록에서 매번 다시 계산하므로
 * 진단·논증을 하러 나갔다가 /welcome으로 돌아오면 다음 단계에서 이어진다.
 */
import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useLocation } from 'wouter';
import { T, mono, serif, body, Label, btnPrimary, btnDisabled, FocusStyle } from '@/components/logos-ui';
import { useLocale, useT } from '@/i18n';
import { usePageMeta } from '@/lib/usePageMeta';
import { track } from '@/lib/track';
import { useStore } from '@/lib/store';
import { ALL_FIELDS, MAX_FIELDS, loadFields, saveFields, type Field } from '@/lib/preferences';
import { buildDailyArgueIcs, downloadFile } from '@/lib/ics';
import { todaysTopic } from '@/lib/topics';
import {
  STEPS, completeOnboarding, fetchOnboardedAt, isCompletedLocally, loadProgress, nextStep, onboardingState,
  saveProgress, skipOnboarding,
} from '@/lib/onboarding';

const STEP_LABEL = {
  diagnostic: 'stepDiagnostic',
  interests: 'stepInterests',
  argue: 'stepArgue',
  reminder: 'stepReminder',
} as const;

const primary: CSSProperties = {
  ...btnPrimary,
  width: '100%',
  minHeight: 48,
  fontFamily: body,
  fontSize: 15,
  fontWeight: 500,
  letterSpacing: 0,
  textTransform: 'none',
};

const textBtn: CSSProperties = {
  width: '100%',
  minHeight: 44,
  fontFamily: body,
  fontSize: 14,
  color: T.creamMid,
  background: 'transparent',
  border: 0,
  cursor: 'pointer',
};

const CSS = `
.ob-chip:focus-within{outline:2px solid ${T.amber};outline-offset:2px}
.ob-chip input{margin:0 8px 0 0;width:16px;height:16px;accent-color:currentColor}
`;

export default function Onboarding() {
  const t = useT('onboarding');
  const { locale } = useLocale();
  const [, navigate] = useLocation();
  const store = useStore();
  usePageMeta('onboarding', { noindex: true });

  const [progress, setProgress] = useState(loadProgress);
  const [saved, setSaved] = useState<Field[]>(loadFields);
  const [selected, setSelected] = useState<Field[]>(loadFields);
  const [serverDone, setServerDone] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchOnboardedAt().then((r) => {
      if (!cancelled && r.onboardedAt) setServerDone(r.onboardedAt);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const onboardedAt = serverDone ?? (isCompletedLocally() ? 'local' : null);
  const step = nextStep(onboardingState(store, { fields: saved, ...progress }, { onboardedAt }));

  useEffect(() => {
    if (step === 'done') {
      if (!onboardedAt) void completeOnboarding();
      navigate('/dashboard', { replace: true });
      return;
    }
    track('onboarding_step', { step });
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const lastDiag = store.diagnostics[store.diagnostics.length - 1];
  const current = STEPS.indexOf(step === 'done' ? 'reminder' : step);

  const skipAll = () => {
    skipOnboarding();
    // 전체 건너뛰기도 서버에 남겨 다른 기기에서 다시 띄우지 않는다
    void completeOnboarding();
    navigate('/dashboard');
  };

  const confirmFields = () => {
    if (!selected.length) return;
    saveFields(selected);
    setSaved(selected);
  };
  const skipFields = () => {
    saveProgress({ fieldsSkipped: true });
    setProgress(loadProgress());
  };
  const toggle = (f: Field) =>
    setSelected((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : prev.length < MAX_FIELDS ? [...prev, f] : prev));

  const finishReminder = (added: boolean) => {
    saveProgress(added ? { reminderDone: true } : { reminderSkipped: true });
    void completeOnboarding();
    navigate('/dashboard');
  };
  const addToCalendar = () => {
    const now = new Date();
    const tomorrow = todaysTopic(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
    downloadFile('logos-daily-argue.ics', buildDailyArgueIcs(tomorrow.title, `${window.location.origin}/dashboard/argue`), 'text/calendar;charset=utf-8');
    track('reminder_ics', { from: 'welcome' });
    finishReminder(true);
  };

  const fieldName = useMemo(() => (f: (typeof ALL_FIELDS)[number]) => (locale === 'en' ? f.en : f.value), [locale]);

  const h1: CSSProperties = { margin: 0, fontFamily: serif, fontWeight: 600, fontSize: 26, lineHeight: 1.3, color: T.cream };
  const lead: CSSProperties = { margin: 0, fontFamily: body, fontSize: 15, lineHeight: 1.6, color: T.creamMid };

  return (
    <div style={{ minHeight: 'calc(100dvh / var(--ui-scale))', backgroundColor: T.black, color: T.cream, fontFamily: body }}>
      <FocusStyle />
      <style>{CSS}</style>
      <main style={{ maxWidth: 480, margin: '0 auto', minHeight: 'inherit', boxSizing: 'border-box', padding: '24px 20px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, letterSpacing: '0.22em' }}>LOGOS</span>
          <button type="button" className="lg-btn" onClick={skipAll} style={{ ...textBtn, width: 'auto', padding: '0 4px' }}>{t('later')}</button>
        </div>

        <ol aria-label={t('stepsLabel')} style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6 }}>
          {STEPS.map((s, i) => {
            const done = i < current;
            const on = i === current;
            return (
              <li key={s} aria-current={on ? 'step' : undefined} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ height: 3, backgroundColor: done || on ? T.cream : T.border }} />
                <span style={{ fontFamily: mono, fontSize: 11, fontWeight: on ? 700 : 400, color: on ? T.cream : done ? T.creamMid : T.creamDim }}>
                  {t(STEP_LABEL[s])}
                  {done ? ' ✓' : ''}
                </span>
              </li>
            );
          })}
        </ol>

        {lastDiag && step !== 'diagnostic' && (
          <section aria-label={t('baselineLabel')} style={{ border: `1px solid ${T.border}`, backgroundColor: T.panel, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <span style={{ fontSize: 12, color: T.creamMid }}>{t('baselineLabel')}</span>
              <span style={{ fontSize: 14 }}>{t('baselineSub')}</span>
            </div>
            <span style={{ fontFamily: mono, fontSize: 24, fontWeight: 700 }}>{lastDiag.score.total}</span>
          </section>
        )}

        {step === 'diagnostic' && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <h1 style={h1}>{t('diagTitle')}</h1>
              <p style={lead}>{t('diagLead')}</p>
            </div>
            <div style={{ marginTop: 'auto' }}>
              <button type="button" className="lg-btn" style={primary} onClick={() => navigate('/dashboard/diagnostic?from=welcome')}>{t('diagStart')}</button>
            </div>
          </>
        )}

        {step === 'interests' && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <h1 style={h1}>{t('interestsTitle')}</h1>
              <p style={lead}>{t('interestsLead')}</p>
            </div>
            <fieldset style={{ border: 0, margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <legend style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{t('fieldsLegend')}</legend>
              {ALL_FIELDS.map((f) => {
                const on = selected.includes(f.value);
                const locked = !on && selected.length >= MAX_FIELDS;
                return (
                  <label
                    key={f.value}
                    className="ob-chip"
                    style={{
                      minHeight: 44,
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 14px',
                      fontSize: 14,
                      cursor: locked ? 'not-allowed' : 'pointer',
                      opacity: locked ? 0.4 : 1,
                      backgroundColor: on ? T.cream : 'transparent',
                      color: on ? 'var(--l-on-fg)' : T.cream,
                      border: `1px solid ${on ? T.cream : T.borderMid}`,
                    }}
                  >
                    <input type="checkbox" checked={on} disabled={locked} onChange={() => toggle(f.value)} />
                    {fieldName(f)}
                  </label>
                );
              })}
            </fieldset>
            <section aria-label={t('nextPreview')} style={{ borderTop: `1px solid ${T.border}`, paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Label style={{ color: T.cream, fontWeight: 700, fontSize: 11, letterSpacing: '0.16em' }}>{t('nextArgueTitle')}</Label>
              <span style={{ fontSize: 14, lineHeight: 1.55, color: T.creamMid }}>{t('nextArgueBody')}</span>
            </section>
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                type="button"
                className="lg-btn"
                disabled={!selected.length}
                style={{ ...primary, ...(selected.length ? {} : btnDisabled) }}
                onClick={confirmFields}
              >
                {selected.length ? t('nextCount', { n: selected.length }) : t('nextNone')}
              </button>
              <button type="button" className="lg-btn" style={textBtn} onClick={skipFields}>{t('skip')}</button>
            </div>
          </>
        )}

        {step === 'argue' && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <h1 style={h1}>{t('argueTitle')}</h1>
              <p style={lead}>{t('argueLead')}</p>
            </div>
            <div style={{ marginTop: 'auto' }}>
              <button type="button" className="lg-btn" style={primary} onClick={() => navigate('/dashboard/argue')}>{t('argueStart')}</button>
            </div>
          </>
        )}

        {step === 'reminder' && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <h1 style={h1}>{t('reminderTitle')}</h1>
              <p style={lead}>{t('reminderLead')}</p>
            </div>
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button type="button" className="lg-btn" style={primary} onClick={addToCalendar}>{t('reminderAdd')}</button>
              <button type="button" className="lg-btn" style={textBtn} onClick={() => finishReminder(false)}>{t('skip')}</button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
