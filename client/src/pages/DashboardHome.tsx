/*
 * DashboardHome.tsx
 * LOGOS Design: 홈 대시보드
 * - 논리력 스코어 링 차트
 * - 최근 세션 목록
 * - 빠른 세션 시작
 * - 성장 추이 미니 차트
 */
import { useLocation } from 'wouter';
import DashboardLayout from '@/components/DashboardLayout';
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis } from 'recharts';

const SCORE_DATA = [
  { day: 'Mon', score: 62 },
  { day: 'Tue', score: 68 },
  { day: 'Wed', score: 65 },
  { day: 'Thu', score: 74 },
  { day: 'Fri', score: 71 },
  { day: 'Sat', score: 79 },
  { day: 'Sun', score: 82 },
];

const RECENT_SESSIONS = [
  {
    id: 1,
    topic: '새 프로젝트 방향성에 대한 고민',
    date: '2026-05-13',
    score: 82,
    level: '통합',
    duration: '23분',
  },
  {
    id: 2,
    topic: '팀 내 갈등 해결 방법',
    date: '2026-05-12',
    score: 74,
    level: '본질',
    duration: '18분',
  },
  {
    id: 3,
    topic: '커리어 전환에 대한 불안감',
    date: '2026-05-11',
    score: 68,
    level: '전제',
    duration: '31분',
  },
];

function ScoreRing({ score }: { score: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle
          cx="50" cy="50" r={radius}
          fill="none"
          stroke="rgba(44,44,30,0.1)"
          strokeWidth="6"
        />
        <circle
          cx="50" cy="50" r={radius}
          fill="none"
          stroke="#EF9F27"
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.23, 1, 0.32, 1)' }}
        />
      </svg>
      <div className="absolute text-center">
        <div
          className="text-2xl font-bold"
          style={{ fontFamily: "'Source Serif 4', Georgia, serif", color: '#1E1E14' }}
        >
          {score}
        </div>
        <div
          className="text-[0.55rem] tracking-[0.2em] uppercase opacity-50"
          style={{ fontFamily: 'DM Sans, sans-serif', color: '#1E1E14' }}
        >
          Score
        </div>
      </div>
    </div>
  );
}

export default function DashboardHome() {
  const [, navigate] = useLocation();

  return (
    <DashboardLayout title="대시보드" titleEn="Dashboard">
      {/* Welcome + Quick Start */}
      <div className="mb-10">
        <div
          className="text-[0.65rem] tracking-[0.4em] uppercase opacity-40 mb-2"
          style={{ fontFamily: 'DM Sans, sans-serif', color: '#1E1E14' }}
        >
          Good Morning
        </div>
        <h2
          className="text-3xl font-bold mb-1"
          style={{ fontFamily: "'Source Serif 4', Georgia, serif", color: '#1E1E14', letterSpacing: '-0.02em' }}
        >
          오늘도 깊이 생각하세요
        </h2>
        <p
          className="text-sm opacity-50"
          style={{ fontFamily: 'DM Sans, sans-serif', color: '#1E1E14', lineHeight: 1.75 }}
        >
          일 3회 무료 세션 중 <strong>2회</strong> 남았습니다
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { label: '총 세션', labelEn: 'Total Sessions', value: '24', unit: '회' },
          { label: '평균 스코어', labelEn: 'Avg Score', value: '74', unit: 'pts' },
          { label: '이번 주 성장', labelEn: 'Weekly Growth', value: '+12', unit: '%' },
          { label: '연속 참여', labelEn: 'Streak', value: '7', unit: '일' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="p-5 border"
            style={{ borderColor: 'rgba(44,44,30,0.12)', backgroundColor: 'rgba(232,224,208,0.5)' }}
          >
            <div
              className="text-[0.55rem] tracking-[0.3em] uppercase opacity-40 mb-3"
              style={{ fontFamily: 'DM Sans, sans-serif', color: '#1E1E14' }}
            >
              {stat.labelEn}
            </div>
            <div className="flex items-baseline gap-1">
              <span
                className="text-3xl font-bold"
                style={{ fontFamily: "'Source Serif 4', Georgia, serif", color: '#1E1E14' }}
              >
                {stat.value}
              </span>
              <span
                className="text-xs opacity-50"
                style={{ fontFamily: 'DM Sans, sans-serif', color: '#1E1E14' }}
              >
                {stat.unit}
              </span>
            </div>
            <div
              className="text-xs opacity-60 mt-1"
              style={{ fontFamily: 'DM Sans, sans-serif', color: '#1E1E14' }}
            >
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {/* Score Overview */}
        <div
          className="p-6 border"
          style={{ borderColor: 'rgba(44,44,30,0.12)', backgroundColor: 'rgba(232,224,208,0.5)' }}
        >
          <div
            className="text-[0.6rem] tracking-[0.3em] uppercase opacity-40 mb-4"
            style={{ fontFamily: 'DM Sans, sans-serif', color: '#1E1E14' }}
          >
            Current Score
          </div>
          <div className="flex flex-col items-center py-4">
            <ScoreRing score={82} />
            <div className="mt-4 w-full space-y-2">
              {[
                { label: '논리 구조', value: 85 },
                { label: '일관성', value: 78 },
                { label: '근거의 질', value: 83 },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <span
                    className="text-[0.6rem] w-16 opacity-60"
                    style={{ fontFamily: 'DM Sans, sans-serif', color: '#1E1E14' }}
                  >
                    {item.label}
                  </span>
                  <div className="flex-1 h-1 rounded-full" style={{ backgroundColor: 'rgba(44,44,30,0.1)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${item.value}%`, backgroundColor: '#EF9F27', transition: 'width 1s ease' }}
                    />
                  </div>
                  <span
                    className="text-[0.6rem] opacity-60 w-6 text-right"
                    style={{ fontFamily: 'DM Sans, sans-serif', color: '#1E1E14' }}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Weekly Chart */}
        <div
          className="p-6 border col-span-1 md:col-span-2"
          style={{ borderColor: 'rgba(44,44,30,0.12)', backgroundColor: 'rgba(232,224,208,0.5)' }}
        >
          <div
            className="text-[0.6rem] tracking-[0.3em] uppercase opacity-40 mb-4"
            style={{ fontFamily: 'DM Sans, sans-serif', color: '#1E1E14' }}
          >
            Weekly Progress
          </div>
          <div
            className="text-2xl font-bold mb-1"
            style={{ fontFamily: "'Source Serif 4', Georgia, serif", color: '#1E1E14' }}
          >
            이번 주 성장 추이
          </div>
          <p
            className="text-xs opacity-50 mb-6"
            style={{ fontFamily: 'DM Sans, sans-serif', color: '#1E1E14' }}
          >
            논리력 스코어 변화
          </p>
          <div style={{ height: 120 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={SCORE_DATA}>
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10, fill: 'rgba(44,44,30,0.4)', fontFamily: 'DM Sans, sans-serif' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E1E14',
                    border: 'none',
                    borderRadius: 0,
                    color: '#C5C9B4',
                    fontSize: 11,
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                  labelStyle={{ color: 'rgba(232,224,208,0.6)' }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#EF9F27"
                  strokeWidth={1.5}
                  dot={{ fill: '#EF9F27', r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#EF9F27' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Quick Start */}
      <div
        className="p-8 mb-10 flex items-center justify-between"
        style={{ backgroundColor: '#1E1E14' }}
      >
        <div>
          <div
            className="text-[0.6rem] tracking-[0.35em] uppercase opacity-40 mb-2"
            style={{ fontFamily: 'DM Sans, sans-serif', color: '#C5C9B4' }}
          >
            New Session
          </div>
          <h3
            className="text-2xl font-bold mb-2"
            style={{ fontFamily: "'Source Serif 4', Georgia, serif", color: '#C5C9B4' }}
          >
            새로운 생각을 시작하세요
          </h3>
          <p
            className="text-sm opacity-60"
            style={{ fontFamily: 'DM Sans, sans-serif', color: '#C5C9B4', lineHeight: 1.75 }}
          >
            고민을 입력하면 소크라테스가 질문을 던집니다
          </p>
        </div>
        <button
          onClick={() => navigate('/dashboard/session')}
          className="px-8 py-4 text-sm tracking-[0.2em] uppercase font-semibold shrink-0 transition-all duration-200"
          style={{
            fontFamily: 'DM Sans, sans-serif',
            backgroundColor: '#EF9F27',
            color: '#1E1E14',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#C5C9B4';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#EF9F27';
          }}
        >
          세션 시작 →
        </button>
      </div>

      {/* Recent Sessions */}
      <div>
        <div
          className="text-[0.6rem] tracking-[0.35em] uppercase opacity-40 mb-4"
          style={{ fontFamily: 'DM Sans, sans-serif', color: '#1E1E14' }}
        >
          Recent Sessions
        </div>
        <div className="space-y-0">
          {RECENT_SESSIONS.map((session, i) => (
            <button
              key={session.id}
              onClick={() => navigate('/dashboard/history')}
              className="w-full flex items-center justify-between py-4 border-t text-left hover:bg-[rgba(44,44,30,0.03)] transition-colors"
              style={{ borderColor: 'rgba(44,44,30,0.12)' }}
            >
              <div className="flex items-center gap-6">
                <span
                  className="text-xs opacity-30 w-4"
                  style={{ fontFamily: 'DM Sans, sans-serif', color: '#1E1E14' }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <div
                    className="text-sm font-semibold mb-0.5"
                    style={{ fontFamily: 'DM Sans, sans-serif', color: '#1E1E14', fontWeight: 600 }}
                  >
                    {session.topic}
                  </div>
                  <div
                    className="text-xs opacity-50"
                    style={{ fontFamily: 'DM Sans, sans-serif', color: '#1E1E14' }}
                  >
                    {session.date} · {session.duration} · {session.level} 단계
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div
                  className="text-lg font-bold"
                  style={{ fontFamily: "'Source Serif 4', Georgia, serif", color: '#EF9F27' }}
                >
                  {session.score}
                </div>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ opacity: 0.3 }}>
                  <path d="M5 3L9 7L5 11" stroke="#1E1E14" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </div>
            </button>
          ))}
          <div
            className="border-t"
            style={{ borderColor: 'rgba(44,44,30,0.12)' }}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
