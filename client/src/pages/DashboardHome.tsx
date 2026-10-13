/*
 * DashboardHome.tsx — LOGOS 성장 대시보드
 * 모든 숫자는 내 계정의 실제 기록(이 기기의 캐시)에서 나온다. 기록이 없으면 빈 상태 문구를 보여준다.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { toast } from 'sonner';
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import DashboardLayout from '@/components/DashboardLayout';
import { T, mono, serif, Label, btnPrimary, btnGhost, panelStyle, FocusStyle, Quote } from '@/components/logos-ui';
import { loadFields, type Field } from '@/lib/preferences';
import { FIELD_KEY } from '@/lib/fieldKeys';
import { pickResume, resumeHref, stageStep } from '@/lib/resume';
import { FIELD_COLOR } from '@/lib/colors';
import { todaysTopic } from '@/lib/topics';
import { buildDailyArgueIcs, downloadFile } from '@/lib/ics';
import { formatDate, useLocale, useT } from '@/i18n';
import { usePageMeta } from '@/lib/usePageMeta';
import { recordCount, useOnboardingRedirect } from '@/lib/onboarding';
import { loadDismissedDay, saveDismissedDay, streakRisk } from '@/lib/streakRisk';
import { weeklyRecap } from '@/lib/recap';
import { detectMilestones, keepNew, nextMilestone } from '@/lib/milestones';
import { StreakRiskBanner } from '@/components/growth/StreakRiskBanner';
import { WeeklyRecapCard } from '@/components/growth/WeeklyRecapCard';
import { MilestoneStrip } from '@/components/growth/MilestoneStrip';
import { ARENA_TOPICS } from '../../../shared/arenaTopics';
import {
  REDIAGNOSE_DAYS, addDays, avgDelta, completionRate, computeStreak, daysUntilRediagnosis, exportJSON,
  arenaRecord, isoWeekKey, localDate, pickComparison, toISODate, useStore, weekdayIndex,
} from '@/lib/store';

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
  const tn = useT('nav');
  const { locale } = useLocale();
  const [, navigate] = useLocation();
  const store = useStore();
  usePageMeta('dashboard', { noindex: true });
  const [fields, setFields] = useState<Field[]>(() => loadFields());
  const [skipDiag, setSkipDiag] = useState(false);
  useOnboardingRedirect();
  // 1분마다 갱신: 연속 기록 배너의 남은 시간과 자정 넘김 처리
  const [now, setNow] = useState(() => new Date());
  const [dismissedDay, setDismissedDay] = useState(() => loadDismissedDay());
  // locale이 바뀌면 주제 제목도 다시 가져온다
  const topic = useMemo(() => todaysTopic(), [locale]);

  useEffect(() => {
    const sync = () => setFields(loadFields());
    window.addEventListener('logos:fields-changed', sync);
    return () => window.removeEventListener('logos:fields-changed', sync);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

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
  const risk = streakRisk(store, now, dismissedDay);
  const hasRecords = recordCount(store) > 0;
  const recap = useMemo(() => weeklyRecap(store, now), [store, today]);
  const newMilestones = useRef(new Set<string>()); // 이번 방문에 NEW였던 것은 store가 바뀌어도 계속 NEW
  const milestones = useMemo(() => keepNew(detectMilestones(store), newMilestones.current), [store]);
  const nextMs = useMemo(() => nextMilestone(store), [store]);
  const compare = useMemo(() => pickComparison(store.sessions, new Date()), [store.sessions]);

  const fieldCounts = fields.map((f) => ({
    f,
    n: store.sessions.filter((s) => s.completedAt && s.field && (s.field.includes(f) || f.includes(s.field))).length,
  }));
  // 코칭·논증·아레나 기록을 시작 시각 순으로 합쳐 최근 3건만 보여 준다
  const recent = [
    ...store.sessions.map((s) => ({
      id: s.id,
      at: s.startedAt,
      topic: s.topic,
      kind: s.kind === 'argue' ? t('kindArgue') : t('kindCoaching'),
      arena: false,
      done: !!s.completedAt,
      score: s.scoreAfter?.total,
    })),
    ...(store.arenas ?? []).map((a) => ({
      id: a.id,
      at: a.startedAt,
      topic: ARENA_TOPICS.find((x) => x.id === a.topicId)?.[locale].title ?? a.topicId,
      kind: t('kindArena'),
      arena: true,
      done: !!a.completedAt,
      score: a.result?.total,
    })),
  ]
    .sort((x, y) => y.at.localeCompare(x.at))
    .slice(0, 3);

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

  const showDiagInvite = (!lastDiag && !skipDiag) || (lastDiag && rediagDue);
  const resumeRec = pickResume(store);
  const wdl = arenaRecord(store.arenas ?? []);
  const arenaDone = wdl.w + wdl.d + wdl.l;
  const kpis: { label: string; n: string; sub: string }[] = [];
  if (streak.count > 0) kpis.push({ label: t('kpiStreak'), n: t('days', { n: streak.count }), sub: streak.freezesLeftThisWeek > 0 ? t('freezeLeft') : t('freezeUsed') });
  if (comp.rate !== null) kpis.push({ label: t('kpiCompletion'), n: `${Math.round(comp.rate * 100)}%`, sub: t('startedCompleted', { started: comp.started, completed: comp.completed }) });
  if (delta !== null) kpis.push({ label: t('kpiDelta'), n: `${delta > 0 ? '+' : ''}${Math.round(delta)}`, sub: t('deltaSub') });
  if (lastDiag) kpis.push({ label: t('kpiDiag'), n: prevDiag ? `${prevDiag.score.total}→${lastDiag.score.total}` : `${lastDiag.score.total}→?`, sub: dueIn === 0 ? t('diagKpiDue') : t('diagKpiIn', { n: dueIn ?? 0 }) });
  if (arenaDone > 0) kpis.push({ label: t('kpiArena'), n: t('arenaWdl', wdl), sub: t('arenaSub', { n: arenaDone }) });

  const argueCard = (hero: boolean) => (
    <div style={{ border: `1px solid ${hero ? T.cream : T.border}`, padding: 18, display: 'grid', gap: 10, minWidth: 0, alignContent: 'start' }}>
      <Label>{t('argueLabel')}</Label>
      <p style={{ fontFamily: serif, fontSize: hero ? 22 : 19, lineHeight: 1.4, margin: 0, color: T.cream }}>"{topic.title}"</p>
      <p className="l-prose" style={{ margin: 0, fontSize: 13, color: T.creamMid }}>{t('argueLead')}</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" className="lg-btn" style={btnPrimary} onClick={() => navigate('/dashboard/argue')}>{doneToday ? t('argueAgain') : t('argueStart')}</button>
        <button type="button" className="lg-btn" style={btnGhost} onClick={addToCalendar}>{t('addToCalendar')}</button>
      </div>
      {doneToday && <span style={{ fontFamily: mono, fontSize: 11, color: T.creamMid }}>{t('argueDone')}</span>}
    </div>
  );

  return (
    <DashboardLayout title={t('title')} titleEn={t('titleEn')}>
      <FocusStyle />
      <div style={{ display: 'grid', gap: 24, maxWidth: 1080 }}>
        <StreakRiskBanner risk={risk} onDismiss={() => { saveDismissedDay(today); setDismissedDay(today); }} />
        <Label>{t('eyebrowLine', { date: formatDate(now, { weekday: 'long', month: 'long', day: 'numeric' }), n: streak.count })}</Label>

        {hasRecords && <WeeklyRecapCard recap={recap} />}
        {hasRecords && <MilestoneStrip milestones={milestones} next={nextMs} />}

        {resumeRec ? (
          <>
            <div style={{ border: `1px solid ${T.cream}`, padding: 18, display: 'grid', gap: 12, minWidth: 0 }}>
              <Label>{t('heroResume', { mode: tn('session') })}</Label>
              <p style={{ fontFamily: serif, fontSize: 22, lineHeight: 1.4, margin: 0, color: T.cream, overflowWrap: 'anywhere' }}>"{resumeRec.topic}"</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span role="img" aria-label={t('stageOf', { n: stageStep(resumeRec) })} style={{ display: 'flex', gap: 4, flex: '0 1 200px', width: '100%' }}>
                  {[1, 2, 3, 4].map((i) => <span key={i} style={{ height: 4, flex: 1, backgroundColor: i <= stageStep(resumeRec) ? T.amber : T.border }} />)}
                </span>
                <span style={{ fontFamily: mono, fontSize: 11, color: T.creamMid }}>{t('stageOf', { n: stageStep(resumeRec) })}</span>
              </div>
              <div><button type="button" className="lg-btn" style={btnPrimary} onClick={() => navigate(resumeHref(resumeRec))}>{t('resumeBtn')}</button></div>
            </div>
            {argueCard(false)}
          </>
        ) : (
          argueCard(true)
        )}

        {showDiagInvite && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
            <button type="button" className="lg-btn" onClick={() => navigate('/dashboard/diagnostic')}
              style={{ flex: 1, border: `1px dashed ${T.borderMid}`, background: 'none', color: T.cream, padding: '12px 14px', textAlign: 'left', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13 }}>
              {lastDiag ? t('diagRowRe') : t('diagRowFirst')}
            </button>
            {!lastDiag && <button type="button" className="lg-btn" style={{ ...btnGhost, border: 'none', textDecoration: 'underline', textTransform: 'none' }} onClick={() => setSkipDiag(true)}>{t('diagLater')}</button>}
          </div>
        )}

        {kpis.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 1, backgroundColor: T.border, border: `1px solid ${T.border}` }}>
            {kpis.map((k) => <Kpi key={k.label} {...k} />)}
          </div>
        )}

        {/* 주간 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 20 }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 20 }}>
          {trend.length >= 2 && <div style={{ display: 'grid', gap: 8, minWidth: 0, alignContent: 'start' }}>
            <Label>{t('trendLabel')}</Label>
            {(
              <div style={{ height: 180 }} role="img" aria-label={t('trendAria', { n: trend.length, from: trend[0].score, to: trend[trend.length - 1].score })}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
                    <CartesianGrid stroke="var(--l-border)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: T.creamMid }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: T.creamMid }} axisLine={false} tickLine={false} width={40} />
                    <Tooltip contentStyle={{ backgroundColor: T.black, border: `1px solid ${T.borderMid}`, fontFamily: 'var(--font-mono)', fontSize: 11 }} labelStyle={{ color: T.creamMid }} itemStyle={{ color: T.cream }} formatter={(v: number) => [t('points', { n: v }), t('finalSummary')]} />
                    <Line type="monotone" dataKey="score" stroke={T.accent} strokeWidth={2} dot={{ r: 3, fill: T.accent, stroke: T.accent }} activeDot={{ r: 5, fill: T.amber, stroke: T.amber }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>}
          {compare && <div style={{ display: 'grid', gap: 10, minWidth: 0, alignContent: 'start' }}>
            <Label>{compare.sameTopic ? t('compareSame', { topic: compare.older.topic }) : t('compareOld')}</Label>
            {(
              <>
                <Quote>{t('quoteLine', { date: fmtMD(compare.older.startedAt), text: compare.older.finalSummary ?? compare.older.firstClaim ?? '' })}</Quote>
                <Quote after>{t('quoteLine', { date: fmtMD(compare.newer.startedAt), text: compare.newer.finalSummary ?? compare.newer.firstClaim ?? '' })}</Quote>
              </>
            )}
          </div>}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: mono, fontSize: 11, padding: '3px 8px', border: `1px solid ${T.border}`, color: T.creamMid }}>{t('savedBadge')}</span>
          <button type="button" className="lg-btn" style={btnGhost} onClick={exportData}>{t('exportButton')}</button>
        </div>

        {fields.length > 0 && (
          <div style={{ display: 'grid', gap: 10 }}>
            <Label>{t('fieldCounts')}</Label>
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

        {recent.length > 0 && <div style={{ display: 'grid', gap: 10 }}>
          <Label>{t('recent')}</Label>
          {(
            recent.map((s) => (
              <button key={s.id} type="button" className="lg-btn" onClick={() => navigate(s.arena ? '/dashboard/history?kind=arena' : '/dashboard/history')}
                style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', textAlign: 'left', padding: '14px 0', background: 'none', border: 'none', borderTop: `1px solid ${T.border}`, color: T.cream, cursor: 'pointer' }}>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontFamily: mono, fontSize: 13, fontWeight: 700, overflowWrap: 'anywhere' }}>{s.topic}</span>
                  <span style={{ fontFamily: mono, fontSize: 11, color: T.creamMid }}>{fmtMD(s.at)} · {s.kind} · {s.done ? t('done') : t('inProgress')}</span>
                </span>
                {s.score !== undefined && <span style={{ fontFamily: serif, fontSize: 24, flexShrink: 0 }}>{s.score}</span>}
              </button>
            ))
          )}
        </div>}
      </div>
    </DashboardLayout>
  );
}
