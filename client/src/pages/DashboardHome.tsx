/*
 * DashboardHome.tsx — LOGOS 홈 대시보드
 * Palette: BLACK #0A0A0A / NEAR_BK #111111 / CREAM #F0EBE0 / CREAM_DIM rgba(240,235,224,0.15)
 * Typography: Space Mono
 */
import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import DashboardLayout from '@/components/DashboardLayout';
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { ALL_FIELDS, MAX_FIELDS, loadFields, saveFields, fieldRankMock, type Field } from '@/lib/preferences';
import { FIELD_COLOR, SEMANTIC, scoreColor, rankColor } from '@/lib/colors';

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

// 랭크 단계 — 레벨 1부터 9까지. 24 세션 = Lv.5 변증가
const RANK_TIERS = [
  { lv: 1, ko: '수련자',   en: 'Novice',       badge: '◇' },
  { lv: 2, ko: '질문자',   en: 'Inquirer',     badge: '◈' },
  { lv: 3, ko: '논증가',   en: 'Reasoner',     badge: '◆' },
  { lv: 4, ko: '회의자',   en: 'Skeptic',      badge: '◉' },
  { lv: 5, ko: '변증가',   en: 'Dialectician', badge: '◎' },
  { lv: 6, ko: '비판자',   en: 'Critic',       badge: '✦' },
  { lv: 7, ko: '해석자',   en: 'Interpreter',  badge: '✧' },
  { lv: 8, ko: '사색가',   en: 'Contemplator', badge: '✪' },
  { lv: 9, ko: '소피스트', en: 'Sophos',       badge: '✯' },
];
const CURRENT_RANK = RANK_TIERS[4];        // Lv. 5
const NEXT_RANK    = RANK_TIERS[5];        // Lv. 6
const RANK_PROGRESS = 64;                  // % to next rank

function ScoreRing({ score }: { score: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const c = scoreColor(score);
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke={CREAM_DIM} strokeWidth="5" />
        <circle
          cx="50" cy="50" r={radius} fill="none"
          stroke={c} strokeWidth="5"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.23,1,0.32,1)' }}
        />
      </svg>
      <div className="absolute text-center">
        <div style={{ fontFamily: "var(--font-mono)", fontSize: '28px', fontWeight: 700, color: c }}>
          {score}
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: '9px', letterSpacing: '0.25em', textTransform: 'uppercase', color: CREAM_MID }}>
          Score
        </div>
      </div>
    </div>
  );
}

export default function DashboardHome() {
  const [, navigate] = useLocation();
  const [fields, setFields] = useState<Field[]>(() => loadFields());
  const [draft, setDraft] = useState<Field[]>([]);

  // 외부 변경(다른 페이지에서 분야 수정 시) 동기화
  useEffect(() => {
    const sync = () => setFields(loadFields());
    window.addEventListener('logos:fields-changed', sync);
    return () => window.removeEventListener('logos:fields-changed', sync);
  }, []);

  const toggleDraft = (f: Field) => {
    setDraft((prev) => {
      if (prev.includes(f)) return prev.filter((x) => x !== f);
      if (prev.length >= MAX_FIELDS) return prev;
      return [...prev, f];
    });
  };

  const commitFields = () => {
    if (draft.length === 0) return;
    saveFields(draft);
    setFields(draft);
    setDraft([]);
  };

  const cardStyle = {
    borderColor: CREAM_DIM,
    backgroundColor: CREAM_FAINT,
    border: `1px solid ${CREAM_DIM}`,
  };

  return (
    <DashboardLayout title="대시보드" titleEn="Dashboard">
      {/* Welcome */}
      <div className="mb-10">
        <div style={{ fontFamily: "var(--font-mono)", fontSize: '10px', letterSpacing: '0.4em', textTransform: 'uppercase' as const, color: CREAM_MID, marginBottom: '8px' }}>
          Good Morning
        </div>
        <h2 style={{ fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: '34px', color: CREAM, letterSpacing: '-0.02em', marginBottom: '6px' }}>
          오늘도 깊이 생각하세요
        </h2>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: '13px', color: CREAM_MID, lineHeight: 1.8 }}>
          일 3회 무료 세션 중 <strong style={{ color: CREAM }}>2회</strong> 남았습니다
        </p>
      </div>

      {/* Field Onboarding — 분야 미선택 시 노출 */}
      {fields.length === 0 && (
        <div className="mb-6 p-5" style={cardStyle}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase' as const, color: CREAM_MID, marginBottom: 6 }}>
            Onboarding · 분야 선택
          </div>
          <h3 style={{ fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: 18, color: CREAM, marginBottom: 6 }}>
            관심 분야를 골라 주세요
          </h3>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: CREAM_MID, lineHeight: 1.7, marginBottom: 16 }}>
            선택한 분야는 오늘의 논증 주제와 분야별 랭킹에 반영됩니다. 최대 {MAX_FIELDS}개.
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            {ALL_FIELDS.map((opt) => {
              const picked = draft.includes(opt.value);
              const atCap  = !picked && draft.length >= MAX_FIELDS;
              return (
                <button
                  key={opt.value}
                  onClick={() => toggleDraft(opt.value)}
                  disabled={atCap}
                  style={{
                    fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase' as const,
                    padding: '8px 14px',
                    border: `1px solid ${picked ? CREAM : CREAM_DIM}`,
                    backgroundColor: picked ? CREAM : 'transparent',
                    color: picked ? BLACK : (atCap ? 'rgba(240,235,224,0.3)' : CREAM_MID),
                    cursor: atCap ? 'not-allowed' : 'pointer', transition: 'all 0.18s',
                  }}
                >
                  {opt.value} <span style={{ opacity: 0.5, fontSize: 7, marginLeft: 4 }}>{opt.en}</span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between">
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: CREAM_MID, letterSpacing: '0.15em' }}>
              {draft.length} / {MAX_FIELDS} 선택됨
            </span>
            <button
              onClick={commitFields}
              disabled={draft.length === 0}
              style={{
                fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase' as const,
                padding: '10px 18px',
                backgroundColor: draft.length > 0 ? CREAM : CREAM_DIM,
                color: draft.length > 0 ? BLACK : CREAM_MID,
                border: 'none', cursor: draft.length > 0 ? 'pointer' : 'not-allowed', transition: 'background-color 0.18s',
              }}
            >
              저장하고 시작
            </button>
          </div>
        </div>
      )}

      {/* Rank Badge */}
      <div className="mb-6 p-5 flex items-center gap-5" style={cardStyle}>
        <div
          style={{
            width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `1px solid ${CREAM_DIM}`, backgroundColor: BLACK, flexShrink: 0,
          }}
        >
          <span style={{ fontFamily: "var(--font-serif)", fontSize: '38px', color: CREAM, lineHeight: 1 }}>{CURRENT_RANK.badge}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '4px' }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase' as const, color: CREAM_MID }}>Rank · Lv. {CURRENT_RANK.lv}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '10px' }}>
            <span style={{ fontFamily: "var(--font-serif)", fontSize: '28px', fontWeight: 600, color: CREAM, letterSpacing: '-0.01em' }}>{CURRENT_RANK.ko}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: '12px', color: CREAM_MID, letterSpacing: '0.1em' }}>{CURRENT_RANK.en}</span>
          </div>
          {/* progress bar */}
          <div style={{ height: 2, backgroundColor: CREAM_DIM, position: 'relative', marginBottom: '6px' }}>
            <div style={{ width: `${RANK_PROGRESS}%`, height: '100%', backgroundColor: rankColor(CURRENT_RANK.lv), transition: 'width 1s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "var(--font-mono)", fontSize: '10px', color: CREAM_MID, letterSpacing: '0.15em' }}>
            <span>{RANK_PROGRESS}% TO NEXT</span>
            <span>NEXT · Lv. {NEXT_RANK.lv} {NEXT_RANK.ko}</span>
          </div>
        </div>
      </div>

      {/* 분야별 랭킹 — 분야 선택된 경우만 노출 */}
      {fields.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div style={{ fontFamily: "var(--font-mono)", fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase' as const, color: CREAM_MID }}>
              분야별 랭킹 · Field Ranks
            </div>
            <button
              onClick={() => { saveFields([]); setDraft([]); }}
              style={{ fontFamily: 'var(--font-mono)', fontSize: 7, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: CREAM_MID, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              분야 재선택
            </button>
          </div>
          <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${Math.min(fields.length, 3)}, 1fr)` }}>
            {fields.map((f, i) => {
              const r = fieldRankMock(f, i);
              return (
                <div key={f} className="p-4" style={cardStyle}>
                  <div className="flex items-baseline justify-between mb-2">
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 7, letterSpacing: '0.3em', textTransform: 'uppercase' as const, color: CREAM_MID }}>
                      {f}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 7, letterSpacing: '0.25em', color: CREAM_MID }}>Lv. {r.lv}</span>
                  </div>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: FIELD_COLOR[f], lineHeight: 1 }}>{r.badge}</span>
                    <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 16, color: CREAM }}>{r.ko}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: CREAM_MID, letterSpacing: '0.1em', marginLeft: 'auto' }}>{r.en}</span>
                  </div>
                  <div style={{ height: 2, backgroundColor: CREAM_DIM, marginBottom: 6 }}>
                    <div style={{ width: `${r.progress}%`, height: 2, backgroundColor: FIELD_COLOR[f], transition: 'width 1s ease' }} />
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: CREAM_MID, letterSpacing: '0.15em' }}>
                    {r.progress}% · NEXT TIER
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        {[
          { label: '총 세션',    labelEn: 'Total Sessions', value: '24', unit: '회',  color: SEMANTIC.info },
          { label: '평균 스코어', labelEn: 'Avg Score',      value: '74', unit: 'pts', color: scoreColor(74) },
          { label: '이번 주 성장',labelEn: 'Weekly Growth',  value: '+12', unit: '%',  color: SEMANTIC.win },
          { label: '연속 참여',  labelEn: 'Streak',          value: '7',  unit: '일',  color: SEMANTIC.insight },
        ].map((stat) => (
          <div key={stat.label} className="p-5" style={cardStyle}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase' as const, color: CREAM_MID, marginBottom: '10px' }}>
              {stat.labelEn}
            </div>
            <div className="flex items-baseline gap-1">
              <span style={{ fontFamily: "var(--font-serif)", fontSize: '34px', fontWeight: 600, color: stat.color }}>
                {stat.value}
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: '12px', color: CREAM_MID }}>
                {stat.unit}
              </span>
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: '11px', color: CREAM_MID, marginTop: '4px' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
        {/* Score Overview */}
        <div className="p-6" style={cardStyle}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase' as const, color: CREAM_MID, marginBottom: '16px' }}>
            Current Score
          </div>
          <div className="flex flex-col items-center py-2">
            <ScoreRing score={82} />
            <div className="mt-5 w-full space-y-2">
              {[
                { label: '논리 구조', value: 85, color: SEMANTIC.win },
                { label: '일관성',   value: 78, color: SEMANTIC.draw },
                { label: '근거의 질', value: 83, color: SEMANTIC.warning },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: '10px', color: CREAM_MID, width: '52px', flexShrink: 0 }}>
                    {item.label}
                  </span>
                  <div className="flex-1" style={{ height: 2, backgroundColor: CREAM_DIM }}>
                    <div style={{ width: `${item.value}%`, height: 2, backgroundColor: item.color, transition: 'width 1s ease' }} />
                  </div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: '10px', color: item.color, width: '20px', textAlign: 'right' as const }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Weekly Chart */}
        <div className="p-6 col-span-1 md:col-span-2" style={cardStyle}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase' as const, color: CREAM_MID, marginBottom: '10px' }}>
            Weekly Progress
          </div>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: '28px', fontWeight: 600, color: CREAM, marginBottom: '4px' }}>
            이번 주 성장 추이
          </div>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: '11px', color: CREAM_MID, marginBottom: '20px' }}>
            논리력 스코어 변화
          </p>
          <div style={{ height: 120 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={SCORE_DATA}>
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 8, fill: CREAM_MID, fontFamily: "var(--font-mono)" }}
                  axisLine={false} tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1a1a',
                    border: `1px solid ${CREAM_DIM}`,
                    borderRadius: 0,
                    color: CREAM,
                    fontSize: 10,
                    fontFamily: "var(--font-mono)",
                  }}
                  labelStyle={{ color: CREAM_MID }}
                />
                <defs>
                  <linearGradient id="weeklyLine" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%"   stopColor={SEMANTIC.warning} />
                    <stop offset="50%"  stopColor={SEMANTIC.draw} />
                    <stop offset="100%" stopColor={SEMANTIC.win} />
                  </linearGradient>
                </defs>
                <Line
                  type="monotone" dataKey="score"
                  stroke="url(#weeklyLine)" strokeWidth={1.6}
                  dot={{ fill: SEMANTIC.draw, r: 2.5, strokeWidth: 0 }}
                  activeDot={{ r: 4, fill: SEMANTIC.insight }}
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
          <div style={{ fontFamily: "var(--font-mono)", fontSize: '9px', letterSpacing: '0.4em', textTransform: 'uppercase' as const, color: CREAM_MID, marginBottom: '8px' }}>
            New Session
          </div>
          <h3 style={{ fontFamily: "var(--font-serif)", fontSize: '28px', fontWeight: 600, color: CREAM, marginBottom: '6px' }}>
            새로운 생각을 시작하세요
          </h3>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: '12px', color: CREAM_MID, lineHeight: 1.8 }}>
            고민을 입력하면 소크라테스가 질문을 던집니다
          </p>
        </div>
        <button
          onClick={() => navigate('/dashboard/session')}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: '11px',
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
        <div style={{ fontFamily: "var(--font-mono)", fontSize: '9px', letterSpacing: '0.4em', textTransform: 'uppercase' as const, color: CREAM_MID, marginBottom: '16px' }}>
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
                <span style={{ fontFamily: "var(--font-mono)", fontSize: '11px', color: CREAM_MID, width: '16px', flexShrink: 0 }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: '13px', fontWeight: 700, color: CREAM, marginBottom: '3px' }}>
                    {session.topic}
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: '10px', color: CREAM_MID }}>
                    {session.date} · {session.duration} · {session.level} 단계
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div style={{ fontFamily: "var(--font-serif)", fontSize: '24px', fontWeight: 600, color: scoreColor(session.score) }}>
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
