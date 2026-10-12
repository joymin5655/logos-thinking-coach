/*
 * Analytics.tsx — LOGOS 논리력 분석
 * 세션 최종 정리와 진단의 루브릭 점수(AI 추정치)를 시간순으로 본다. 강점·개선은 평균에서 규칙으로 계산한다.
 */
import { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import DashboardLayout from '@/components/DashboardLayout';
import { T, mono, serif, Label, btnPrimary, btnGhost, panelStyle, FocusStyle, AXES } from '@/components/logos-ui';
import { SEMANTIC, SEMANTIC_DARK } from '@/lib/colors';
import { useTheme } from '@/contexts/ThemeContext';
import { formatDate, useT } from '@/i18n';
import { avgDelta, useStore, type Score } from '@/lib/store';

type Period = 'week' | 'month' | 'all';
const PERIODS: { v: Period; label: 'periodWeek' | 'periodMonth' | 'periodAll'; days: number }[] = [
  { v: 'week', label: 'periodWeek', days: 7 },
  { v: 'month', label: 'periodMonth', days: 30 },
  { v: 'all', label: 'periodAll', days: 36500 },
];
const pct = (v: number, max: number) => Math.round((v / max) * 100);
const tooltipStyle = { backgroundColor: T.panel, border: `1px solid ${T.borderMid}`, fontFamily: 'Space Mono', fontSize: 11, color: T.cream };
const tick = { fontFamily: 'Space Mono', fontSize: 10, fill: T.creamMid };

const ADVICE = {
  consistency: { strong: 'advStrongConsistency', weak: 'advWeakConsistency' },
  evidence: { strong: 'advStrongEvidence', weak: 'advWeakEvidence' },
  defense: { strong: 'advStrongDefense', weak: 'advWeakDefense' },
} as const;

export default function Analytics() {
  const [, navigate] = useLocation();
  const store = useStore();
  const t = useT('analytics');
  const sem = useTheme().theme === 'dark' ? SEMANTIC : SEMANTIC_DARK; // 라이트 배경에서는 명도를 낮춘 팔레트
  const [period, setPeriod] = useState<Period>('month');

  const points = useMemo(() => {
    const cutoff = Date.now() - PERIODS.find((p) => p.v === period)!.days * 86_400_000;
    const list: { at: string; label: string; score: Score }[] = [];
    for (const s of store.sessions) {
      if (s.completedAt && s.scoreAfter) list.push({ at: s.completedAt, label: s.kind === 'argue' ? t('kindArgue') : t('kindSession'), score: s.scoreAfter });
    }
    for (const d of store.diagnostics) list.push({ at: d.at, label: t('kindDiagnostic'), score: d.score });
    return list.filter((p) => new Date(p.at).getTime() >= cutoff).sort((a, b) => a.at.localeCompare(b.at));
  }, [store.sessions, store.diagnostics, period, t]);

  const series = points.map((p) => ({
    day: formatDate(p.at),
    total: p.score.total,
    consistency: pct(p.score.consistency, 30),
    evidence: pct(p.score.evidence, 40),
    defense: pct(p.score.defense, 30),
  }));

  const avgs = AXES.map((ax) => {
    const mean = points.length ? points.reduce((a, p) => a + p.score[ax.key], 0) / points.length : 0;
    return { ...ax, ratio: points.length ? mean / ax.max : 0, mean };
  });
  const bars = avgs.map((a) => ({ name: t(a.labelKey), value: Math.round(a.ratio * 100) }));
  const delta = avgDelta(store.sessions);

  const strengths = avgs.filter((a) => a.ratio >= 0.7).map((a) => t(ADVICE[a.key].strong));
  const improves = avgs.filter((a) => a.ratio < 0.55).map((a) => t(ADVICE[a.key].weak));
  if (delta !== null && delta > 0) strengths.push(t('deltaUp', { n: Math.round(delta) }));
  if (delta !== null && delta <= 0) improves.push(t('deltaFlat'));

  const feedback = [
    { type: 'strong', title: t('strengths'), color: sem.win, items: strengths },
    { type: 'weak', title: t('improvements'), color: sem.warning, items: improves },
  ];

  return (
    <DashboardLayout title={t('title')} titleEn={t('titleEn')}>
      <FocusStyle />
      <div style={{ display: 'grid', gap: 20, maxWidth: 1080 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ margin: 0, fontFamily: mono, fontSize: 11, color: T.creamMid }}>{t('aiNote')}</p>
          <div role="group" aria-label={t('periodAria')} style={{ display: 'flex', gap: 6 }}>
            {PERIODS.map((p) => (
              <button key={p.v} type="button" className="lg-btn" aria-pressed={period === p.v} onClick={() => setPeriod(p.v)}
                style={{ ...btnGhost, padding: '6px 12px', fontSize: 10, textTransform: 'none', backgroundColor: period === p.v ? T.cream : 'transparent', color: period === p.v ? 'var(--l-on-fg)' : T.cream }}>
                {t(p.label)}
              </button>
            ))}
          </div>
        </div>

        {points.length === 0 ? (
          <div style={{ ...panelStyle, display: 'grid', gap: 12 }}>
            <p style={{ margin: 0, fontFamily: serif, fontSize: 18, color: T.cream }}>{t('emptyTitle')}</p>
            <p style={{ margin: 0, fontSize: 13, color: T.creamMid, lineHeight: 1.7 }}>{t('emptyBody')}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="lg-btn" style={btnPrimary} onClick={() => navigate('/dashboard/argue')}>{t('toArgue')}</button>
              <button type="button" className="lg-btn" style={btnGhost} onClick={() => navigate('/dashboard/session')}>{t('toSession')}</button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
              <div style={{ ...panelStyle, display: 'grid', gap: 10 }}>
                <Label>{t('trendLabel')}</Label>
                {points.length < 2 ? (
                  <p style={{ margin: 0, fontSize: 13, color: T.creamMid }}>{t('needTwo')}</p>
                ) : (
                  <div style={{ height: 220 }} role="img" aria-label={t('trendAria')}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={series} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
                        <CartesianGrid stroke={T.border} vertical={false} />
                        <XAxis dataKey="day" tick={tick} axisLine={false} tickLine={false} />
                        <YAxis domain={[0, 100]} tick={tick} axisLine={false} tickLine={false} width={40} />
                        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: T.creamMid }} itemStyle={{ color: T.cream }} />
                        <Line type="monotone" dataKey="consistency" name={t('serConsistency')} stroke={T.accent} strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="evidence" name={t('serEvidence')} stroke={sem.info} strokeWidth={2} dot={false} strokeDasharray="5 3" />
                        <Line type="monotone" dataKey="defense" name={t('serDefense')} stroke={T.amber} strokeWidth={2} dot={false} strokeDasharray="1 3" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontFamily: mono, fontSize: 10, color: T.creamMid }}>
                  <span>{t('legendSolid')}</span><span>{t('legendDashed')}</span><span>{t('legendDotted')}</span>
                </div>
              </div>
              <div style={{ ...panelStyle, display: 'grid', gap: 10 }}>
                <Label>{t('avgLabel')}</Label>
                <div style={{ height: 220 }} role="img" aria-label={bars.map((b) => `${b.name} ${b.value}%`).join(', ')}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={bars} layout="vertical" margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
                      <CartesianGrid stroke={T.border} horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tick={tick} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" tick={tick} axisLine={false} tickLine={false} width={96} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: T.faint }} itemStyle={{ color: T.cream }} formatter={(v: number) => [`${v}%`, t('avgName')]} />
                      <Bar dataKey="value" barSize={14}>
                        {bars.map((b) => <Cell key={b.name} fill={T.accent} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <span style={{ fontFamily: mono, fontSize: 10, color: T.creamMid }}>{t('basedOn', { n: points.length })}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
              {feedback.map((f) => (
                <div key={f.type} style={{ ...panelStyle, display: 'grid', gap: 10, borderTop: `2px solid ${f.color}` }}>
                  <Label>{f.title}</Label>
                  {f.items.length === 0 ? (
                    <p style={{ margin: 0, fontSize: 13, color: T.creamMid }}>{f.type === 'strong' ? t('noStrengths') : t('noWeaknesses')}</p>
                  ) : (
                    <ul style={{ margin: 0, paddingLeft: '1.1em', display: 'grid', gap: 8, fontSize: 13, color: T.cream, lineHeight: 1.7 }}>
                      {f.items.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
