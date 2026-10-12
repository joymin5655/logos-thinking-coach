/*
 * DashboardHome.tsx — LOGOS 성장 대시보드
 * 모든 숫자는 내 계정의 실제 기록(이 기기의 캐시)에서 나온다. 기록이 없으면 빈 상태 문구를 보여준다.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { toast } from 'sonner';
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import DashboardLayout from '@/components/DashboardLayout';
import { T, mono, serif, Label, btnPrimary, btnGhost, panelStyle, FocusStyle, Quote } from '@/components/logos-ui';
import { ALL_FIELDS, MAX_FIELDS, loadFields, saveFields, type Field } from '@/lib/preferences';
import { FIELD_COLOR } from '@/lib/colors';
import { todaysTopic } from '@/lib/topics';
import { buildDailyArgueIcs, downloadFile } from '@/lib/ics';
import { formatDate, useLocale, useT } from '@/i18n';
import {
  REDIAGNOSE_DAYS, addDays, avgDelta, completionRate, computeStreak, daysUntilRediagnosis, exportJSON,
  isoWeekKey, localDate, pickComparison, toISODate, useStore, weekdayIndex,
} from '@/lib/store';

// Field는 데이터에 쓰이는 한국어 키다. 화면에는 이 키로 사전의 표시 이름을 찾아 쓴다.
const FIELD_KEY = {
  '기술·사회': 'fieldTechSociety',
  '사회': 'fieldSociety',
  '경제': 'fieldEconomy',
  '철학': 'fieldPhilosophy',
  '윤리': 'fieldEthics',
  '노동': 'fieldLabor',
  '커리어': 'fieldCareer',
  '라이프스타일': 'fieldLifestyle',
  '교육': 'fieldEducation',
} as const satisfies Record<Field, string>;

const fmtMD = (iso: string) => formatDate(iso);

function Kpi({ label, n, sub }: { label: string; n: string; sub: string }) {
  return (
    <div style={{ backgroundColor: T.panel, padding: 16, display: 'grid', gap: 4, minWidth: 0 }}>
      <Label>{label}</Label>
      <span style={{ fontFamily: serif, fontSize: 30, lineHeight: 1.1, color: T.cream, fontVariantNumeric: 'tabular-nums' }}>{n}</span>
      <span style={{ fontSize: 12, color: T.creamMid, lineHeight: 1.5 }}>{sub}</span>
    </div>
  );
}

export default function DashboardHome() {
  const t = useT('dashboard');
  const { locale } = useLocale();
  const [, navigate] = useLocation();
  const store = useStore();
  const [fields, setFields] = useState<Field[]>(() => loadFields());
  const [draft, setDraft] = useState<Field[]>([]);
  const [skipDiag, setSkipDiag] = useState(false);
  // locale이 바뀌면 주제 제목도 다시 가져온다
  const topic = useMemo(() => todaysTopic(), [locale]);

  useEffect(() => {
    const sync = () => setFields(loadFields());
    window.addEventListener('logos:fields-changed', sync);
    return () => window.removeEventListener('logos:fields-changed', sync);
  }, []);

  const now = new Date();
  const today = toISODate(now);
  const streak = computeStreak(store.streak.days, today);
  const comp = completionRate(store.sessions);
  const delta = avgDelta(store.sessions);
  const lastDiag = store.diagnostics[store.diagnostics.length - 1];
  const prevDiag = store.diagnostics[store.diagnostics.length - 2];
  const dueIn = daysUntilRediagnosis(store, today);
  const rediagDue = dueIn === 0;
  const doneToday = store.sessions.some((s) => s.kind === 'argue' && s.completedAt && localDate(s.startedAt) === today);

  const trend = useMemo(
    () =>
      store.sessions
        .filter((s) => s.completedAt && s.scoreAfter)
        .sort((a, b) => a.completedAt!.localeCompare(b.completedAt!))
        .slice(-10)
        .map((s) => ({ label: fmtMD(s.completedAt!), score: s.scoreAfter!.total })),
    [store.sessions],
  );
  const compare = useMemo(() => pickComparison(store.sessions, new Date()), [store.sessions]);

  const fieldCounts = fields.map((f) => ({
    f,
    n: store.sessions.filter((s) => s.completedAt && s.field && (s.field.includes(f) || f.includes(s.field))).length,
  }));
  const recent = [...store.sessions].reverse().slice(0, 3);

  const weekStart = addDays(today, -weekdayIndex(today));
  const week = [0, 1, 2, 3, 4, 5, 6].map((i) => {
    const date = addDays(weekStart, i);
    const froze = streak.freezeDates.includes(date) || store.streak.freezesUsed[isoWeekKey(date)] === date;
    const ko = formatDate(new Date(`${date}T00:00:00`), { weekday: 'short' });
    return { ko, date, done: store.streak.days.includes(date), froze, isToday: date === today, future: date > today };
  });

  const addToCalendar = () => {
    const tomorrow = todaysTopic(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
    const ics = buildDailyArgueIcs(tomorrow.title, `${window.location.origin}/dashboard/argue`);
    downloadFile('logos-daily-argue.ics', ics, 'text/calendar;charset=utf-8');
    toast(t('calendarToast'));
  };
  const exportData = () => {
    downloadFile(`logos-export-${today}.json`, exportJSON(), 'application/json');
    toast(t('exportDone'));
  };

  const toggleDraft = (f: Field) =>
    setDraft((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : prev.length >= MAX_FIELDS ? prev : [...prev, f]));
  const commitFields = () => {
    if (!draft.length) return;
    saveFields(draft);
    setFields(draft);
    setDraft([]);
  };

  const showDiagInvite = (!lastDiag && !skipDiag) || (lastDiag && rediagDue);

  return (
    <DashboardLayout title={t('title')} titleEn="Dashboard">
      <FocusStyle />
      <div style={{ display: 'grid', gap: 24, maxWidth: 1080 }}>
        <div style={{ display: 'grid', gap: 6 }}>
          <Label>{t('eyebrow')}</Label>
          <h2 style={{ fontFamily: serif, fontWeight: 600, fontSize: 'clamp(1.6rem, 4vw, 2.1rem)', color: T.cream, letterSpacing: '-0.02em', margin: 0 }}>
            {t('heading')}
          </h2>
          <p style={{ fontFamily: mono, fontSize: 12, color: T.creamMid, margin: 0, lineHeight: 1.8 }}>
            {t('intro')}{' '}
            <Link href="/privacy" style={{ color: T.cream }}>{t('privacyLink')}</Link>
          </p>
        </div>

        {showDiagInvite && (
          <div style={{ ...panelStyle, borderColor: T.cream, display: 'grid', gap: 10 }}>
            <Label>{lastDiag ? t('diagRe') : t('diagFirst')}</Label>
            <p style={{ margin: 0, fontFamily: serif, fontSize: 20, lineHeight: 1.4, color: T.cream }}>
              {lastDiag ? t('diagReLead', { days: REDIAGNOSE_DAYS }) : t('diagFirstLead')}
            </p>
            <p style={{ margin: 0, fontSize: 13, color: T.creamMid, lineHeight: 1.7 }}>
              {lastDiag ? t('diagLast', { score: lastDiag.score.total }) : t('diagFirstBody', { days: REDIAGNOSE_DAYS })}
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="lg-btn" style={btnPrimary} onClick={() => navigate('/dashboard/diagnostic')}>{lastDiag ? t('diagReButton') : t('diagFirstButton')}</button>
              {!lastDiag && <button type="button" className="lg-btn" style={btnGhost} onClick={() => setSkipDiag(true)}>{t('diagLater')}</button>}
            </div>
          </div>
        )}

        {fields.length === 0 && (
          <div style={{ ...panelStyle, display: 'grid', gap: 12 }}>
            <Label>{t('fieldPickLabel')}</Label>
            <p style={{ margin: 0, fontSize: 13, color: T.creamMid, lineHeight: 1.7 }}>{t('fieldPickLead', { max: MAX_FIELDS })}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }} role="group" aria-label={t('fieldGroup')}>
              {ALL_FIELDS.map((opt) => {
                const picked = draft.includes(opt.value);
                const atCap = !picked && draft.length >= MAX_FIELDS;
                return (
                  <button key={opt.value} type="button" className="lg-btn" aria-pressed={picked} onClick={() => toggleDraft(opt.value)} disabled={atCap}
                    style={{ ...btnGhost, padding: '8px 14px', fontSize: 11, textTransform: 'none', letterSpacing: '0.05em', backgroundColor: picked ? T.cream : 'transparent', color: picked ? 'var(--l-on-fg)' : atCap ? T.creamDim : T.creamMid, borderColor: picked ? T.cream : T.borderMid, cursor: atCap ? 'not-allowed' : 'pointer' }}>
                    {t(FIELD_KEY[opt.value])}
                  </button>
                );
              })}
            </div>
            <div><button type="button" className="lg-btn" style={{ ...btnPrimary, opacity: draft.length ? 1 : 0.4 }} disabled={!draft.length} onClick={commitFields}>{t('save')}</button></div>
          </div>
        )}

        {/* KPI */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 1, backgroundColor: T.border, border: `1px solid ${T.border}` }}>
          <Kpi label={t('kpiStreak')} n={t('days', { n: streak.count })} sub={streak.freezesLeftThisWeek > 0 ? t('freezeLeft') : t('freezeUsed')} />
          <Kpi label={t('kpiCompletion')} n={comp.rate === null ? '—' : `${Math.round(comp.rate * 100)}%`} sub={comp.started ? t('startedCompleted', { started: comp.started, completed: comp.completed }) : t('noneStarted')} />
          <Kpi label={t('kpiDelta')} n={delta === null ? '—' : `${delta > 0 ? '+' : ''}${Math.round(delta)}`} sub={delta === null ? t('deltaEmpty') : t('deltaSub')} />
          <Kpi
            label={t('kpiDiag')}
            n={!lastDiag ? '—' : prevDiag ? `${prevDiag.score.total}→${lastDiag.score.total}` : `${lastDiag.score.total}→?`}
            sub={!lastDiag ? t('diagKpiEmpty') : dueIn === 0 ? t('diagKpiDue') : t('diagKpiIn', { n: dueIn ?? 0 })}
          />
        </div>

        {/* 오늘의 논증 + 주간 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          <div style={{ border: `1px solid ${T.cream}`, padding: 18, display: 'grid', gap: 10, minWidth: 0, alignContent: 'start' }}>
            <Label>{t('argueLabel')}</Label>
            <p style={{ fontFamily: serif, fontSize: 19, lineHeight: 1.4, margin: 0, color: T.cream }}>"{topic.title}"</p>
            <p style={{ margin: 0, fontSize: 13, color: T.creamMid, lineHeight: 1.7 }}>{t('argueLead')}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="lg-btn" style={btnPrimary} onClick={() => navigate('/dashboard/argue')}>{doneToday ? t('argueAgain') : t('argueStart')}</button>
              <button type="button" className="lg-btn" style={btnGhost} onClick={addToCalendar}>{t('addToCalendar')}</button>
            </div>
            {doneToday && <span style={{ fontFamily: mono, fontSize: 11, color: T.creamMid }}>{t('argueDone')}</span>}
          </div>
          <div style={{ display: 'grid', gap: 10, minWidth: 0, alignContent: 'start' }}>
            <Label>{t('week')}</Label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
              {week.map((d) => (
                <div key={d.date} style={{ display: 'grid', gap: 4, justifyItems: 'center', fontFamily: mono, fontSize: 10, color: T.creamMid }}>
                  <i
                    role="img"
                    aria-label={t(d.done ? 'dayDone' : d.froze ? 'dayFroze' : d.future ? 'dayFuture' : 'dayNone', { day: d.ko })}
                    style={{
                      width: '100%', aspectRatio: '1', maxWidth: 34, display: 'block',
                      border: `1px solid ${d.isToday ? T.amber : d.done ? T.cream : T.border}`,
                      background: d.done ? T.cream : d.froze ? `repeating-linear-gradient(45deg, ${T.border} 0 3px, transparent 3px 6px)` : 'transparent',
                      opacity: d.future ? 0.45 : 1,
                    }}
                  />
                  {d.ko}
                </div>
              ))}
            </div>
            <p style={{ margin: 0, fontSize: 13, color: T.creamMid, borderLeft: `2px solid ${T.border}`, paddingLeft: 12, lineHeight: 1.7 }}>
              {t('weekLegend')}
            </p>
          </div>
        </div>

        {/* 추이 + 비교 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          <div style={{ display: 'grid', gap: 8, minWidth: 0, alignContent: 'start' }}>
            <Label>{t('trendLabel')}</Label>
            {trend.length >= 2 ? (
              <div style={{ height: 180 }} role="img" aria-label={t('trendAria', { n: trend.length, from: trend[0].score, to: trend[trend.length - 1].score })}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
                    <CartesianGrid stroke="var(--l-border)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontFamily: 'Space Mono', fontSize: 10, fill: T.creamMid }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontFamily: 'Space Mono', fontSize: 10, fill: T.creamMid }} axisLine={false} tickLine={false} width={40} />
                    <Tooltip contentStyle={{ backgroundColor: T.black, border: `1px solid ${T.borderMid}`, fontFamily: 'Space Mono', fontSize: 11 }} labelStyle={{ color: T.creamMid }} itemStyle={{ color: T.cream }} formatter={(v: number) => [t('points', { n: v }), t('finalSummary')]} />
                    <Line type="monotone" dataKey="score" stroke={T.accent} strokeWidth={2} dot={{ r: 3, fill: T.accent, stroke: T.accent }} activeDot={{ r: 5, fill: T.amber, stroke: T.amber }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: 13, color: T.creamMid, lineHeight: 1.7, border: `1px dashed ${T.border}`, padding: 16 }}>
                {t('trendEmpty', { n: trend.length })}
              </p>
            )}
          </div>
          <div style={{ display: 'grid', gap: 10, minWidth: 0, alignContent: 'start' }}>
            <Label>{compare ? (compare.sameTopic ? t('compareSame', { topic: compare.older.topic }) : t('compareOld')) : t('compareDefault')}</Label>
            {compare ? (
              <>
                <Quote>{t('quoteLine', { date: fmtMD(compare.older.startedAt), text: compare.older.finalSummary ?? compare.older.firstClaim ?? '' })}</Quote>
                <Quote after>{t('quoteLine', { date: fmtMD(compare.newer.startedAt), text: compare.newer.finalSummary ?? compare.newer.firstClaim ?? '' })}</Quote>
              </>
            ) : (
              <p style={{ margin: 0, fontSize: 13, color: T.creamMid, lineHeight: 1.7, border: `1px dashed ${T.border}`, padding: 16 }}>
                {t('compareEmpty')}
              </p>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: mono, fontSize: 11, padding: '3px 8px', border: `1px solid ${T.border}`, color: T.creamMid }}>{t('savedBadge')}</span>
              <button type="button" className="lg-btn" style={btnGhost} onClick={exportData}>{t('exportButton')}</button>
            </div>
          </div>
        </div>

        {fields.length > 0 && (
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Label>{t('fieldCounts')}</Label>
              <button type="button" className="lg-btn" onClick={() => { saveFields([]); setDraft([]); }} style={{ ...btnGhost, border: 'none', padding: '2px 0', fontSize: 10, textDecoration: 'underline' }}>{t('fieldReset')}</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
              {fieldCounts.map(({ f, n }) => (
                <div key={f} style={{ ...panelStyle, padding: 14, display: 'grid', gap: 4, borderTop: `2px solid ${FIELD_COLOR[f]}` }}>
                  <span style={{ fontFamily: mono, fontSize: 11, color: T.creamMid }}>{t(FIELD_KEY[f])}</span>
                  <span style={{ fontFamily: serif, fontSize: 24, color: T.cream }}>{n}<span style={{ fontFamily: mono, fontSize: 11, color: T.creamMid }}> {t('timesUnit')}</span></span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gap: 10 }}>
          <Label>{t('recent')}</Label>
          {recent.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: T.creamMid, lineHeight: 1.7, border: `1px dashed ${T.border}`, padding: 16 }}>
              {t('recentEmpty')}
            </p>
          ) : (
            recent.map((s) => (
              <button key={s.id} type="button" className="lg-btn" onClick={() => navigate('/dashboard/history')}
                style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', textAlign: 'left', padding: '14px 0', background: 'none', border: 'none', borderTop: `1px solid ${T.border}`, color: T.cream, cursor: 'pointer' }}>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontFamily: mono, fontSize: 13, fontWeight: 700, overflowWrap: 'anywhere' }}>{s.topic}</span>
                  <span style={{ fontFamily: mono, fontSize: 10, color: T.creamMid }}>{fmtMD(s.startedAt)} · {s.kind === 'argue' ? t('kindArgue') : t('kindCoaching')} · {s.completedAt ? t('done') : t('inProgress')}</span>
                </span>
                {s.scoreAfter && <span style={{ fontFamily: serif, fontSize: 24, flexShrink: 0 }}>{s.scoreAfter.total}</span>}
              </button>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
