/*
 * Arena.tsx — 토론 아레나 (MVP)
 *
 * Flow (per logos_user_flow.md):
 *   B-1 주제 선택 → B-2 입장 설정 (찬성/반대) → B-3 매칭 (AI / 유저)
 *   B-4 토론 진행 → B-5 AI 판정 → B-6 스코어 확인
 *
 * 본 페이지는 B-1 ~ B-3 까지의 진입 UI. 매칭 후 실제 토론 UI는 추후 구현.
 */
import { useEffect, useRef, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { SEMANTIC, scoreColor } from '@/lib/colors';

const CREAM       = '#F0EBE0';
const CREAM_MID   = 'rgba(240,235,224,0.55)';
const CREAM_DIM   = 'rgba(240,235,224,0.15)';
const CREAM_FAINT = 'rgba(240,235,224,0.06)';
const BLACK       = '#0A0A0A';
const ACCENT      = '#C8C0A8';

type Difficulty = '초급' | '중급' | '고급';
type Side = '찬성' | '반대';
type Opponent = 'AI' | 'USER';

type Topic = {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  category: string;
  hot?: boolean;
};

const TOPICS: Topic[] = [
  { id: 't1', title: 'AI 시대에 코딩 교육은 여전히 필요한가', description: 'LLM이 코드를 작성하는 시대, 인간 개발자의 가치는?', difficulty: '중급', category: '교육', hot: true },
  { id: 't2', title: '주 4일제는 생산성을 높이는가', description: '근무일 단축의 효과와 한계', difficulty: '초급', category: '사회' },
  { id: 't3', title: '재능과 노력 중 무엇이 더 중요한가', description: '성공의 본질에 대한 고전적 논쟁', difficulty: '초급', category: '철학', hot: true },
  { id: 't4', title: '베이직 인컴은 실현 가능한 정책인가', description: '재원, 인센티브, 사회적 영향', difficulty: '고급', category: '경제' },
  { id: 't5', title: '소셜 미디어는 민주주의에 도움이 되는가', description: '여론 형성과 알고리즘의 양면성', difficulty: '중급', category: '사회' },
  { id: 't6', title: '인간이 화성에 정착해야 하는가', description: '지구 외 거주의 윤리와 우선순위', difficulty: '고급', category: '윤리' },
];

const DIFF_COLOR: Record<Difficulty, string> = {
  '초급': SEMANTIC.info,
  '중급': SEMANTIC.draw,
  '고급': SEMANTIC.lose,
};

// ── 토론 라운드 구조 ──
const ROUNDS = [
  { id: 1, name: '입론',    en: 'Opening',    seconds: 90 },
  { id: 2, name: '반박',    en: 'Rebuttal',   seconds: 60 },
  { id: 3, name: '재반박',  en: 'Counter',    seconds: 60 },
  { id: 4, name: '마무리',  en: 'Closing',    seconds: 45 },
];

type DebateMsg = { round: number; from: 'user' | 'opp'; text: string };

// 라운드별 상대(AI) 응답 — 입장(side)에 따라 반대 입장 응답
function getOppResponse(roundId: number, userSide: Side, topicTitle: string): string {
  const oppSide: Side = userSide === '찬성' ? '반대' : '찬성';
  const lib: Record<number, string[]> = {
    1: [
      `[${oppSide} 입론] 본 주제 "${topicTitle}"에서 핵심은 단순한 호불호가 아니라 구조적 효과입니다. 저는 ${oppSide} 입장에서 세 가지 근거를 제시합니다.`,
      `[${oppSide} 입론] 표면적 직관을 넘어, 실제 데이터와 사례가 어디를 가리키는지 살펴봐야 합니다. ${oppSide}의 핵심 논거를 펼치겠습니다.`,
    ],
    2: [
      `방금 제시하신 ${userSide} 측 근거는 일반화에 가깝습니다. 특수 사례에서 어떻게 작동하는지 짚어보죠.`,
      `${userSide} 측 주장은 단기 효과를 강조하지만, 장기적으로 동일한 결과가 유지된다고 보장할 수 있나요?`,
    ],
    3: [
      `재반박드리겠습니다. 방금 든 반례조차 ${oppSide} 측 입장을 강화하는 결과로 해석할 수 있습니다.`,
      `${userSide} 측 재반박의 전제 자체가 ${oppSide} 입장에서 받아들이기 어렵습니다. 이유는 다음과 같습니다.`,
    ],
    4: [
      `[${oppSide} 마무리] 본 토론은 단순 선호가 아닌 검증 가능한 구조의 문제였습니다. ${oppSide}의 입장에 서는 것이 더 합리적입니다.`,
      `[${oppSide} 마무리] 토론을 정리하면, 핵심 쟁점에서 ${oppSide} 측이 일관성과 근거 양면에서 우위를 점했다고 봅니다.`,
    ],
  };
  const pool = lib[roundId] || ['(상대 응답)'];
  return pool[Math.floor(Math.random() * pool.length)];
}

type Verdict = {
  logic: number; persuasion: number; evidence: number;
  reasons: { metric: string; en: string; reason: string }[];
  rankDelta: number; // ±포인트
};

// AI 판정 — 사용자 입력 품질에 비례한 점수 (mock) + 채점 이유 텍스트
function judge(userMessages: string[]): Verdict {
  const total = userMessages.join(' ');
  const len = total.length;
  const wordRichness = new Set(total.split(/\s+/)).size;
  const evidenceMarkers = (total.match(/예를 들어|첫째|둘째|즉|왜냐하면|근거|데이터|연구|증거/g) || []).length;
  const structureMarkers = (total.match(/따라서|그러므로|결론적으로|반면|하지만|그러나/g) || []).length;
  const base = Math.min(95, 55 + Math.floor(len / 25));
  const logic      = Math.min(98, base + Math.floor(wordRichness / 8) + structureMarkers * 2);
  const persuasion = Math.min(98, base + Math.floor(len / 60));
  const evidence   = Math.min(98, base + evidenceMarkers * 5);

  const logicReason = structureMarkers >= 2
    ? '논리 접속사("따라서", "반면" 등) 사용이 명확해 논증 구조가 잘 드러납니다.'
    : '논증 구조가 다소 흐릿합니다. 전제→근거→결론을 명시적으로 연결해 보세요.';
  const persuasionReason = len >= 300
    ? '주장의 강도와 길이가 균형 잡혀 있어 상대를 압박했습니다.'
    : '주장이 짧아 충분히 설득하지 못했습니다. 한 번 더 끌고 가는 깊이가 필요합니다.';
  const evidenceReason = evidenceMarkers >= 2
    ? '구체 사례·근거 마커("예를 들어", "왜냐하면")가 반복 등장해 주장 신뢰도가 높습니다.'
    : '근거 인용이 부족합니다. 구체 사례·데이터·인용을 한 번 이상 끼워 넣으세요.';

  const avg = (logic + persuasion + evidence) / 3;
  const rankDelta = avg >= 78 ? Math.round((avg - 70) / 2) : avg >= 65 ? -2 : -Math.round((75 - avg) / 2);

  return {
    logic, persuasion, evidence, rankDelta,
    reasons: [
      { metric: '논리성',   en: 'Logic',      reason: logicReason },
      { metric: '설득력',   en: 'Persuasion', reason: persuasionReason },
      { metric: '근거 품질', en: 'Evidence',   reason: evidenceReason },
    ],
  };
}

type Step = 'topic' | 'side' | 'matching' | 'debate' | 'judging' | 'result';

export default function Arena() {
  const [step, setStep] = useState<Step>('topic');
  const [filter, setFilter] = useState<Difficulty | 'all'>('all');
  const [topic, setTopic] = useState<Topic | null>(null);
  const [side, setSide] = useState<Side | null>(null);
  const [opponent, setOpponent] = useState<Opponent>('AI');
  const [roundIdx, setRoundIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [debateMsgs, setDebateMsgs] = useState<DebateMsg[]>([]);
  const [debateInput, setDebateInput] = useState('');
  const [awaitingOpp, setAwaitingOpp] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgEndRef = useRef<HTMLDivElement>(null);

  const currentRound = ROUNDS[roundIdx];
  const visibleTopics = filter === 'all' ? TOPICS : TOPICS.filter((t) => t.difficulty === filter);

  // Auto-advance: matching → debate (1.4s)
  useEffect(() => {
    if (step === 'matching') {
      const t = setTimeout(() => {
        setStep('debate');
        setRoundIdx(0);
        setDebateMsgs([]);
        setTimeLeft(ROUNDS[0].seconds);
      }, 1400);
      return () => clearTimeout(t);
    }
  }, [step]);

  // Round timer
  useEffect(() => {
    if (step !== 'debate') return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [step, roundIdx]);

  // Auto-advance: judging → result (1.8s)
  useEffect(() => {
    if (step === 'judging') {
      const t = setTimeout(() => {
        const userMsgs = debateMsgs.filter((m) => m.from === 'user').map((m) => m.text);
        setVerdict(judge(userMsgs));
        setStep('result');
      }, 1800);
      return () => clearTimeout(t);
    }
  }, [step, debateMsgs]);

  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [debateMsgs]);

  const submitRound = () => {
    if (awaitingOpp || !debateInput.trim() || !side || !topic) return;
    const userText = debateInput.trim();
    setDebateMsgs((prev) => [...prev, { round: currentRound.id, from: 'user', text: userText }]);
    setDebateInput('');
    setAwaitingOpp(true);
    setTimeout(() => {
      setDebateMsgs((prev) => [...prev, { round: currentRound.id, from: 'opp', text: getOppResponse(currentRound.id, side, topic.title) }]);
      setAwaitingOpp(false);
      if (roundIdx < ROUNDS.length - 1) {
        setTimeout(() => {
          setRoundIdx((r) => r + 1);
          setTimeLeft(ROUNDS[roundIdx + 1].seconds);
        }, 700);
      } else {
        setTimeout(() => setStep('judging'), 900);
      }
    }, 1200);
  };

  const resetAll = () => {
    setStep('topic'); setTopic(null); setSide(null); setRoundIdx(0); setDebateMsgs([]); setVerdict(null);
  };

  const handleStartMatching = () => { setStep('matching'); };

  const cardStyle = { border: `1px solid ${CREAM_DIM}`, backgroundColor: CREAM_FAINT };

  const allSteps: Step[] = ['topic', 'side', 'matching', 'debate', 'judging', 'result'];

  return (
    <DashboardLayout title="토론 아레나" titleEn="Arena">
      <div role="note" style={{ display: 'inline-block', marginBottom: 16, fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', color: BLACK, backgroundColor: ACCENT, padding: '5px 12px' }}>
        미리보기 · AI 대전은 준비 중
      </div>
      {/* Steps Indicator */}
      <div className="flex items-center gap-2 mb-5" style={{ opacity: 0.7, flexWrap: 'wrap' as const }}>
        {allSteps.map((s, i) => {
          const curIdx = allSteps.indexOf(step);
          const active = step === s;
          const done = curIdx > i;
          const labels: Record<Step, string> = { topic: 'Topic', side: 'Side', matching: 'Match', debate: 'Debate', judging: 'Judge', result: 'Result' };
          return (
            <div key={s} className="flex items-center gap-2">
              <div
                style={{
                  width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `1px solid ${active || done ? CREAM : CREAM_DIM}`,
                  backgroundColor: done ? CREAM : 'transparent',
                  color: done ? BLACK : CREAM_MID,
                  fontFamily: 'var(--font-mono)', fontSize: 8, fontWeight: 700,
                }}
              >
                {i + 1}
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.25em', textTransform: 'uppercase', color: active ? CREAM : CREAM_MID }}>
                {labels[s]}
              </span>
              {i < allSteps.length - 1 && <div style={{ width: 16, height: 1, backgroundColor: CREAM_DIM }} />}
            </div>
          );
        })}
      </div>

      {/* STEP 1 — 주제 선택 */}
      {step === 'topic' && (
        <>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 600, color: CREAM, marginBottom: 2 }}>
                토론 주제를 선택하세요
              </h3>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: CREAM_MID, letterSpacing: '0.04em' }}>
                AI 또는 다른 유저와 스파링하며 논리를 단련합니다.
              </p>
            </div>
            <div className="flex gap-0">
              {(['all', '초급', '중급', '고급'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    fontFamily: 'var(--font-mono)', fontSize: 7, letterSpacing: '0.22em', textTransform: 'uppercase',
                    padding: '6px 12px',
                    backgroundColor: filter === f ? CREAM : 'transparent',
                    color: filter === f ? BLACK : CREAM_MID,
                    border: `1px solid ${CREAM_DIM}`, cursor: 'pointer', transition: 'all 0.18s',
                  }}
                >
                  {f === 'all' ? 'All' : f}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
            {visibleTopics.map((t) => (
              <button
                key={t.id}
                onClick={() => { setTopic(t); setStep('side'); }}
                className="text-left transition-all duration-200"
                style={{ ...cardStyle, padding: '14px 16px', cursor: 'pointer', color: CREAM }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(240,235,224,0.10)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = CREAM_FAINT; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 6, letterSpacing: '0.3em', textTransform: 'uppercase', color: DIFF_COLOR[t.difficulty] }}>
                    ● {t.difficulty}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 6, letterSpacing: '0.3em', textTransform: 'uppercase', color: CREAM_MID }}>
                    {t.category}
                  </span>
                  {t.hot && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 6, letterSpacing: '0.3em', textTransform: 'uppercase', color: ACCENT, marginLeft: 'auto' }}>
                      🔥 Hot
                    </span>
                  )}
                </div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 14, fontWeight: 600, color: CREAM, lineHeight: 1.25, marginBottom: 4 }}>
                  {t.title}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: CREAM_MID, lineHeight: 1.5 }}>
                  {t.description}
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* STEP 2 — 입장 설정 */}
      {step === 'side' && topic && (
        <>
          <button
            onClick={() => { setStep('topic'); setSide(null); }}
            style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.22em', textTransform: 'uppercase', color: CREAM_MID, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 16 }}
          >
            ← 주제 다시 선택
          </button>

          <div className="p-6 mb-6" style={cardStyle}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, letterSpacing: '0.3em', textTransform: 'uppercase', color: CREAM_MID, marginBottom: 8 }}>Selected Topic</div>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 600, color: CREAM, lineHeight: 1.3, marginBottom: 6 }}>{topic.title}</h3>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: CREAM_MID, lineHeight: 1.7 }}>{topic.description}</p>
          </div>

          <div className="mb-6">
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, letterSpacing: '0.3em', textTransform: 'uppercase', color: CREAM_MID, marginBottom: 12 }}>입장 선택</div>
            <div className="grid grid-cols-2 gap-3">
              {(['찬성', '반대'] as Side[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSide(s)}
                  className="p-6 text-center"
                  style={{
                    border: `1px solid ${side === s ? CREAM : CREAM_DIM}`,
                    backgroundColor: side === s ? 'rgba(240,235,224,0.10)' : CREAM_FAINT,
                    cursor: 'pointer', transition: 'all 0.18s',
                  }}
                >
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 600, color: side === s ? CREAM : CREAM_MID, marginBottom: 4 }}>{s}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, letterSpacing: '0.25em', textTransform: 'uppercase', color: CREAM_MID }}>
                    {s === '찬성' ? 'Affirmative' : 'Negative'}
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setSide(Math.random() < 0.5 ? '찬성' : '반대')}
              style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.22em', textTransform: 'uppercase', color: CREAM_MID, background: 'none', border: 'none', cursor: 'pointer', marginTop: 10 }}
            >
              ⤿ 랜덤 배정
            </button>
          </div>

          <div className="mb-8">
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, letterSpacing: '0.3em', textTransform: 'uppercase', color: CREAM_MID, marginBottom: 12 }}>상대</div>
            <div className="grid grid-cols-2 gap-3">
              {(['AI', 'USER'] as Opponent[]).map((o) => (
                <button
                  key={o}
                  onClick={() => setOpponent(o)}
                  className="p-5 text-left"
                  style={{
                    border: `1px solid ${opponent === o ? CREAM : CREAM_DIM}`,
                    backgroundColor: opponent === o ? 'rgba(240,235,224,0.10)' : CREAM_FAINT,
                    cursor: 'pointer', transition: 'all 0.18s',
                  }}
                >
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, letterSpacing: '0.3em', textTransform: 'uppercase', color: CREAM_MID, marginBottom: 6 }}>
                    {o === 'AI' ? 'AI 상대' : '유저 상대'}
                  </div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 14, fontWeight: 600, color: CREAM, marginBottom: 4 }}>
                    {o === 'AI' ? '즉시 시작' : '실력 기반 매칭'}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: CREAM_MID, lineHeight: 1.6 }}>
                    {o === 'AI' ? '소크라테스 AI와 1:1 스파링' : '비슷한 레벨의 유저와 매칭'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleStartMatching}
            disabled={!side}
            style={{
              width: '100%',
              padding: '14px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700, fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase',
              color: BLACK, backgroundColor: side ? CREAM : CREAM_DIM,
              border: 'none', cursor: side ? 'pointer' : 'not-allowed',
              transition: 'background-color 0.18s',
            }}
            onMouseEnter={(e) => { if (side) e.currentTarget.style.backgroundColor = ACCENT; }}
            onMouseLeave={(e) => { if (side) e.currentTarget.style.backgroundColor = CREAM; }}
          >
            {side ? '매칭 시작' : '입장을 선택하세요'}
          </button>
        </>
      )}

      {/* STEP 3 — 매칭 중 */}
      {step === 'matching' && topic && side && (
        <div className="flex flex-col items-center justify-center" style={{ minHeight: 320 }}>
          <div style={{ width: 64, height: 64, border: `2px solid ${CREAM_DIM}`, borderTopColor: CREAM, borderRadius: '50%', animation: 'spin 1.2s linear infinite', marginBottom: 24 }} />
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.3em', textTransform: 'uppercase', color: CREAM_MID, marginBottom: 8 }}>
            {opponent === 'AI' ? 'AI 매칭 중' : '유저 매칭 대기'}
          </div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 600, color: CREAM, marginBottom: 6 }}>{topic.title}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: CREAM_MID, letterSpacing: '0.1em' }}>입장: {side} · 난이도 {topic.difficulty}</div>
          <button
            onClick={() => setStep('side')}
            style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.22em', textTransform: 'uppercase', color: CREAM_MID, background: 'none', border: `1px solid ${CREAM_DIM}`, padding: '8px 18px', cursor: 'pointer', marginTop: 30 }}
          >
            매칭 취소
          </button>
        </div>
      )}

      {/* STEP 4 — 토론 진행 (B-4) */}
      {step === 'debate' && topic && side && (
        <>
          {/* Round header */}
          <div className="p-4 mb-4" style={cardStyle}>
            <div className="flex items-center justify-between">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 7, letterSpacing: '0.3em', textTransform: 'uppercase', color: CREAM_MID }}>
                  Round {currentRound.id} / {ROUNDS.length}
                </span>
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600, color: CREAM }}>
                  {currentRound.name} <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: CREAM_MID, marginLeft: 6 }}>{currentRound.en}</span>
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 7, letterSpacing: '0.3em', textTransform: 'uppercase', color: CREAM_MID }}>Time</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: timeLeft <= 10 ? '#ef4444' : CREAM, letterSpacing: '0.05em', minWidth: 42, textAlign: 'right' as const }}>
                  {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}
                </span>
              </div>
            </div>
            <div className="mt-3" style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 7, color: CREAM_MID }}>
              <span>주제: {topic.title}</span>
              <span>입장: <strong style={{ color: CREAM }}>{side}</strong> vs {side === '찬성' ? '반대' : '찬성'}</span>
            </div>
          </div>

          {/* Message stream */}
          <div
            className="p-4 mb-4"
            style={{
              ...cardStyle,
              minHeight: 220, maxHeight: 320, overflowY: 'auto' as const,
              display: 'flex', flexDirection: 'column', gap: 12,
            }}
          >
            {debateMsgs.length === 0 && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: CREAM_MID, textAlign: 'center' as const, padding: '40px 0', letterSpacing: '0.1em' }}>
                먼저 입론을 시작하세요.
              </div>
            )}
            {debateMsgs.map((m, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: m.from === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 6, letterSpacing: '0.3em', textTransform: 'uppercase', color: CREAM_MID }}>
                  R{m.round} · {m.from === 'user' ? `YOU (${side})` : `${opponent === 'AI' ? 'AI' : 'OPPONENT'} (${side === '찬성' ? '반대' : '찬성'})`}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)', fontSize: 10, color: CREAM, lineHeight: 1.7,
                    backgroundColor: m.from === 'user' ? 'rgba(240,235,224,0.10)' : CREAM_FAINT,
                    border: `1px solid ${CREAM_DIM}`, padding: '10px 14px', maxWidth: '78%',
                  }}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {awaitingOpp && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: CREAM_MID, letterSpacing: '0.2em' }}>
                {opponent === 'AI' ? 'AI' : 'OPPONENT'} 응답 중...
              </div>
            )}
            <div ref={msgEndRef} />
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <textarea
              value={debateInput}
              onChange={(e) => setDebateInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitRound(); }}
              placeholder={`R${currentRound.id} ${currentRound.name} 입력... (Cmd/Ctrl + Enter 전송)`}
              rows={3}
              style={{
                flex: 1, padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 10, color: CREAM, lineHeight: 1.6,
                backgroundColor: 'transparent', border: `1px solid ${CREAM_DIM}`, outline: 'none', resize: 'none' as const,
              }}
              disabled={awaitingOpp}
            />
            <button
              onClick={submitRound}
              disabled={awaitingOpp || !debateInput.trim()}
              style={{
                width: 100, fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 700,
                backgroundColor: !awaitingOpp && debateInput.trim() ? CREAM : CREAM_DIM,
                color: !awaitingOpp && debateInput.trim() ? BLACK : CREAM_MID,
                border: 'none', cursor: !awaitingOpp && debateInput.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              {roundIdx === ROUNDS.length - 1 ? '제출' : '전송'}
            </button>
          </div>
        </>
      )}

      {/* STEP 5 — AI 판정 (B-5) */}
      {step === 'judging' && (
        <div className="flex flex-col items-center justify-center" style={{ minHeight: 320 }}>
          <div style={{ width: 64, height: 64, border: `2px solid ${CREAM_DIM}`, borderTopColor: ACCENT, borderRadius: '50%', animation: 'spin 1.2s linear infinite', marginBottom: 24 }} />
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.3em', textTransform: 'uppercase', color: CREAM_MID, marginBottom: 8 }}>AI 판정 중</div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600, color: CREAM }}>논리성 · 설득력 · 근거 품질 분석 중...</div>
        </div>
      )}

      {/* STEP 6 — 결과 (B-6) */}
      {step === 'result' && topic && side && verdict && (() => {
        const avg = Math.round((verdict.logic + verdict.persuasion + verdict.evidence) / 3);
        const result: 'WIN' | 'DRAW' | 'LOSE' = avg >= 78 ? 'WIN' : avg >= 65 ? 'DRAW' : 'LOSE';
        const resultColor = result === 'WIN' ? SEMANTIC.win : result === 'DRAW' ? SEMANTIC.draw : SEMANTIC.lose;
        const resultKo = result === 'WIN' ? '승리' : result === 'DRAW' ? '무승부' : '아쉬움';
        return (
          <>
            <div className="p-6 mb-4 text-center" style={cardStyle}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, letterSpacing: '0.3em', textTransform: 'uppercase', color: CREAM_MID, marginBottom: 8 }}>Verdict</div>
              <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 48, color: resultColor, letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 4 }}>{result}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: CREAM_MID, letterSpacing: '0.2em' }}>{resultKo} · 평균 {avg}점</div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { k: '논리성',   en: 'Logic',      v: verdict.logic,      reason: verdict.reasons[0].reason, c: SEMANTIC.win },
                { k: '설득력',   en: 'Persuasion', v: verdict.persuasion, reason: verdict.reasons[1].reason, c: SEMANTIC.draw },
                { k: '근거 품질', en: 'Evidence',   v: verdict.evidence,   reason: verdict.reasons[2].reason, c: SEMANTIC.warning },
              ].map((m) => (
                <div key={m.k} className="p-4" style={cardStyle}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 6, letterSpacing: '0.3em', textTransform: 'uppercase', color: CREAM_MID, marginBottom: 8 }}>{m.en}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
                    <span style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 700, color: scoreColor(m.v) }}>{m.v}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: CREAM_MID }}>/ 100</span>
                  </div>
                  <div style={{ height: 2, backgroundColor: CREAM_DIM, marginBottom: 8 }}>
                    <div style={{ width: `${m.v}%`, height: 2, backgroundColor: m.c, transition: 'width 1s ease' }} />
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: CREAM_MID, marginBottom: 8 }}>{m.k}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: CREAM_MID, lineHeight: 1.6, paddingTop: 8, borderTop: `1px solid ${CREAM_DIM}` }}>
                    {m.reason}
                  </div>
                </div>
              ))}
            </div>

            {/* 랭킹 변동 — Amber 강조 (스펙: "Amber 컬러로 시각화") */}
            <div className="p-4 mb-4 flex items-center justify-between" style={cardStyle}>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, letterSpacing: '0.3em', textTransform: 'uppercase', color: CREAM_MID, marginBottom: 6 }}>Rank Movement</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: CREAM_MID }}>
                  현재 Lv. 5 변증가 — 이번 토론으로 점수가 변동되었습니다.
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: CREAM_MID, letterSpacing: '0.2em' }}>
                  {verdict.rankDelta > 0 ? '획득' : verdict.rankDelta < 0 ? '차감' : '변동 없음'}
                </span>
                <span style={{
                  fontFamily: 'var(--font-serif)', fontSize: 32, fontWeight: 700,
                  color: verdict.rankDelta > 0 ? SEMANTIC.win : verdict.rankDelta < 0 ? SEMANTIC.lose : CREAM_MID,
                  letterSpacing: '-0.02em', lineHeight: 1,
                  textShadow: verdict.rankDelta > 0 ? `0 0 12px ${SEMANTIC.win}66` : undefined,
                }}>
                  {verdict.rankDelta > 0 ? '+' : ''}{verdict.rankDelta}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: CREAM_MID }}>pt</span>
              </div>
            </div>

            <div className="p-4 mb-6" style={cardStyle}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, letterSpacing: '0.3em', textTransform: 'uppercase', color: CREAM_MID, marginBottom: 8 }}>상대 논리에서 배울 점</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: CREAM_MID, lineHeight: 1.8 }}>
                {result === 'WIN'
                  ? '훌륭한 논증이었지만, 상대가 마무리 라운드에서 구사한 "단일 문장 요약" 기법은 향후 응용 가치가 있습니다.'
                  : result === 'DRAW'
                    ? '핵심 쟁점에서 양측이 호각이었습니다. 다음엔 한 가지 강한 사례를 끝까지 끌고 가보세요.'
                    : '상대가 사용한 "전제 분리 → 근거 → 결론" 3단 구조가 효과적이었습니다. 다음 라운드에서 적용해 보세요.'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={resetAll}
                style={{
                  padding: '14px', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase',
                  color: BLACK, backgroundColor: CREAM, border: 'none', cursor: 'pointer', transition: 'background-color 0.18s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = ACCENT; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = CREAM; }}
              >
                다시 토론
              </button>
              <a
                href="/dashboard/history"
                style={{
                  padding: '14px', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase',
                  color: CREAM, backgroundColor: 'transparent', border: `1px solid ${CREAM_DIM}`, cursor: 'pointer', textAlign: 'center' as const, textDecoration: 'none',
                  transition: 'background-color 0.18s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'rgba(240,235,224,0.10)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'transparent'; }}
              >
                기록 보기
              </a>
            </div>
          </>
        );
      })()}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </DashboardLayout>
  );
}
