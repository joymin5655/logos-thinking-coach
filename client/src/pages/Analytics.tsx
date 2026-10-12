/*
 * Analytics.tsx — LOGOS 논리력 분석
 * 세션 최종 정리와 진단의 루브릭 점수(AI 추정치)를 시간순으로 본다. 강점·개선은 평균에서 규칙으로 계산한다.
 */
import { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import DashboardLayout from '@/components/DashboardLayout';
import { T, mono, serif, Label, btnPrimary, btnGhost, panelStyle, FocusStyle, AXES } from '@/components/logos-ui';
import { SEMANTIC } from '@/lib/colors';
import { avgDelta, useStore, type Score } from '@/lib/store';

type Period = 'week' | 'month' | 'all';
const PERIODS: { v: Period; label: string; days: number }[] = [
  { v: 'week', label: '최근 7일', days: 7 },
  { v: 'month', label: '최근 30일', days: 30 },
  { v: 'all', label: '전체', days: 36500 },
];
const pct = (v: number, max: number) => Math.round((v / max) * 100);
const tooltipStyle = { backgroundColor: T.black, border: `1px solid ${T.borderMid}`, fontFamily: 'Space Mono', fontSize: 11 };
const tick = { fontFamily: 'Space Mono', fontSize: 10, fill: T.creamMid };

const ADVICE: Record<(typeof AXES)[number]['key'], { strong: string; weak: string }> = {
  consistency: { strong: '말하는 도중 전제가 흔들리지 않고 일관돼요.', weak: '대화 중간에 기준이 바뀌는 경우가 있어요. 처음 정한 기준을 끝까지 쓰고 있는지 확인해 보세요.' },
  evidence: { strong: '숫자·사례처럼 구체적인 근거를 잘 들어요.', weak: '근거가 일반론에 머무는 경우가 많아요. 직접 겪은 사례나 숫자 하나를 붙여 보세요.' },
  defense: { strong: '반대 사례를 스스로 떠올려 방어해요.', weak: '반론을 스스로 떠올리는 연습이 필요해요. "이 말이 틀리려면?"을 한 번 물어 보세요.' },
};

export default function Analytics() {
  const [, navigate] = useLocation();
  const store = useStore();
  const [period, setPeriod] = useState<Period>('month');

  const points = useMemo(() => {
    const cutoff = Date.now() - PERIODS.find((p) => p.v === period)!.days * 86_400_000;
    const list: { at: string; label: string; score: Score }[] = [];
    for (const s of store.sessions) {
      if (s.completedAt && s.scoreAfter) list.push({ at: s.completedAt, label: s.kind === 'argue' ? '논증' : '코칭', score: s.scoreAfter });
    }
    for (const d of store.diagnostics) list.push({ at: d.at, label: '진단', score: d.score });
    return list.filter((p) => new Date(p.at).getTime() >= cutoff).sort((a, b) => a.at.localeCompare(b.at));
  }, [store.sessions, store.diagnostics, period]);

  const series = points.map((p) => ({
    day: `${new Date(p.at).getMonth() + 1}/${new Date(p.at).getDate()}`,
    총점: p.score.total,
    일관성: pct(p.score.consistency, 30),
    근거: pct(p.score.evidence, 40),
    방어력: pct(p.score.defense, 30),
  }));

  const avgs = AXES.map((ax) => {
    const mean = points.length ? points.reduce((a, p) => a + p.score[ax.key], 0) / points.length : 0;
    return { ...ax, ratio: points.length ? mean / ax.max : 0, mean };
  });
  const bars = avgs.map((a) => ({ name: a.label, value: Math.round(a.ratio * 100) }));
  const delta = avgDelta(store.sessions);

  const strengths = avgs.filter((a) => a.ratio >= 0.7).map((a) => ADVICE[a.key].strong);
  const improves = avgs.filter((a) => a.ratio < 0.55).map((a) => ADVICE[a.key].weak);
  if (delta !== null && delta > 0) strengths.push(`세션 안에서 평균 ${Math.round(delta)}점 올랐어요. 대화가 생각을 정리하는 데 쓰이고 있어요.`);
  if (delta !== null && delta <= 0) improves.push('세션 뒤 점수가 오르지 않았어요. 최종 정리에 대화에서 찾은 내용을 구체적으로 넣어 보세요.');

  const feedback = [
    { type: '강점', color: SEMANTIC.win, items: strengths },
    { type: '개선 포인트', color: SEMANTIC.warning, items: improves },
  ];

  return (
    <DashboardLayout title="논리력 분석" titleEn="Analytics">
      <FocusStyle />
      <div style={{ display: 'grid', gap: 20, maxWidth: 1080 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ margin: 0, fontFamily: mono, fontSize: 11, color: T.creamMid }}>점수는 모두 AI 추정치예요.</p>
          <div role="group" aria-label="기간" style={{ display: 'flex', gap: 6 }}>
            {PERIODS.map((p) => (
              <button key={p.v} type="button" className="lg-btn" aria-pressed={period === p.v} onClick={() => setPeriod(p.v)}
                style={{ ...btnGhost, padding: '6px 12px', fontSize: 10, textTransform: 'none', backgroundColor: period === p.v ? T.cream : 'transparent', color: period === p.v ? T.black : T.cream }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {points.length === 0 ? (
          <div style={{ ...panelStyle, display: 'grid', gap: 12 }}>
            <p style={{ margin: 0, fontFamily: serif, fontSize: 18, color: T.cream }}>이 기간에는 분석할 기록이 없어요.</p>
            <p style={{ margin: 0, fontSize: 13, color: T.creamMid, lineHeight: 1.7 }}>세션이나 오늘의 논증을 마치면 세 가지 기준(일관성·근거·방어력)으로 변화를 보여 드려요.</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="lg-btn" style={btnPrimary} onClick={() => navigate('/dashboard/argue')}>오늘의 논증</button>
              <button type="button" className="lg-btn" style={btnGhost} onClick={() => navigate('/dashboard/session')}>코칭 세션</button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
              <div style={{ ...panelStyle, display: 'grid', gap: 10 }}>
                <Label>기준별 변화 (만점 대비 %)</Label>
                {points.length < 2 ? (
                  <p style={{ margin: 0, fontSize: 13, color: T.creamMid }}>기록이 2개 이상이면 선이 그려져요.</p>
                ) : (
                  <div style={{ height: 220 }} role="img" aria-label="일관성, 근거, 방어력의 시간별 변화">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={series} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
                        <CartesianGrid stroke="rgba(240,235,224,0.10)" vertical={false} />
                        <XAxis dataKey="day" tick={tick} axisLine={false} tickLine={false} />
                        <YAxis domain={[0, 100]} tick={tick} axisLine={false} tickLine={false} width={40} />
                        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: T.creamMid }} />
                        <Line type="monotone" dataKey="일관성" stroke="#C8C0A8" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="근거" stroke="#4FA8DC" strokeWidth={2} dot={false} strokeDasharray="5 3" />
                        <Line type="monotone" dataKey="방어력" stroke="#E0B84A" strokeWidth={2} dot={false} strokeDasharray="1 3" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontFamily: mono, fontSize: 10, color: T.creamMid }}>
                  <span>실선 일관성</span><span>파선 근거</span><span>점선 방어력</span>
                </div>
              </div>
              <div style={{ ...panelStyle, display: 'grid', gap: 10 }}>
                <Label>기준별 평균 (만점 대비 %)</Label>
                <div style={{ height: 220 }} role="img" aria-label={bars.map((b) => `${b.name} ${b.value}%`).join(', ')}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={bars} layout="vertical" margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
                      <CartesianGrid stroke="rgba(240,235,224,0.10)" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tick={tick} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" tick={tick} axisLine={false} tickLine={false} width={96} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(240,235,224,0.05)' }} formatter={(v: number) => [`${v}%`, '평균']} />
                      <Bar dataKey="value" barSize={14}>
                        {bars.map((b) => <Cell key={b.name} fill={T.accent} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <span style={{ fontFamily: mono, fontSize: 10, color: T.creamMid }}>기록 {points.length}개 기준</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
              {feedback.map((f) => (
                <div key={f.type} style={{ ...panelStyle, display: 'grid', gap: 10, borderTop: `2px solid ${f.color}` }}>
                  <Label>{f.type}</Label>
                  {f.items.length === 0 ? (
                    <p style={{ margin: 0, fontSize: 13, color: T.creamMid }}>{f.type === '강점' ? '아직 뚜렷한 강점이 보이지 않아요. 기록이 쌓이면 알려 드려요.' : '눈에 띄는 약점은 없어요.'}</p>
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
