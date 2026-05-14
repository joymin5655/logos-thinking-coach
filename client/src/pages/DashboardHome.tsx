/*
 * DashboardHome.tsx — LOGOS 홈 대시보드
 * Palette: BLACK #0A0A0A / NEAR_BK #111111 / CREAM #F0EBE0 / CREAM_DIM rgba(240,235,224,0.15)
 * Typography: Space Mono
 */
import { useLocation } from 'wouter';
import DashboardLayout from '@/components/DashboardLayout';
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis } from 'recharts';

const CREAM      = '#F0EBE0';
const CREAM_MID  = 'rgba(240,235,224,0.55)';
const CREAM_DIM  = 'rgba(240,235,224,0.12)';
const CREAM_FAINT= 'rgba(240,235,224,0.06)';
const BLACK      = '#0A0A0A';

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
  { id: 1, topic: '새 프로젝트 방향성에 대한 고민', date: '2026-05-13', score: 82, level: '통합', duration: '23분' },
  { id: 2, topic: '팀 내 갈등 해결 방법',           date: '2026-05-12', score: 74, level: '본질', duration: '18분' },
  { id: 3, topic: '커리어 전환에 대한 불안감',       date: '2026-05-11', score: 68, level: '전제', duration: '31분' },
];

function ScoreRing({ score }: { score: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke={CREAM_DIM} strokeWidth="5" />
        <circle
          cx="50" cy="50" r={radius} fill="none"
          stroke={CREAM} strokeWidth="5"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.23,1,0.32,1)' }}
        />
      </svg>
      <div className="absolute text-center">
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '22px', fontWeight: 700, color: CREAM }}>
          {score}
        </div>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '6px', letterSpacing: '0.25em', textTransform: 'uppercase', color: CREAM_MID }}>
          Score
        </div>
      </div>
    </div>
  );
}

export default function DashboardHome() {
  const [, navigate] = useLocation();

  const cardStyle = {
    borderColor: CREAM_DIM,
    backgroundColor: CREAM_FAINT,
    border: `1px solid ${CREAM_DIM}`,
  };

  return (
    <DashboardLayout title="대시보드" titleEn="Dashboard">
      {/* Welcome */}
      <div className="mb-10">
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '7px', letterSpacing: '0.4em', textTransform: 'uppercase' as const, color: CREAM_MID, marginBottom: '8px' }}>
          Good Morning
        </div>
        <h2 style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontWeight: 600, fontSize: '28px', color: CREAM, letterSpacing: '-0.02em', marginBottom: '6px' }}>
          오늘도 깊이 생각하세요
        </h2>
        <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: CREAM_MID, lineHeight: 1.8 }}>
          일 3회 무료 세션 중 <strong style={{ color: CREAM }}>2회</strong> 남았습니다
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        {[
          { label: '총 세션',    labelEn: 'Total Sessions', value: '24', unit: '회' },
          { label: '평균 스코어', labelEn: 'Avg Score',      value: '74', unit: 'pts' },
          { label: '이번 주 성장',labelEn: 'Weekly Growth',  value: '+12', unit: '%' },
          { label: '연속 참여',  labelEn: 'Streak',          value: '7',  unit: '일' },
        ].map((stat) => (
          <div key={stat.label} className="p-5" style={cardStyle}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '6px', letterSpacing: '0.3em', textTransform: 'uppercase' as const, color: CREAM_MID, marginBottom: '10px' }}>
              {stat.labelEn}
            </div>
            <div className="flex items-baseline gap-1">
              <span style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '28px', fontWeight: 600, color: CREAM }}>
                {stat.value}
              </span>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: CREAM_MID }}>
                {stat.unit}
              </span>
            </div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', color: CREAM_MID, marginTop: '4px' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
        {/* Score Overview */}
        <div className="p-6" style={cardStyle}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '6px', letterSpacing: '0.3em', textTransform: 'uppercase' as const, color: CREAM_MID, marginBottom: '16px' }}>
            Current Score
          </div>
          <div className="flex flex-col items-center py-2">
            <ScoreRing score={82} />
            <div className="mt-5 w-full space-y-2">
              {[
                { label: '논리 구조', value: 85 },
                { label: '일관성',   value: 78 },
                { label: '근거의 질', value: 83 },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '7px', color: CREAM_MID, width: '52px', flexShrink: 0 }}>
                    {item.label}
                  </span>
                  <div className="flex-1 h-px" style={{ backgroundColor: CREAM_DIM }}>
                    <div style={{ width: `${item.value}%`, height: '1px', backgroundColor: CREAM, transition: 'width 1s ease' }} />
                  </div>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '7px', color: CREAM_MID, width: '20px', textAlign: 'right' as const }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Weekly Chart */}
        <div className="p-6 col-span-1 md:col-span-2" style={cardStyle}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '6px', letterSpacing: '0.3em', textTransform: 'uppercase' as const, color: CREAM_MID, marginBottom: '10px' }}>
            Weekly Progress
          </div>
          <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '22px', fontWeight: 600, color: CREAM, marginBottom: '4px' }}>
            이번 주 성장 추이
          </div>
          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', color: CREAM_MID, marginBottom: '20px' }}>
            논리력 스코어 변화
          </p>
          <div style={{ height: 120 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={SCORE_DATA}>
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 8, fill: CREAM_MID, fontFamily: "'Space Mono', monospace" }}
                  axisLine={false} tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1a1a',
                    border: `1px solid ${CREAM_DIM}`,
                    borderRadius: 0,
                    color: CREAM,
                    fontSize: 10,
                    fontFamily: "'Space Mono', monospace",
                  }}
                  labelStyle={{ color: CREAM_MID }}
                />
                <Line
                  type="monotone" dataKey="score"
                  stroke={CREAM} strokeWidth={1.2}
                  dot={{ fill: CREAM, r: 2.5, strokeWidth: 0 }}
                  activeDot={{ r: 4, fill: CREAM }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Quick Start */}
      <div
        className="p-8 mb-10 flex items-center justify-between"
        style={{ backgroundColor: 'rgba(240,235,224,0.05)', border: `1px solid ${CREAM_DIM}` }}
      >
        <div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '6px', letterSpacing: '0.4em', textTransform: 'uppercase' as const, color: CREAM_MID, marginBottom: '8px' }}>
            New Session
          </div>
          <h3 style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '22px', fontWeight: 600, color: CREAM, marginBottom: '6px' }}>
            새로운 생각을 시작하세요
          </h3>
          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: CREAM_MID, lineHeight: 1.8 }}>
            고민을 입력하면 소크라테스가 질문을 던집니다
          </p>
        </div>
        <button
          onClick={() => navigate('/dashboard/session')}
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: '8px',
            letterSpacing: '0.2em',
            textTransform: 'uppercase' as const,
            fontWeight: 700,
            backgroundColor: CREAM,
            color: BLACK,
            border: 'none',
            padding: '12px 28px',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'opacity 0.18s',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.8'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
        >
          세션 시작 →
        </button>
      </div>

      {/* Recent Sessions */}
      <div>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '6px', letterSpacing: '0.4em', textTransform: 'uppercase' as const, color: CREAM_MID, marginBottom: '16px' }}>
          Recent Sessions
        </div>
        <div>
          {RECENT_SESSIONS.map((session, i) => (
            <button
              key={session.id}
              onClick={() => navigate('/dashboard/history')}
              className="w-full flex items-center justify-between py-4 text-left transition-colors"
              style={{ borderTop: `1px solid ${CREAM_DIM}` }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = CREAM_FAINT; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <div className="flex items-center gap-6">
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', color: CREAM_MID, width: '16px', flexShrink: 0 }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', fontWeight: 700, color: CREAM, marginBottom: '3px' }}>
                    {session.topic}
                  </div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '7px', color: CREAM_MID }}>
                    {session.date} · {session.duration} · {session.level} 단계
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '18px', fontWeight: 600, color: CREAM }}>
                  {session.score}
                </div>
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" style={{ opacity: 0.3 }}>
                  <path d="M5 3L9 7L5 11" stroke={CREAM} strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </div>
            </button>
          ))}
          <div style={{ borderTop: `1px solid ${CREAM_DIM}` }} />
        </div>
      </div>
    </DashboardLayout>
  );
}
