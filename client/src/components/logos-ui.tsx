/*
 * logos-ui.tsx — 세션·논증·진단·대시보드가 함께 쓰는 작은 조각들.
 * 팔레트는 기존 대시보드와 같다. 앰버는 '납득'·점수 상승 순간에만 쓴다.
 */
import type { CSSProperties, ReactNode } from 'react';
import type { Score, Report } from '@/lib/store';
import { useT } from '@/i18n';

// 값은 CSS 변수(index.css의 --l-*)라 라이트/다크 전환을 따른다.
export const T = {
  black: 'var(--l-bg)',
  panel: 'var(--l-panel)',
  cream: 'var(--l-fg)',
  creamMid: 'var(--l-fg-mid)',
  creamDim: 'var(--l-fg-dim)',
  border: 'var(--l-border)',
  borderMid: 'var(--l-border-mid)',
  faint: 'var(--l-faint)',
  accent: 'var(--l-accent)',
  amber: 'var(--l-amber)',
  error: 'var(--l-error)',
} as const;

export const mono = 'var(--font-mono)';
export const serif = 'var(--font-serif)';
export const sans = 'var(--font-sans)';

export const labelStyle: CSSProperties = {
  fontFamily: mono,
  fontSize: 10,
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: T.creamMid,
};

export const btnPrimary: CSSProperties = {
  fontFamily: mono,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  padding: '10px 20px',
  backgroundColor: T.cream,
  color: 'var(--l-on-fg)',
  border: `1px solid ${T.cream}`,
  cursor: 'pointer',
};

export const btnGhost: CSSProperties = {
  ...btnPrimary,
  backgroundColor: 'transparent',
  color: T.cream,
  border: `1px solid ${T.borderMid}`,
  fontWeight: 400,
};

export const btnDisabled: CSSProperties = { opacity: 0.4, cursor: 'not-allowed' };

export const textareaStyle: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  fontFamily: sans,
  fontSize: 14,
  lineHeight: 1.7,
  color: T.cream,
  backgroundColor: T.black,
  border: `1px solid ${T.border}`,
  padding: '12px 14px',
  resize: 'vertical',
};

export const panelStyle: CSSProperties = {
  border: `1px solid ${T.border}`,
  backgroundColor: T.panel,
  padding: 20,
  minWidth: 0,
};

export const FOCUS_CSS = `
.lg-btn:focus-visible,.lg-field:focus-visible,.lg-scale:focus-visible{outline:2px solid ${T.amber};outline-offset:2px}
.lg-field:focus{border-color:${T.borderMid}!important}
@keyframes lg-dot{0%,80%,100%{opacity:.25}40%{opacity:1}}
@keyframes lg-fade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.lg-dot,.lg-fade{animation:none!important}}
`;

export function FocusStyle() {
  return <style>{FOCUS_CSS}</style>;
}

export function Label({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ ...labelStyle, ...style }}>{children}</div>;
}

export function TypingDots({ label }: { label?: string }) {
  const t = useT('session');
  return (
    <div role="status" aria-live="polite" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '16px 0' }}>
      <span className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
        {label ?? t('uiTyping')}
      </span>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="lg-dot"
          aria-hidden="true"
          style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: T.creamMid, animation: `lg-dot 1.2s ${i * 0.18}s infinite` }}
        />
      ))}
    </div>
  );
}

export function ErrorLine({ message, onRetry, retryLabel }: { message: string; onRetry?: () => void; retryLabel?: string }) {
  const t = useT('session');
  return (
    <div
      role="alert"
      style={{ border: `1px solid ${T.error}`, padding: '10px 14px', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}
    >
      <span style={{ fontFamily: sans, fontSize: 12, color: T.cream, lineHeight: 1.6 }}>{message}</span>
      {onRetry && (
        <button type="button" className="lg-btn" onClick={onRetry} style={{ ...btnGhost, padding: '6px 14px', fontSize: 10 }}>
          {retryLabel ?? t('uiRetry')}
        </button>
      )}
    </div>
  );
}

export function CharCount({ value, max }: { value: string; max: number }) {
  return (
    <span aria-live="off" style={{ fontFamily: mono, fontSize: 10, color: value.length >= max ? T.amber : T.creamDim, fontVariantNumeric: 'tabular-nums' }}>
      {value.length} / {max}
    </span>
  );
}

/* ───── 루브릭 ───── */

export const AXES: { key: 'consistency' | 'evidence' | 'defense'; labelKey: 'axisConsistency' | 'axisEvidence' | 'axisDefense'; max: number }[] = [
  { key: 'consistency', labelKey: 'axisConsistency', max: 30 },
  { key: 'evidence', labelKey: 'axisEvidence', max: 40 },
  { key: 'defense', labelKey: 'axisDefense', max: 30 },
];

/** before가 있으면 앰버 눈금으로 처음 점수를 표시한다. */
export function RubricBars({ after, before }: { after: Score; before?: Score }) {
  const t = useT('session');
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {AXES.map((ax) => {
        const a = after[ax.key];
        const b = before?.[ax.key];
        const label = t(ax.labelKey);
        return (
          <div key={ax.key} style={{ display: 'grid', gridTemplateColumns: 'minmax(6.5em, 9em) 1fr auto', gap: 10, alignItems: 'center', fontSize: 13, color: T.cream }}>
            <span>{label}</span>
            <span
              role="img"
              aria-label={b !== undefined ? t('uiRubricAriaFrom', { label, a, b, max: ax.max }) : t('uiRubricAria', { label, a, max: ax.max })}
              style={{ height: 8, backgroundColor: T.faint, position: 'relative', display: 'block' }}
            >
              <i style={{ position: 'absolute', inset: '0 auto 0 0', width: `${(a / ax.max) * 100}%`, backgroundColor: T.accent }} />
              {b !== undefined && (
                <b style={{ position: 'absolute', top: -3, bottom: -3, width: 2, left: `${(b / ax.max) * 100}%`, backgroundColor: T.amber }} />
              )}
            </span>
            <span style={{ fontFamily: mono, fontSize: 12, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              {b !== undefined ? `${b}→${a}` : `${a} / ${ax.max}`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function BigScore({ n, label, dim, sub }: { n: number; label: string; dim?: boolean; sub?: string }) {
  return (
    <div style={{ display: 'grid', gap: 2 }}>
      <Label>{label}</Label>
      <span style={{ fontFamily: serif, fontSize: 52, lineHeight: 1, color: dim ? T.creamMid : T.cream, fontVariantNumeric: 'tabular-nums' }}>{n}</span>
      {sub && <span style={{ fontSize: 12, color: T.creamMid }}>{sub}</span>}
    </div>
  );
}

export function DeltaRow({ before, after, beforeLabel, afterLabel }: { before: number; after: number; beforeLabel?: string; afterLabel?: string }) {
  const t = useT('session');
  const d = after - before;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 14, alignItems: 'center' }}>
      <BigScore n={before} label={beforeLabel ?? t('uiBeforeClaim')} dim />
      <div aria-label={t(d >= 0 ? 'uiRise' : 'uiFall', { n: Math.abs(d) })} style={{ textAlign: 'center', fontFamily: mono, color: d > 0 ? T.amber : T.creamMid, display: 'grid', gap: 2, fontSize: 11 }}>
        <strong style={{ fontSize: 22 }}>{d > 0 ? `+${d}` : d}</strong>
        {d > 0 ? t('uiToConviction') : d === 0 ? t('uiNoChange') : t('uiRevisit')}
      </div>
      <BigScore n={after} label={afterLabel ?? t('uiAfterFinal')} />
    </div>
  );
}

export function Quote({ children, after }: { children: ReactNode; after?: boolean }) {
  return (
    <p style={{ fontFamily: serif, fontSize: 15, lineHeight: 1.6, margin: 0, borderLeft: `2px solid ${after ? T.amber : T.border}`, paddingLeft: 12, color: T.cream, overflowWrap: 'anywhere' }}>
      {children}
    </p>
  );
}

export function ReportBlocks({ report }: { report: Report }) {
  const t = useT('session');
  const list = (items: string[], ordered?: boolean) => {
    const Tag = ordered ? 'ol' : 'ul';
    return (
      <Tag style={{ margin: 0, fontFamily: sans, paddingLeft: '1.2em', display: 'grid', gap: 8, fontSize: 14, lineHeight: 1.6, color: T.cream }}>
        {items.map((s, i) => (
          <li key={i} style={{ overflowWrap: 'anywhere' }}>{s}</li>
        ))}
      </Tag>
    );
  };
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'grid', gap: 8 }}>
        <Label>{t('uiStuck')}</Label>
        {list(report.stuckPoints, true)}
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        <Label>{t('uiAssumptions')}</Label>
        {list(report.assumptions)}
      </div>
      {report.turningPoint && (
        <div style={{ display: 'grid', gap: 8 }}>
          <Label>{t('uiTurning')}</Label>
          <Quote after>{report.turningPoint}</Quote>
        </div>
      )}
      <div style={{ display: 'grid', gap: 8 }}>
        <Label>{t('uiNextQ')}</Label>
        {list(report.nextQuestions)}
      </div>
    </div>
  );
}

/* ───── 10초 설문 ───── */

function Scale({ value, onChange, name, ends }: { value?: number; onChange: (n: number) => void; name: string; ends: [string, string] }) {
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <div role="radiogroup" aria-label={name} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            className="lg-scale"
            onClick={() => onChange(n)}
            style={{
              width: 40,
              height: 36,
              fontFamily: mono,
              cursor: 'pointer',
              backgroundColor: value === n ? T.cream : 'transparent',
              color: value === n ? 'var(--l-on-fg)' : T.cream,
              border: `1px solid ${value === n ? T.cream : T.borderMid}`,
            }}
          >
            {n}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.creamMid, maxWidth: 230 }}>
        <span>{ends[0]}</span>
        <span>{ends[1]}</span>
      </div>
    </div>
  );
}

export function Survey({ value, onChange }: { value?: { differentFromAI: number; selfAuthored: number }; onChange: (v: { differentFromAI: number; selfAuthored: number }) => void }) {
  const t = useT('session');
  const set = (k: 'differentFromAI' | 'selfAuthored') => (n: number) =>
    onChange({ differentFromAI: value?.differentFromAI ?? 0, selfAuthored: value?.selfAuthored ?? 0, [k]: n });
  const done = !!value && value.differentFromAI > 0 && value.selfAuthored > 0;
  return (
    <div style={{ display: 'grid', gap: 14, borderTop: `1px solid ${T.border}`, paddingTop: 16 }}>
      <Label>{t('uiSurveyLabel')}</Label>
      <p style={{ margin: 0, fontSize: 14, color: T.cream }}>{t('uiSurveyQ1')}</p>
      <Scale name={t('uiSurveyAria1')} value={value?.differentFromAI} onChange={set('differentFromAI')} ends={[t('uiSurveyEnd1a'), t('uiSurveyEnd1b')]} />
      <p style={{ margin: 0, fontSize: 14, color: T.cream }}>{t('uiSurveyQ2')}</p>
      <Scale name={t('uiSurveyAria2')} value={value?.selfAuthored} onChange={set('selfAuthored')} ends={[t('uiSurveyEnd2a'), t('uiSurveyEnd2b')]} />
      {done && <span style={{ fontFamily: mono, fontSize: 11, color: T.creamMid }}>{t('uiSurveySaved')}</span>}
    </div>
  );
}
