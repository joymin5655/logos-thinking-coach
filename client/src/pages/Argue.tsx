/*
 * Argue.tsx — Session 1 · 오늘의 논증
 *
 * Spec (logos_brand_guidelines §6, logos_business_context §9):
 *   - 오늘의 주제를 한 화면에 크고 선명하게
 *   - 입장 선택 3가지 (동의 / 비동의 / 조건부) — 이분법 금지
 *   - AI 반문은 한 번에 하나씩
 *   - 스코어와 포인트는 세션 완료 후에만 보인다
 *
 * Flow: pick → argue (3 라운드 반문) → complete (점수 + 3지표)
 */
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import DashboardLayout from '@/components/DashboardLayout';
import { loadFields } from '@/lib/preferences';
import { SEMANTIC, scoreColor } from '@/lib/colors';

const BLACK       = '#0A0A0A';
const CREAM       = '#F0EBE0';
const CREAM_MID   = 'rgba(240,235,224,0.55)';
const CREAM_DIM   = 'rgba(240,235,224,0.15)';
const CREAM_FAINT = 'rgba(240,235,224,0.06)';
const ACCENT      = '#C8C0A8';

type Position = '동의' | '비동의' | '조건부';

type DailyTopic = {
  id: string;
  title: string;
  category: string;
  context: string;
};

const DAILY_TOPICS: DailyTopic[] = [
  { id: 'd1', title: 'AI가 인간의 창의성을 위협하는가', category: '기술·사회', context: '생성형 AI가 창작 영역에 깊이 침투한 지금, 인간 고유의 창의성은 어떻게 정의되어야 할까요.' },
  { id: 'd2', title: '주 4일제는 생산성을 높이는가', category: '노동',     context: '근무일 단축이 단기 휴식 효과인지, 장기 구조적 변화인지에 대한 논쟁이 진행 중입니다.' },
  { id: 'd3', title: '재능과 노력 중 무엇이 더 중요한가', category: '철학',  context: '성공의 본질에 대한 고전적 논쟁. 어느 쪽이 더 결정적이라고 보십니까.' },
  { id: 'd4', title: '소셜 미디어는 민주주의에 도움이 되는가', category: '사회', context: '연결과 분열, 여론과 알고리즘 — 양면적 영향이 동시에 관찰됩니다.' },
  { id: 'd5', title: '베이직 인컴은 실현 가능한 정책인가', category: '경제',     context: '재원, 인센티브, 사회적 영향. 단순 분배론을 넘어선 시각이 필요합니다.' },
  { id: 'd6', title: '디지털 디톡스는 효과가 있는가', category: '라이프스타일', context: '의지의 문제인지 환경 설계의 문제인지, 논거를 정리해 보세요.' },
  { id: 'd7', title: '평생 직장 개념은 사라졌는가', category: '커리어',         context: '안정성과 유연성의 트레이드오프. 세대별 인식 차이도 고려해야 합니다.' },
];

// 일별 결정적 선택 — 사용자 분야가 있으면 우선 노출, 없으면 전체 풀에서 회전
function todaysTopic(): DailyTopic {
  const d = new Date();
  const dayOfYear = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000);
  const fields = loadFields();
  const pool = fields.length
    ? DAILY_TOPICS.filter((t) => fields.some((f) => t.category.includes(f) || f.includes(t.category)))
    : DAILY_TOPICS;
  const list = pool.length > 0 ? pool : DAILY_TOPICS;
  return list[dayOfYear % list.length];
}

// 입장별 AI 반문 라이브러리 — 같은 입장 내에서도 라운드별 깊이 증가
function counterQuestion(position: Position, round: number, topic: DailyTopic): string {
  const lib: Record<Position, string[]> = {
    '동의': [
      `좋습니다. 그런데 "${topic.title}"에 동의하는 가장 강한 근거는 무엇인가요?`,
      '그 근거가 모든 경우에 적용된다고 확신하시나요? 반례가 있다면 어떻게 처리하시겠어요?',
      '동의의 입장을 한 문장으로 압축해 보세요. 그 한 문장이 모든 반론을 견딜 수 있나요?',
    ],
    '비동의': [
      `좋습니다. 그렇다면 "${topic.title}"에 비동의하는 가장 명확한 이유는 무엇인가요?`,
      '비동의의 근거가 단순히 현 상태 유지를 옹호하는 건 아닌가요? 더 근본적인 이유가 있나요?',
      '비동의 입장의 한계나 약점도 인정해 보세요. 어느 부분에서 흔들릴 수 있나요?',
    ],
    '조건부': [
      `좋습니다. 어떤 조건이 충족되면 동의하고, 어떤 조건이라면 비동의하시겠어요?`,
      '그 조건을 더 구체화해 보세요. 측정 가능한 형태로 표현할 수 있을까요?',
      '조건부 입장은 회피처럼 보일 위험이 있습니다. 왜 명확한 한쪽을 택하지 않는지 변호해 보세요.',
    ],
  };
  return lib[position][Math.min(round, lib[position].length - 1)];
}

type Msg = { from: 'ai' | 'user'; text: string };

const ROUNDS_TOTAL = 3;

// 간단한 채점 (mock) — 길이·어휘 다양성·구조 마커 기반
function scoreSession(userMsgs: string[]): { logic: number; consistency: number; evidence: number } {
  const total = userMsgs.join(' ');
  const len = total.length;
  const richness = new Set(total.split(/\s+/)).size;
  const structureMarkers = (total.match(/따라서|그러므로|반면|하지만|왜냐하면|예를 들어|첫째|둘째/g) || []).length;
  const base = Math.min(92, 56 + Math.floor(len / 22));
  return {
    logic:       Math.min(98, base + structureMarkers * 3),
    consistency: Math.min(98, base + Math.floor(richness / 7)),
    evidence:    Math.min(98, base + Math.floor(len / 70) + structureMarkers * 2),
  };
}

const POSITION_OPTIONS: { value: Position; en: string; desc: string }[] = [
  { value: '동의',   en: 'Agree',          desc: '명제가 옳다고 본다' },
  { value: '비동의', en: 'Disagree',       desc: '명제가 옳지 않다고 본다' },
  { value: '조건부', en: 'Conditional',    desc: '특정 조건 하에서만 옳다고 본다' },
];

export default function Argue() {
  const [, navigate] = useLocation();
  const [phase, setPhase] = useState<'pick' | 'argue' | 'complete'>('pick');
  const [position, setPosition] = useState<Position | null>(null);
  const [topic] = useState<DailyTopic>(todaysTopic());
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [round, setRound] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const cardStyle = { border: `1px solid ${CREAM_DIM}`, backgroundColor: CREAM_FAINT };

  const startArgue = (pos: Position) => {
    setPosition(pos);
    setPhase('argue');
    setIsTyping(true);
    setTimeout(() => {
      setMsgs([{ from: 'ai', text: `"${topic.title}" — ${pos} 입장에서 출발합니다.\n\n왜 그렇게 생각하시는지, 한 가지 핵심 이유부터 말씀해 주세요.` }]);
      setIsTyping(false);
    }, 700);
  };

  const submit = () => {
    if (!input.trim() || isTyping || !position) return;
    const userText = input.trim();
    setMsgs((prev) => [...prev, { from: 'user', text: userText }]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const nextRound = round + 1;
      if (nextRound >= ROUNDS_TOTAL) {
        setMsgs((prev) => [...prev, { from: 'ai', text: '오늘의 논증을 마쳤습니다. 잠시 정리해 드리겠습니다.' }]);
        setIsTyping(false);
        setTimeout(() => setPhase('complete'), 1000);
      } else {
        setMsgs((prev) => [...prev, { from: 'ai', text: counterQuestion(position, nextRound, topic) }]);
        setRound(nextRound);
        setIsTyping(false);
      }
    }, 1200);
  };

  const reset = () => {
    setPhase('pick'); setPosition(null); setMsgs([]); setInput(''); setRound(0);
  };

  // ── PICK ──
  if (phase === 'pick') {
    return (
      <DashboardLayout title="오늘의 논증" titleEn="Daily Argument">
        <div className="mb-3">
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 8, letterSpacing: '0.32em', textTransform: 'uppercase', color: SEMANTIC.draw, marginBottom: 4 }}>
            Daily Practice · 매일 10-20분
          </div>
        </div>
        <div className="mb-8">
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, letterSpacing: '0.4em', textTransform: 'uppercase', color: CREAM_MID, marginBottom: 12 }}>
            Today’s Topic · {topic.category}
          </div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 'clamp(1.8rem, 3.6vw, 2.8rem)', color: CREAM, letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 14 }}>
            {topic.title}
          </h2>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: CREAM_MID, lineHeight: 1.85, maxWidth: 620 }}>
            {topic.context}
          </p>
        </div>

        <div className="mb-4" style={{ fontFamily: 'var(--font-mono)', fontSize: 7, letterSpacing: '0.3em', textTransform: 'uppercase', color: CREAM_MID }}>
          입장 선택 — 한쪽을 고르세요
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
          {POSITION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => startArgue(opt.value)}
              className="p-5 text-left transition-all duration-200"
              style={{ ...cardStyle, cursor: 'pointer', color: CREAM }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(240,235,224,0.10)'; e.currentTarget.style.borderColor = CREAM_MID; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = CREAM_FAINT; e.currentTarget.style.borderColor = CREAM_DIM; }}
            >
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, letterSpacing: '0.3em', textTransform: 'uppercase', color: CREAM_MID, marginBottom: 12 }}>
                {opt.en}
              </div>
              <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 22, color: CREAM, marginBottom: 8 }}>
                {opt.value}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: CREAM_MID, lineHeight: 1.7 }}>
                {opt.desc}
              </div>
            </button>
          ))}
        </div>

        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: CREAM_MID, letterSpacing: '0.1em', borderTop: `1px solid ${CREAM_DIM}`, paddingTop: 14 }}>
          매일 10-20분 · 소크라테스 반문 {ROUNDS_TOTAL}라운드 · 최종 정리는 사용자가 직접 · 스코어는 완료 후에 공개됩니다.
        </div>
      </DashboardLayout>
    );
  }

  // ── ARGUE ──
  if (phase === 'argue') {
    return (
      <DashboardLayout title="오늘의 논증" titleEn="Daily Argument">
        {/* Topic header */}
        <div className="p-4 mb-4 flex items-center justify-between" style={cardStyle}>
          <div style={{ minWidth: 0, flex: 1, paddingRight: 12 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, letterSpacing: '0.3em', textTransform: 'uppercase', color: CREAM_MID, marginBottom: 4 }}>
              Topic · {topic.category}
            </div>
            <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 15, color: CREAM, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
              {topic.title}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 7, letterSpacing: '0.3em', color: CREAM_MID }}>입장</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: CREAM, letterSpacing: '0.05em' }}>{position}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: CREAM_MID, marginLeft: 8 }}>R {round + 1}/{ROUNDS_TOTAL}</span>
          </div>
        </div>

        {/* Message stream */}
        <div
          className="p-4 mb-4"
          style={{
            ...cardStyle,
            minHeight: 280, maxHeight: 420, overflowY: 'auto' as const,
            display: 'flex', flexDirection: 'column', gap: 12,
          }}
        >
          {msgs.map((m, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: m.from === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 6, letterSpacing: '0.3em', textTransform: 'uppercase', color: CREAM_MID }}>
                {m.from === 'user' ? `YOU · ${position}` : 'LOGOS'}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10, color: CREAM, lineHeight: 1.75,
                  backgroundColor: m.from === 'user' ? 'rgba(240,235,224,0.10)' : CREAM_FAINT,
                  border: `1px solid ${CREAM_DIM}`, padding: '10px 14px', maxWidth: '82%', whiteSpace: 'pre-wrap' as const,
                }}
              >
                {m.text}
              </div>
            </div>
          ))}
          {isTyping && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: CREAM_MID, letterSpacing: '0.2em' }}>
              LOGOS 응답 중...
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); }}
            placeholder="당신의 논거를 한 문단으로 적어 주세요... (Cmd/Ctrl + Enter 전송)"
            rows={3}
            disabled={isTyping}
            style={{
              flex: 1, padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 10, color: CREAM, lineHeight: 1.6,
              backgroundColor: 'transparent', border: `1px solid ${CREAM_DIM}`, outline: 'none', resize: 'none' as const,
            }}
          />
          <button
            onClick={submit}
            disabled={isTyping || !input.trim()}
            style={{
              width: 100, fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 700,
              backgroundColor: !isTyping && input.trim() ? CREAM : CREAM_DIM,
              color: !isTyping && input.trim() ? BLACK : CREAM_MID,
              border: 'none', cursor: !isTyping && input.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            전송
          </button>
        </div>

        <div style={{ marginTop: 12, fontFamily: 'var(--font-mono)', fontSize: 8, color: CREAM_MID, letterSpacing: '0.1em' }}>
          스코어는 세션 완료 후에 공개됩니다.
        </div>
      </DashboardLayout>
    );
  }

  // ── COMPLETE ──
  const userTexts = msgs.filter((m) => m.from === 'user').map((m) => m.text);
  const score = scoreSession(userTexts);
  const total = Math.round((score.logic + score.consistency + score.evidence) / 3);

  return (
    <DashboardLayout title="오늘의 논증" titleEn="Daily Argument">
      <div className="p-8 mb-5 text-center" style={cardStyle}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 6, letterSpacing: '0.5em', textTransform: 'uppercase', color: CREAM_MID, marginBottom: 14 }}>
          Session 1 Complete · Daily Argument
        </div>
        <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 56, color: scoreColor(total), lineHeight: 1, marginBottom: 6 }}>
          {total}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.3em', color: CREAM_MID, textTransform: 'uppercase' }}>
          Logic Score
        </div>
        <div style={{ marginTop: 14, fontFamily: 'var(--font-mono)', fontSize: 9, color: CREAM_MID, letterSpacing: '0.05em' }}>
          {position} 입장 · {topic.title}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { k: '논리 구조', en: 'Logic',       v: score.logic,       c: SEMANTIC.win },
          { k: '일관성',     en: 'Consistency', v: score.consistency, c: SEMANTIC.draw },
          { k: '근거의 질',   en: 'Evidence',    v: score.evidence,    c: SEMANTIC.warning },
        ].map((m) => (
          <div key={m.k} className="p-4" style={cardStyle}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 6, letterSpacing: '0.3em', textTransform: 'uppercase', color: CREAM_MID, marginBottom: 8 }}>{m.en}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 700, color: scoreColor(m.v) }}>{m.v}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: CREAM_MID }}>/ 100</span>
            </div>
            <div style={{ height: 2, backgroundColor: CREAM_DIM, marginBottom: 6 }}>
              <div style={{ width: `${m.v}%`, height: 2, backgroundColor: m.c, transition: 'width 1s ease' }} />
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: CREAM_MID }}>{m.k}</div>
          </div>
        ))}
      </div>

      {/* 스트릭 표시 — Amber 강조 (오늘의 논증 = 매일 루틴) */}
      <div className="p-4 mb-5 flex items-center justify-between" style={cardStyle}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, letterSpacing: '0.3em', textTransform: 'uppercase', color: CREAM_MID, marginBottom: 4 }}>Daily Streak</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: CREAM_MID }}>매일 논증을 이어 가면 사고가 루틴이 됩니다.</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 30, color: SEMANTIC.insight, letterSpacing: '-0.02em', textShadow: `0 0 12px ${SEMANTIC.insight}66` }}>8</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: CREAM_MID }}>일 연속</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={reset}
          style={{
            padding: '14px', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase',
            color: CREAM, backgroundColor: 'transparent', border: `1px solid ${CREAM_DIM}`, cursor: 'pointer', transition: 'background-color 0.18s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(240,235,224,0.10)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          다시 보기
        </button>
        <button
          onClick={() => navigate('/dashboard/session')}
          style={{
            padding: '14px', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase',
            color: BLACK, backgroundColor: CREAM, border: 'none', cursor: 'pointer', transition: 'background-color 0.18s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = ACCENT; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = CREAM; }}
        >
          소크라테스 코칭으로
        </button>
      </div>
    </DashboardLayout>
  );
}
