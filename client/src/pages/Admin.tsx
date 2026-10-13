/*
 * Admin.tsx — 관리자 지표(/admin). 관리자가 아니면 NotFound를 보여 페이지 존재를 숨긴다.
 * 목표치는 docs/FEEDBACK_PLAN.md §3. 집계는 admin_metrics RPC가 서버에서 한다.
 */
import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import NotFound from '@/pages/NotFound';
import { ErrorLine, FocusStyle, Label, T, btnGhost, mono, sans } from '@/components/logos-ui';
import { usePageMeta } from '@/lib/usePageMeta';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { toCSV } from '@/lib/csv';
import FunnelSection from '@/components/admin/FunnelSection';
import AbandonSection from '@/components/admin/AbandonSection';
import AcquisitionSection from '@/components/admin/AcquisitionSection';
import ArmsSection from '@/components/admin/ArmsSection';
import RaterExportSection from '@/components/admin/RaterExportSection';
import { download, today } from '@/components/admin/shared';
import { formatNumber, useLocale, useT } from '@/i18n';

type KindStat = { started: number; completed: number; completion_rate: number | null; avg_delta: number | null; n_delta: number };
type Retention = { eligible: number; returned: number; rate: number | null };
type Metrics = {
  users: number;
  kinds: Partial<Record<'session' | 'argue' | 'arena' | 'diagnostic', KindStat>>;
  d1: Retention;
  d7: Retention;
  survey: { diff: number | null; self: number | null; n: number };
  arena: { win: number; draw: number; lose: number };
  diagnostics: { users_with_2plus: number; avg_change: number | null };
  waitlist: Record<string, number>;
};

const KINDS = ['session', 'argue', 'arena', 'diagnostic'] as const;
const KIND_KEY = { session: 'kindSession', argue: 'kindArgue', arena: 'kindArena', diagnostic: 'kindDiagnostic' } as const;
const RECORD_COLS = ['user_ref', 'kind', 'started_at', 'completed_at', 'score_before', 'score_after', 'survey_diff', 'survey_self', 'verdict', 'prompt_version', 'form', 'arm', 'first_source'] as const;
const WAITLIST_COLS = ['email', 'plan', 'created_at'] as const;

type Row = Record<string, unknown>;

const card: CSSProperties = { border: `1px solid ${T.border}`, backgroundColor: T.panel, padding: '14px 16px' };
const grid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 };
const big: CSSProperties = { fontFamily: mono, fontSize: 24, color: T.cream, fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 };
const desc: CSSProperties = { fontFamily: sans, fontSize: 12, color: T.creamMid, lineHeight: 1.6, margin: '6px 0 0' };
const small: CSSProperties = { fontFamily: mono, fontSize: 11, color: T.creamMid, fontVariantNumeric: 'tabular-nums' };

const isForbidden = (e: { code?: string } | null) => e?.code === '42501';

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <Label style={{ marginBottom: 6 }}>{title}</Label>
      {note && <p style={{ ...desc, margin: '0 0 10px' }}>{note}</p>}
      {children}
    </section>
  );
}

function Kpi({ label, d, value, target, ok }: { label: string; d: string; value: string; target: string; ok: boolean | null }) {
  const t = useT('admin');
  return (
    <div style={card}>
      <div style={{ ...small, marginBottom: 6 }}>{label}</div>
      <div style={big}>{value}</div>
      <div style={{ ...small, marginTop: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span>{t('target', { target })}</span>
        {ok !== null && (
          <span style={{ color: ok ? T.amber : T.creamDim, border: `1px solid ${ok ? T.amber : T.borderMid}`, padding: '1px 6px', fontSize: 11 }}>
            {ok ? t('met') : t('notMet')}
          </span>
        )}
      </div>
      <p style={desc}>{d}</p>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={card}>
      <div style={{ ...small, marginBottom: 6 }}>{label}</div>
      <div style={big}>{value}</div>
      {sub && <div style={{ ...small, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

export default function Admin() {
  const { isAdmin, loading: authLoading, adminLoading } = useAuth();
  const t = useT('admin');
  const tAuth = useT('auth');
  const { locale } = useLocale();
  usePageMeta('admin', { noindex: true });
  const [data, setData] = useState<Metrics | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [denied, setDenied] = useState(false);
  const [exporting, setExporting] = useState<'records' | 'waitlist' | null>(null);
  const [exportFailed, setExportFailed] = useState(false);

  const load = useCallback(async () => {
    if (!supabase) {
      setFailed(true);
      return;
    }
    setBusy(true);
    setFailed(false);
    try {
      const { data: d, error } = await supabase.rpc('admin_metrics');
      if (isForbidden(error)) setDenied(true);
      else if (error || !d) setFailed(true);
      else setData(d as Metrics);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  const exportCsv = async (which: 'records' | 'waitlist') => {
    if (!supabase || exporting) return;
    setExporting(which);
    setExportFailed(false);
    try {
      const { data: rows, error } = await supabase.rpc(which === 'records' ? 'admin_export' : 'admin_waitlist');
      if (isForbidden(error)) setDenied(true);
      else if (error || !Array.isArray(rows)) setExportFailed(true);
      else {
        const cols = which === 'records' ? RECORD_COLS : WAITLIST_COLS;
        download(`logos-${which === 'records' ? 'records' : 'waitlist'}-${today()}.csv`, toCSV(rows as Row[], cols as unknown as string[]));
      }
    } catch {
      setExportFailed(true);
    } finally {
      setExporting(null);
    }
  };

  if (authLoading || adminLoading) {
    return (
      <div role="status" style={{ minHeight: 'calc(100dvh / var(--ui-scale))', display: 'grid', placeItems: 'center', background: T.black, color: T.creamMid, fontFamily: mono, fontSize: 11, letterSpacing: '0.18em' }}>
        {tAuth('checking')}
      </div>
    );
  }
  if (!isAdmin || denied) return <NotFound />;

  const dash = t('noData');
  const num = (n: number) => formatNumber(n, locale);
  const pct = (r: number | null | undefined) => (r == null ? dash : `${(r * 100).toFixed(1)}%`);
  const dec = (n: number | null | undefined, signed = false) =>
    n == null ? dash : `${signed && n > 0 ? '+' : ''}${n.toLocaleString(locale === 'ko' ? 'ko-KR' : 'en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;

  // 세션 KPI는 코칭 세션(session) 기준. 평균 Δ는 점수 쌍이 있을 때만 판정한다.
  const s = data?.kinds.session;
  const met = (v: number | null | undefined, goal: number) => (v == null ? null : v >= goal);

  return (
    <DashboardLayout title={t('title')} titleEn={t('titleEn')}>
      <FocusStyle />
      <div style={{ maxWidth: 960, padding: '8px 0 40px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ ...small, fontFamily: sans }}>{t('basis')}</span>
          <button type="button" className="lg-btn" onClick={() => void load()} disabled={busy} style={{ ...btnGhost, padding: '6px 14px', fontSize: 10, opacity: busy ? 0.5 : 1 }}>
            {t('refresh')}
          </button>
        </div>

        {failed && <div style={{ marginBottom: 20 }}><ErrorLine message={t('error')} onRetry={() => void load()} retryLabel={t('retry')} /></div>}
        {!data && !failed && <p style={desc} role="status">{t('loading')}</p>}

        {data && (
          <>
            <Section title={t('secKpi')}>
              <div style={grid}>
                <Kpi label={t('kpiCompletion')} d={t('kpiCompletionDesc')} value={pct(s?.completion_rate)} target={t('targetCompletion')} ok={met(s?.completion_rate, 0.6)} />
                <Kpi label={t('kpiDelta')} d={t('kpiDeltaDesc')} value={s?.n_delta ? dec(s.avg_delta, true) : dash} target={t('targetDelta')} ok={s?.n_delta ? met(s.avg_delta, 10) : null} />
                <Kpi label={t('kpiD7')} d={t('kpiD7Desc')} value={pct(data.d7.rate)} target={t('targetD7')} ok={met(data.d7.rate, 0.4)} />
                <Kpi label={t('kpiDiff')} d={t('kpiDiffDesc')} value={dec(data.survey.diff)} target={t('targetDiff')} ok={met(data.survey.diff, 4)} />
              </div>
            </Section>

            <Section title={t('secUsers')} note={t('usersDesc')}>
              <div style={grid}><Stat label={t('users')} value={num(data.users)} /></div>
            </Section>

            <Section title={t('secKinds')} note={t('kindDesc')}>
              <div style={grid}>
                {KINDS.map((k) => {
                  const st = data.kinds[k];
                  return (
                    <Stat
                      key={k}
                      label={t(KIND_KEY[k])}
                      value={pct(st?.completion_rate)}
                      sub={`${t('started')} ${num(st?.started ?? 0)} · ${t('completed')} ${num(st?.completed ?? 0)} · ${t('avgDelta')} ${st?.n_delta ? dec(st.avg_delta, true) : dash} (n=${num(st?.n_delta ?? 0)})`}
                    />
                  );
                })}
              </div>
            </Section>

            <Section title={t('secRetention')} note={t('retentionDesc')}>
              <div style={grid}>
                {([['d1', data.d1], ['d7', data.d7]] as const).map(([k, r]) => (
                  <Stat key={k} label={t(k)} value={pct(r.rate)} sub={`${t('eligible')} ${num(r.eligible)} · ${t('returned')} ${num(r.returned)}`} />
                ))}
              </div>
            </Section>

            <Section title={t('secSurvey')} note={t('surveyDesc')}>
              <div style={grid}>
                <Stat label={t('surveyDiff')} value={dec(data.survey.diff)} sub={`n=${num(data.survey.n)}`} />
                <Stat label={t('surveySelf')} value={dec(data.survey.self)} sub={`n=${num(data.survey.n)}`} />
              </div>
            </Section>

            <Section title={t('secArena')} note={t('arenaDesc')}>
              <div style={grid}>
                <Stat label={t('win')} value={num(data.arena.win)} />
                <Stat label={t('draw')} value={num(data.arena.draw)} />
                <Stat label={t('lose')} value={num(data.arena.lose)} />
              </div>
            </Section>

            <Section title={t('secDiag')} note={t('diagDesc')}>
              <div style={grid}>
                <Stat label={t('diagUsers')} value={num(data.diagnostics.users_with_2plus)} />
                <Stat label={t('diagChange')} value={dec(data.diagnostics.avg_change, true)} />
              </div>
            </Section>

            <Section title={t('secWaitlist')} note={t('waitlistDesc')}>
              <div style={grid}>
                <Stat label={t('planPro')} value={num(data.waitlist.pro ?? 0)} />
                <Stat label={t('planTeam')} value={num(data.waitlist.team ?? 0)} />
              </div>
            </Section>
          </>
        )}

        <FunnelSection />
        <AbandonSection />
        <AcquisitionSection />
        <ArmsSection />

        <Section title={t('secExport')} note={t('exportDesc')}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {(['records', 'waitlist'] as const).map((w) => (
              <button key={w} type="button" className="lg-btn" onClick={() => void exportCsv(w)} disabled={exporting !== null} style={{ ...btnGhost, opacity: exporting ? 0.5 : 1 }}>
                {exporting === w ? t('exporting') : t(w === 'records' ? 'exportRecords' : 'exportWaitlist')}
              </button>
            ))}
          </div>
          {exportFailed && <div style={{ marginTop: 10 }}><ErrorLine message={t('exportFailed')} /></div>}
        </Section>

        <RaterExportSection />
      </div>
    </DashboardLayout>
  );
}
