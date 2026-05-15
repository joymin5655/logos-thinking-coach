/*
 * Analytics.tsx — LOGOS 논리력 분석
 * Palette: BLACK #0A0A0A / CREAM #F0EBE0 / CREAM_MID / CREAM_DIM
 */
import DashboardLayout from '@/components/DashboardLayout';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, Radar,
  PolarGrid, PolarAngleAxis,
} from 'recharts';
import { useState } from 'react';
import { SEMANTIC, scoreColor } from '@/lib/colors';

const CREAM      = '#F0EBE0';
const CREAM_MID  = 'rgba(240,235,224,0.55)';
const CREAM_DIM  = 'rgba(240,235,224,0.12)';
const CREAM_FAINT= 'rgba(240,235,224,0.06)';
const BLACK      = '#0A0A0A';

const WEEKLY_DATA = [
  { day: '5/7',  score: 62, logic: 60, consistency: 65, evidence: 61 },
  { day: '5/8',  score: 68, logic: 70, consistency: 66, evidence: 68 },
  { day: '5/9',  score: 65, logic: 63, consistency: 68, evidence: 64 },
  { day: '5/10', score: 74, logic: 76, consistency: 72, evidence: 74 },
  { day: '5/11', score: 71, logic: 73, consistency: 70, evidence: 70 },
  { day: '5/12', score: 79, logic: 80, consistency: 78, evidence: 79 },
  { day: '5/13', score: 82, logic: 85, consistency: 78, evidence: 83 },
];

const MONTHLY_DATA = [
  { week: '4주차', score: 58 },
  { week: '1주차', score: 63 },
  { week: '2주차', score: 69 },
  { week: '3주차', score: 74 },
  { week: '이번주', score: 82 },
];

const RADAR_DATA = [
  { subject: '논리 구조', A: 85, fullMark: 100 },
  { subject: '일관성',   A: 78, fullMark: 100 },
  { subject: '근거의 질', A: 83, fullMark: 100 },
  { subject: '사고 깊이', A: 76, fullMark: 100 },
  { subject: '통합력',   A: 80, fullMark: 100 },
];

const FEEDBACK = [
  {
    type: '강점',
    color: SEMANTIC.win,
    items: [
      '논리 구조가 명확하게 발전하고 있습니다.',
      '근거 제시 능력이 지난 주 대비 12% 향상되었습니다.',
    ],
  },
  {
    type: '개선 포인트',
    color: SEMANTIC.warning,
    items: [
      '일관성 유지에 더 집중해보세요. 중간에 전제가 바뀌는 경향이 있습니다.',
      '반론을 적극적으로 고려하면 사고 깊이가 더 높아질 수 있습니다.',
    ],
  },
];

export default function Analytics() {
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');

  const cardStyle = {
    border: `1px solid ${CREAM_DIM}`,
    backgroundColor: CREAM_FAINT,
  };

  const tooltipStyle = {
    backgroundColor: '#1a1a1a',
    border: `1px solid ${CREAM_DIM}`,
    borderRadius: 0,
    color: CREAM,
    fontSize: 10,
    fontFamily: "var(--font-mono)",
  };

  const labelStyle = { fontFamily: "var(--font-mono)", fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase' as const, color: CREAM_MID, marginBottom: '8px' };
  const headStyle  = { fontFamily: "var(--font-serif)", fontSize: '26px', fontWeight: 600, color: CREAM, marginBottom: '4px' };

  return (
    <DashboardLayout title="논리력 분석" titleEn="Analytics">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        {[
          { label: '현재 스코어', labelEn: 'Current',  value: '82', change: '+8',  color: scoreColor(82) },
          { label: '최고 스코어', labelEn: 'Best',     value: '82', change: '',    color: SEMANTIC.insight },
          { label: '평균 스코어', labelEn: 'Average',  value: '72', change: '+4',  color: scoreColor(72) },
          { label: '총 세션',    labelEn: 'Sessions', value: '24', change: '',    color: SEMANTIC.info },
        ].map((stat) => (
          <div key={stat.label} className="p-5" style={cardStyle}>
            <div style={labelStyle}>{stat.labelEn}</div>
            <div className="flex items-baseline gap-2">
              <span style={{ fontFamily: "var(--font-serif)", fontSize: '34px', fontWeight: 600, color: stat.color }}>
                {stat.value}
              </span>
              {stat.change && (
                <span style={{ fontFamily: "var(--font-mono)", fontSize: '12px', fontWeight: 700, color: SEMANTIC.win }}>
                  {stat.change}
                </span>
              )}
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: '11px', color: CREAM_MID, marginTop: '4px' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Period Toggle */}
      <div className="flex items-center gap-0 mb-6">
        {(['weekly', 'monthly'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: '11px',
              letterSpacing: '0.2em',
              textTransform: 'uppercase' as const,
              padding: '7px 18px',
              backgroundColor: period === p ? CREAM : 'transparent',
              color: period === p ? BLACK : CREAM_MID,
              border: `1px solid ${CREAM_DIM}`,
              cursor: 'pointer',
              transition: 'all 0.18s',
            }}
          >
            {p === 'weekly' ? '주간' : '월간'}
          </button>
        ))}
      </div>

      {/* Main Chart */}
      <div className="p-6 mb-6" style={cardStyle}>
        <div style={labelStyle}>Score Trend</div>
        <div style={headStyle}>{period === 'weekly' ? '주간 스코어 변화' : '월간 스코어 변화'}</div>
        <div style={{ height: 200, marginTop: '20px' }}>
          <ResponsiveContainer width="100%" height="100%">
            {period === 'weekly' ? (
              <LineChart data={WEEKLY_DATA}>
                <CartesianGrid stroke={CREAM_DIM} strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fontSize: 8, fill: CREAM_MID, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
                <YAxis domain={[50, 100]} tick={{ fontSize: 8, fill: CREAM_MID, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="score"       stroke={SEMANTIC.draw}    strokeWidth={1.8} dot={{ fill: SEMANTIC.draw, r: 2.5, strokeWidth: 0 }} name="종합" />
                <Line type="monotone" dataKey="logic"       stroke={SEMANTIC.win}     strokeWidth={1.2} strokeDasharray="4 2" dot={false} name="논리구조" />
                <Line type="monotone" dataKey="consistency" stroke={SEMANTIC.info}    strokeWidth={1.2} strokeDasharray="4 2" dot={false} name="일관성" />
                <Line type="monotone" dataKey="evidence"    stroke={SEMANTIC.warning} strokeWidth={1.2} strokeDasharray="4 2" dot={false} name="근거" />
              </LineChart>
            ) : (
              <BarChart data={MONTHLY_DATA}>
                <CartesianGrid stroke={CREAM_DIM} strokeDasharray="3 3" />
                <XAxis dataKey="week" tick={{ fontSize: 8, fill: CREAM_MID, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
                <YAxis domain={[40, 100]} tick={{ fontSize: 8, fill: CREAM_MID, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <defs>
                  <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={SEMANTIC.insight} />
                    <stop offset="100%" stopColor={SEMANTIC.draw} />
                  </linearGradient>
                </defs>
                <Bar dataKey="score" fill="url(#barFill)" radius={[1, 1, 0, 0]} name="스코어" />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Radar Chart */}
        <div className="p-6" style={cardStyle}>
          <div style={labelStyle}>Skill Radar</div>
          <div style={headStyle}>역량 분석</div>
          <div style={{ height: 200, marginTop: '16px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={RADAR_DATA}>
                <PolarGrid stroke={CREAM_DIM} />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 8, fill: CREAM_MID, fontFamily: "var(--font-mono)" }} />
                <Radar name="Score" dataKey="A" stroke={SEMANTIC.draw} fill={SEMANTIC.draw} fillOpacity={0.18} strokeWidth={1.5} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Feedback */}
        <div className="p-6" style={cardStyle}>
          <div style={labelStyle}>AI Feedback</div>
          <div style={headStyle}>개선 피드백</div>
          <div className="space-y-6" style={{ marginTop: '16px' }}>
            {FEEDBACK.map((fb) => (
              <div key={fb.type}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: '10px', letterSpacing: '0.25em', textTransform: 'uppercase' as const, color: fb.color, fontWeight: 700, marginBottom: '10px' }}>
                  {fb.type}
                </div>
                <ul className="space-y-2">
                  {fb.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span style={{ color: CREAM_MID, marginTop: 1, flexShrink: 0 }}>—</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: '12px', color: CREAM_MID, lineHeight: 1.8 }}>
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
