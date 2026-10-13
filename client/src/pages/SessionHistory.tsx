/*
 * SessionHistory.tsx — 세션 기록 (내 계정에 저장된 실제 기록)
 */
import { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import DashboardLayout from '@/components/DashboardLayout';
import { T, mono, serif, Label, btnPrimary, btnGhost, panelStyle, FocusStyle, DeltaRow, Quote, RubricBars, ReportBlocks, sans } from '@/components/logos-ui';
import { formatDate, useLocale, useT } from '@/i18n';
import { usePageMeta } from '@/lib/usePageMeta';
import { sessionDelta, useStore, type ArenaRecord, type SessionRecord } from '@/lib/store';
import type { Stage } from '@/lib/api';
import { ARENA_TOPICS } from '../../../shared/arenaTopics';

const STAGE_KEY = { 표면: 'Surface', 도전: 'Challenge', 핵심: 'Core', 통합: 'Integrate' } as const satisfies Record<Stage, string>;

type Filter = 'all' | 'session' | 'argue' | 'arena';
const FILTERS = [
  { v: 'all', key: 'filterAll' },
  { v: 'session', key: 'filterCoaching' },
  { v: 'argue', key: 'filterArgue' },
  { v: 'arena', key: 'filterArena' },
] as const satisfies readonly { v: Filter; key: string }[];
const VERDICT_SHORT = { win: 'verdictW', draw: 'verdictD', lose: 'verdictL' } as const;
const VERDICT_FULL = { win: 'verdictWin', draw: 'verdictDraw', lose: 'verdictLose' } as const;
type Row = { kind: 'session' | 'argue'; id: string; at: string; s: SessionRecord } | { kind: 'arena'; id: string; at: string; a: ArenaRecord };
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
              <p key={i} className={turn.role === 'assistant' ? undefined : 'l-prose'} style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: turn.role === 'assistant' ? T.cream : T.creamMid, ...(turn.role === 'assistant' ? { fontFamily: serif } : {}), whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
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

function ArenaDetail({ a }: { a: ArenaRecord }) {
  const ta = useT('arena');
  const res = a.result;
  const lessons = res?.lessons.filter((l) => l.lesson.trim() || l.quote.trim()) ?? [];
  return (
    <div style={{ display: 'grid', gap: 18, padding: '4px 0 20px' }}>
      {res ? (
        <>
          <RubricBars after={{ ...res }} />
          <p style={{ margin: 0, fontFamily: sans, fontSize: 12, color: T.creamMid, lineHeight: 1.7 }}>{res.rationale} {ta('aiEstimate')}</p>
          {lessons.map((l, i) => (
            <div key={i} style={{ display: 'grid', gap: 8 }}>
              {l.quote.trim() && <Quote>"{l.quote}"</Quote>}
              <p className="l-prose" style={{ margin: 0, fontSize: 13, color: T.cream, overflowWrap: 'anywhere' }}>{l.lesson}</p>
            </div>
          ))}
        </>
      ) : (
        <p style={{ margin: 0, fontSize: 13, color: T.creamMid }}>{ta('notJudged')}</p>
      )}
    </div>
  );
}

export default function SessionHistory() {
  const t = useT('history');
  const tSession = useT('session');
  const [, navigate] = useLocation();
  const store = useStore();
  const { locale } = useLocale();
  const ta = useT('arena');
  usePageMeta('history', { noindex: true });
  const [filter, setFilter] = useState<Filter>(() => {
    const k = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('kind');
    return FILTERS.some((f) => f.v === k) ? (k as Filter) : 'all';
  });
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const arenaTitle = (a: ArenaRecord) => ARENA_TOPICS.find((x) => x.id === a.topicId)?.[locale].title ?? a.topicId;
  const list = useMemo(() => {
    const rows: Row[] = [
      ...store.sessions.map((s): Row => ({ kind: s.kind === 'argue' ? 'argue' : 'session', id: s.id, at: s.startedAt, s })),
      ...(store.arenas ?? []).map((a): Row => ({ kind: 'arena', id: a.id, at: a.startedAt, a })),
    ].sort((x, y) => y.at.localeCompare(x.at));
    const has = (text: string | undefined) => (text ?? '').includes(q);
    return rows.filter(
      (r) =>
        (filter === 'all' || r.kind === filter) &&
        (!q || (r.kind === 'arena' ? has(arenaTitle(r.a)) : has(r.s.topic) || has(r.s.finalSummary) || has(r.s.firstClaim))),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.sessions, store.arenas, filter, q, locale]);

  return (
    <DashboardLayout title={t('title')} titleEn={t('titleEn')} aiNotice>
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

        {store.sessions.length === 0 && (store.arenas ?? []).length === 0 ? (
          <div style={{ ...panelStyle, display: 'grid', gap: 12 }}>
            <p style={{ margin: 0, fontFamily: serif, fontSize: 18, color: T.cream }}>{t('emptyTitle')}</p>
            <p style={{ margin: 0, fontSize: 13, color: T.creamMid, lineHeight: 1.7 }}>{t('emptyBody')}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="lg-btn" style={btnPrimary} onClick={() => navigate('/dashboard/session')}>{t('coachingButton')}</button>
              <button type="button" className="lg-btn" style={btnGhost} onClick={() => navigate('/dashboard/argue')}>{t('argueButton')}</button>
              <button type="button" className="lg-btn" style={btnGhost} onClick={() => navigate('/dashboard/arena')}>{t('filterArena')}</button>
            </div>
          </div>
        ) : list.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: T.creamMid }}>{t('noMatch')}</p>
        ) : (
          <div>
            {list.map((row) => {
              const isOpen = open === row.id;
              if (row.kind === 'arena') {
                const a = row.a;
                const v = a.result?.verdict;
                return (
                  <div key={row.id} style={{ borderTop: `1px solid ${T.border}` }}>
                    <button type="button" className="lg-btn" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : row.id)}
                      style={{ width: '100%', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', textAlign: 'left', padding: '16px 0', background: 'none', border: 'none', color: T.cream, cursor: 'pointer' }}>
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: 'block', fontFamily: mono, fontSize: 13, fontWeight: 700, marginBottom: 3, overflowWrap: 'anywhere' }}>{arenaTitle(a)}</span>
                        <span style={{ fontFamily: mono, fontSize: 11, color: T.creamMid }}>
                          {fmt(a.startedAt)} · {t('kindArena')} · {t('arenaSide', { side: ta(a.side) })}{v ? '' : ` · ${t('arenaPending')}`}
                        </span>
                      </span>
                      <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexShrink: 0 }}>
                        {v && <span title={ta(VERDICT_FULL[v])} aria-label={ta(VERDICT_FULL[v])} style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, border: `1px solid ${T.borderMid}`, padding: '1px 6px', color: v === 'win' ? T.amber : T.creamMid }}>{t(VERDICT_SHORT[v])}</span>}
                        {a.result && <span style={{ fontFamily: serif, fontSize: 24 }}>{a.result.total}</span>}
                      </span>
                    </button>
                    {isOpen && <ArenaDetail a={a} />}
                  </div>
                );
              }
              const s = row.s;
              const d = sessionDelta(s);
              return (
                <div key={s.id} style={{ borderTop: `1px solid ${T.border}` }}>
                  <button type="button" className="lg-btn" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : s.id)}
                    style={{ width: '100%', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', textAlign: 'left', padding: '16px 0', background: 'none', border: 'none', color: T.cream, cursor: 'pointer' }}>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontFamily: mono, fontSize: 13, fontWeight: 700, marginBottom: 3, overflowWrap: 'anywhere' }}>{s.topic}</span>
                      <span style={{ fontFamily: mono, fontSize: 11, color: T.creamMid }}>
                        {fmt(s.startedAt)} · {s.kind === 'argue' ? t('kindArgue') : t('kindCoaching')} · {s.completedAt ? t('done') : t('inProgress', { stage: tSession(`stage${STAGE_KEY[s.stageReached]}`) })}
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
