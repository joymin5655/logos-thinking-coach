/*
 * Analytics.tsx
 * LOGOS Design: 논리력 분석 대시보드
 * - 스코어 변화 추이 그래프
 * - 세부 지표 분석
 * - 개선 피드백
 */
import DashboardLayout from '@/components/DashboardLayout';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, Radar,
  PolarGrid, PolarAngleAxis,
} from 'recharts';
import { useState } from 'react';

const WEEKLY_DATA = [
  { day: '5/7', score: 62, logic: 60, consistency: 65, evidence: 61 },
  { day: '5/8', score: 68, logic: 70, consistency: 66, evidence: 68 },
  { day: '5/9', score: 65, logic: 63, consistency: 68, evidence: 64 },
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
  { subject: '일관성', A: 78, fullMark: 100 },
  { subject: '근거의 질', A: 83, fullMark: 100 },
  { subject: '사고 깊이', A: 76, fullMark: 100 },
  { subject: '통합력', A: 80, fullMark: 100 },
];

const FEEDBACK = [
  {
    type: '강점',
    color: '#1D9E75',
    items: [
      '논리 구조가 명확하게 발전하고 있습니다.',
      '근거 제시 능력이 지난 주 대비 12% 향상되었습니다.',
    ],
  },
  {
    type: '개선 포인트',
    color: '#EF9F27',
    items: [
      '일관성 유지에 더 집중해보세요. 중간에 전제가 바뀌는 경향이 있습니다.',
      '반론을 적극적으로 고려하면 사고 깊이가 더 높아질 수 있습니다.',
    ],
  },
];

export default function Analytics() {
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');

  const tooltipStyle = {
    backgroundColor: '#2C2C1E',
    border: 'none',
    borderRadius: 0,
    color: '#E8E0D0',
    fontSize: 11,
    fontFamily: 'Pretendard Variable, sans-serif',
  };

  return (
    <DashboardLayout title="논리력 분석" titleEn="Analytics">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { label: '현재 스코어', labelEn: 'Current', value: '82', change: '+8', positive: true },
          { label: '최고 스코어', labelEn: 'Best', value: '82', change: '', positive: true },
          { label: '평균 스코어', labelEn: 'Average', value: '72', change: '+4', positive: true },
          { label: '총 세션', labelEn: 'Sessions', value: '24', change: '', positive: true },
        ].map((stat) => (
          <div
            key={stat.label}
            className="p-5 border"
            style={{ borderColor: 'rgba(44,44,30,0.12)', backgroundColor: 'rgba(232,224,208,0.5)' }}
          >
            <div
              className="text-[0.55rem] tracking-[0.3em] uppercase opacity-40 mb-3"
              style={{ fontFamily: 'Pretendard Variable, sans-serif', color: '#2C2C1E' }}
            >
              {stat.labelEn}
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className="text-3xl font-bold"
                style={{ fontFamily: "'Libre Baskerville', Georgia, serif", color: '#2C2C1E' }}
              >
                {stat.value}
              </span>
              {stat.change && (
                <span
                  className="text-xs font-semibold"
                  style={{ color: stat.positive ? '#1D9E75' : '#EF9F27' }}
                >
                  {stat.change}
                </span>
              )}
            </div>
            <div
              className="text-xs opacity-60 mt-1"
              style={{ fontFamily: 'Pretendard Variable, sans-serif', color: '#2C2C1E' }}
            >
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
            className="px-5 py-2 text-xs tracking-[0.2em] uppercase transition-all duration-200"
            style={{
              fontFamily: 'Pretendard Variable, sans-serif',
              backgroundColor: period === p ? '#2C2C1E' : 'transparent',
              color: period === p ? '#E8E0D0' : 'rgba(44,44,30,0.5)',
              border: '1px solid rgba(44,44,30,0.2)',
            }}
          >
            {p === 'weekly' ? '주간' : '월간'}
          </button>
        ))}
      </div>

      {/* Main Chart */}
      <div
        className="p-6 border mb-6"
        style={{ borderColor: 'rgba(44,44,30,0.12)', backgroundColor: 'rgba(232,224,208,0.5)' }}
      >
        <div
          className="text-[0.6rem] tracking-[0.3em] uppercase opacity-40 mb-2"
          style={{ fontFamily: 'Pretendard Variable, sans-serif', color: '#2C2C1E' }}
        >
          Score Trend
        </div>
        <div
          className="text-xl font-bold mb-6"
          style={{ fontFamily: "'Libre Baskerville', Georgia, serif", color: '#2C2C1E' }}
        >
          {period === 'weekly' ? '주간 스코어 변화' : '월간 스코어 변화'}
        </div>
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            {period === 'weekly' ? (
              <LineChart data={WEEKLY_DATA}>
                <CartesianGrid stroke="rgba(44,44,30,0.06)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10, fill: 'rgba(44,44,30,0.4)', fontFamily: 'Pretendard Variable, sans-serif' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[50, 100]}
                  tick={{ fontSize: 10, fill: 'rgba(44,44,30,0.4)', fontFamily: 'Pretendard Variable, sans-serif' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="score" stroke="#EF9F27" strokeWidth={2} dot={{ fill: '#EF9F27', r: 3, strokeWidth: 0 }} name="종합" />
                <Line type="monotone" dataKey="logic" stroke="#534AB7" strokeWidth={1} strokeDasharray="4 2" dot={false} name="논리구조" />
                <Line type="monotone" dataKey="consistency" stroke="#1D9E75" strokeWidth={1} strokeDasharray="4 2" dot={false} name="일관성" />
              </LineChart>
            ) : (
              <BarChart data={MONTHLY_DATA}>
                <CartesianGrid stroke="rgba(44,44,30,0.06)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 10, fill: 'rgba(44,44,30,0.4)', fontFamily: 'Pretendard Variable, sans-serif' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[40, 100]}
                  tick={{ fontSize: 10, fill: 'rgba(44,44,30,0.4)', fontFamily: 'Pretendard Variable, sans-serif' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="score" fill="#EF9F27" radius={[2, 2, 0, 0]} name="스코어" />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Radar Chart */}
        <div
          className="p-6 border"
          style={{ borderColor: 'rgba(44,44,30,0.12)', backgroundColor: 'rgba(232,224,208,0.5)' }}
        >
          <div
            className="text-[0.6rem] tracking-[0.3em] uppercase opacity-40 mb-2"
            style={{ fontFamily: 'Pretendard Variable, sans-serif', color: '#2C2C1E' }}
          >
            Skill Radar
          </div>
          <div
            className="text-lg font-bold mb-4"
            style={{ fontFamily: "'Libre Baskerville', Georgia, serif", color: '#2C2C1E' }}
          >
            역량 분석
          </div>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={RADAR_DATA}>
                <PolarGrid stroke="rgba(44,44,30,0.1)" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fontSize: 10, fill: 'rgba(44,44,30,0.5)', fontFamily: 'Pretendard Variable, sans-serif' }}
                />
                <Radar
                  name="Score"
                  dataKey="A"
                  stroke="#EF9F27"
                  fill="#EF9F27"
                  fillOpacity={0.15}
                  strokeWidth={1.5}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Feedback */}
        <div
          className="p-6 border"
          style={{ borderColor: 'rgba(44,44,30,0.12)', backgroundColor: 'rgba(232,224,208,0.5)' }}
        >
          <div
            className="text-[0.6rem] tracking-[0.3em] uppercase opacity-40 mb-2"
            style={{ fontFamily: 'Pretendard Variable, sans-serif', color: '#2C2C1E' }}
          >
            AI Feedback
          </div>
          <div
            className="text-lg font-bold mb-6"
            style={{ fontFamily: "'Libre Baskerville', Georgia, serif", color: '#2C2C1E' }}
          >
            개선 피드백
          </div>
          <div className="space-y-6">
            {FEEDBACK.map((fb) => (
              <div key={fb.type}>
                <div
                  className="text-[0.6rem] tracking-[0.25em] uppercase mb-3 font-semibold"
                  style={{ fontFamily: 'Pretendard Variable, sans-serif', color: fb.color }}
                >
                  {fb.type}
                </div>
                <ul className="space-y-2">
                  {fb.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span style={{ color: fb.color, marginTop: 2 }}>—</span>
                      <span
                        className="text-xs leading-relaxed opacity-70"
                        style={{ fontFamily: 'Pretendard Variable, sans-serif', color: '#2C2C1E', lineHeight: 1.75 }}
                      >
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
