/*
 * SessionHistory.tsx — 세션 기록 (내 계정에 저장된 실제 기록)
 */
import { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import DashboardLayout from '@/components/DashboardLayout';
import { T, mono, serif, Label, btnPrimary, btnGhost, panelStyle, FocusStyle, DeltaRow, Quote, RubricBars, ReportBlocks, sans } from '@/components/logos-ui';
import { formatDate, useT } from '@/i18n';
import { sessionDelta, useStore, type SessionRecord } from '@/lib/store';

type Filter = 'all' | 'session' | 'argue';
const FILTERS = [
  { v: 'all', key: 'filterAll' },
  { v: 'session', key: 'filterCoaching' },
  { v: 'argue', key: 'filterArgue' },
] as const satisfies readonly { v: Filter; key: string }[];
const fmt = (iso: string) => formatDate(iso, { year: 'numeric', month: '2-digit', day: '2-digit' });

function Detail({ s }: { s: SessionRecord }) {
  const t = useT('history');
  const [showLog, setShowLog] = useState(false);
  return (
    <div style={{ display: 'grid', gap: 18, padding: '4px 0 20px' }}>
      {s.scoreBefore && s.scoreAfter ? (
        <>
          <DeltaRow before={s.scoreBefore.total} after={s.scoreAfter.total} />
          <RubricBars before={s.scoreBefore} after={s.scoreAfter} />
          <p style={{ margin: 0, fontFamily: sans, fontSize: 12, color: T.creamMid, lineHeight: 1.7 }}>{t('aiEstimate', { rationale: s.scoreAfter.rationale })}</p>
        </>
      ) : (
        <p style={{ margin: 0, fontSize: 13, color: T.creamMid }}>{t('noScore')}</p>
      )}
      {s.firstClaim && <Quote>{t('first', { text: s.firstClaim })}</Quote>}
      {s.finalSummary && <Quote after>{t('last', { text: s.finalSummary })}</Quote>}
      {s.report && <ReportBlocks report={s.report} />}
      {s.survey && (
        <p style={{ margin: 0, fontFamily: mono, fontSize: 11, color: T.creamMid }}>
          {t('survey', { diff: s.survey.differentFromAI, self: s.survey.selfAuthored })}
        </p>
      )}
      <div>
        <button type="button" className="lg-btn" style={{ ...btnGhost, padding: '6px 12px', fontSize: 10 }} onClick={() => setShowLog((v) => !v)} aria-expanded={showLog}>
          {showLog ? t('hideLog') : t('showLog', { n: s.turns.length })}
        </button>
        {showLog && (
          <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
            {s.turns.map((turn, i) => (
              <p key={i} style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: turn.role === 'assistant' ? T.cream : T.creamMid, fontFamily: turn.role === 'assistant' ? serif : mono, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                <span style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.2em', color: T.creamDim, marginRight: 8 }}>{turn.role === 'assistant' ? 'LOGOS' : t('you')}</span>
                {turn.content}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SessionHistory() {
  const t = useT('history');
  const [, navigate] = useLocation();
  const store = useStore();
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const list = useMemo(
    () =>
      [...store.sessions]
        .reverse()
        .filter((s) => (filter === 'all' || s.kind === filter) && (!q || s.topic.includes(q) || (s.finalSummary ?? '').includes(q) || (s.firstClaim ?? '').includes(q))),
    [store.sessions, filter, q],
  );

  return (
    <DashboardLayout title={t('title')} titleEn="Session History">
      <FocusStyle />
      <div style={{ display: 'grid', gap: 16, maxWidth: 860 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', alignItems: 'center' }}>
          <div role="group" aria-label={t('filterGroup')} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {FILTERS.map((f) => (
              <button key={f.v} type="button" className="lg-btn" aria-pressed={filter === f.v} onClick={() => setFilter(f.v)}
                style={{ ...btnGhost, padding: '6px 12px', fontSize: 10, textTransform: 'none', backgroundColor: filter === f.v ? T.cream : 'transparent', color: filter === f.v ? 'var(--l-on-fg)' : T.cream }}>
                {t(f.key)}
              </button>
            ))}
          </div>
          <label style={{ display: 'contents' }}>
            <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{t('searchLabel')}</span>
            <input className="lg-field" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('searchPlaceholder')}
              style={{ fontFamily: mono, fontSize: 12, color: T.cream, backgroundColor: T.black, border: `1px solid ${T.border}`, padding: '8px 12px', minWidth: 0, flex: '1 1 160px', maxWidth: 260 }} />
          </label>
        </div>

        {store.sessions.length === 0 ? (
          <div style={{ ...panelStyle, display: 'grid', gap: 12 }}>
            <p style={{ margin: 0, fontFamily: serif, fontSize: 18, color: T.cream }}>{t('emptyTitle')}</p>
            <p style={{ margin: 0, fontSize: 13, color: T.creamMid, lineHeight: 1.7 }}>{t('emptyBody')}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="lg-btn" style={btnPrimary} onClick={() => navigate('/dashboard/session')}>{t('coachingButton')}</button>
              <button type="button" className="lg-btn" style={btnGhost} onClick={() => navigate('/dashboard/argue')}>{t('argueButton')}</button>
            </div>
          </div>
        ) : list.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: T.creamMid }}>{t('noMatch')}</p>
        ) : (
          <div>
            {list.map((s) => {
              const d = sessionDelta(s);
              const isOpen = open === s.id;
              return (
                <div key={s.id} style={{ borderTop: `1px solid ${T.border}` }}>
                  <button type="button" className="lg-btn" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : s.id)}
                    style={{ width: '100%', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', textAlign: 'left', padding: '16px 0', background: 'none', border: 'none', color: T.cream, cursor: 'pointer' }}>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontFamily: mono, fontSize: 13, fontWeight: 700, marginBottom: 3, overflowWrap: 'anywhere' }}>{s.topic}</span>
                      <span style={{ fontFamily: mono, fontSize: 10, color: T.creamMid }}>
                        {fmt(s.startedAt)} · {s.kind === 'argue' ? t('kindArgue') : t('kindCoaching')} · {s.completedAt ? t('done') : t('inProgress', { stage: s.stageReached })}
                      </span>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexShrink: 0 }}>
                      {d !== null && <span style={{ fontFamily: mono, fontSize: 12, color: d > 0 ? T.amber : T.creamMid }}>{d > 0 ? `+${d}` : d}</span>}
                      {s.scoreAfter && <span style={{ fontFamily: serif, fontSize: 24 }}>{s.scoreAfter.total}</span>}
                    </span>
                  </button>
                  {isOpen && <Detail s={s} />}
                </div>
              );
            })}
            <div style={{ borderTop: `1px solid ${T.border}` }} />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
