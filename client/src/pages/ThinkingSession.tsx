/*
 * ThinkingSession.tsx
 * LOGOS Design: ElevenLabs 스타일 세션 UI
 * - 좌측: 대화 메인 영역 (넓은 공간, 메시지 스트림)
 * - 우측: 세션 설정/정보 패널 (고정 너비 280px)
 * - 하단: 고정 입력 바 (입력창 + SEND)
 * - 팔레트: 검정(#0A0A0A) + 크림(#F0EBE0), Space Mono
 */
import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import DashboardLayout from '@/components/DashboardLayout';
import { SEMANTIC, scoreColor } from '@/lib/colors';

type Stage = '표면' | '도전' | '핵심' | '통합';
type MessageRole = 'ai' | 'user';

interface Message {
  id: number;
  role: MessageRole;
  content: string;
  stage?: Stage;
  timestamp: string;
}

const STAGES: Stage[] = ['표면', '도전', '핵심', '통합'];
const STAGE_EN: Record<Stage, string> = {
  '표면': 'SURFACE', '도전': 'CHALLENGE', '핵심': 'CORE', '통합': 'SYNTHESIS',
};
const STAGE_DESC: Record<Stage, string> = {
  '표면': '현상과 감정을 탐색합니다',
  '도전': '전제를 흔들어 봅니다',
  '핵심': '진짜 문제를 마주합니다',
  '통합': '통찰을 종합합니다',
};

// 단계별 색 — 깊어질수록 정보(blue) → 주의(ochre) → 중립(gold) → 통찰(green)
const STAGE_COLOR: Record<Stage, string> = {
  '표면': SEMANTIC.info,
  '도전': SEMANTIC.warning,
  '핵심': SEMANTIC.draw,
  '통합': SEMANTIC.win,
};

const STAGE_QUESTIONS: Record<Stage, string[]> = {
  '표면': ['왜 그렇게 생각하세요?', '그 상황에서 가장 불편했던 점은 무엇인가요?', '지금 이 고민이 생긴 계기가 무엇인가요?'],
  '도전': ['그게 항상 사실일까요?', '그 생각의 근거는 무엇인가요?', '다른 관점에서 보면 어떻게 보일까요?'],
  '핵심': ['진짜 문제는 무엇인가요?', '이 상황에서 당신이 진정으로 원하는 것은 무엇인가요?', '이 문제의 핵심에 있는 것은 무엇이라고 생각하세요?'],
  '통합': ['지금 발견한 게 무엇인가요?', '이 대화를 통해 어떤 결론에 도달했나요?', '앞으로 어떤 행동을 취하고 싶으신가요?'],
};

// 압박 강화 모드 — 동일 단계의 더 날카로운 반론/도전 (편도체 하이재킹 시뮬레이션)
const STAGE_QUESTIONS_PRESSURE: Record<Stage, string[]> = {
  '표면': ['그건 단지 감정 아닌가요? 다시 한 번 — 왜 그렇게 생각하세요?', '방금 말씀하신 게 진짜 이유인가요, 아니면 듣기 좋은 답변인가요?', '그 불편함을 한 단어로 정의해보세요. 정말 그 단어가 맞나요?'],
  '도전': ['그 전제가 깨지면 결론도 무너집니다. 깨지지 않을 거라고 어떻게 확신합니까?', '반대 사례 하나만 들어보세요. 단 한 번이라도 떠올라야 합니다.', '그 근거를 모르는 사람이 봐도 같은 결론에 도달할까요?'],
  '핵심': ['지금 답한 게 본질이 맞다면, 왜 아직도 해결되지 않고 있나요?', '본질이라고 말한 것 — 그게 진짜 본질인가요, 회피하기 쉬운 답인가요?', '5년 뒤 이 문제를 돌아봤을 때, 지금의 답이 부끄럽지 않을까요?'],
  '통합': ['그 결론을 내일 아침 누군가에게 설명한다면, 어떻게 단 한 문장으로 말하시겠어요?', '지금 결론에 가장 강하게 반박할 수 있는 사람은 누구이며 뭐라고 할까요?', '이 결론을 행동으로 옮기지 않을 변명이 무엇이 있을까요?'],
};

function getQuestion(stage: Stage, pressure = false): string {
  const q = pressure ? STAGE_QUESTIONS_PRESSURE[stage] : STAGE_QUESTIONS[stage];
  return q[Math.floor(Math.random() * q.length)];
}

// ── Type 자동 분류 ──
// Type A: 확신 없는 주장형 — "아마", "같다", "모르겠"
// Type B: 결정 장애형 — "선택", "결정", "갈등", "둘 중"
// Type C: 논리 오류형 — "당연", "분명", "무조건", "절대"
type TopicType = 'A' | 'B' | 'C';

const TYPE_PATTERNS: Record<TopicType, RegExp[]> = {
  B: [/선택|결정|갈등|고민|어떻게 해야|둘 중|어느 쪽|뭐를|뭘로|할까말까|할지말지/],
  C: [/당연|분명히|무조건|절대|항상|반드시|확실히|모두|모든 사람|누구나/],
  A: [/같다|같아|같은|아마|모르겠|확실하지|불안|걱정|애매|막연/],
};

function classifyTopic(text: string): TopicType {
  for (const t of ['B', 'C', 'A'] as TopicType[]) {
    if (TYPE_PATTERNS[t].some((re) => re.test(text))) return t;
  }
  return 'A'; // 기본값
}

// Type별 도입 멘트 — 사용자에게는 Type 라벨 비공개, 톤만 다름
const TYPE_OPENING: Record<TopicType, (topic: string) => string> = {
  A: (topic) => `"${topic}" — 확신이 완전히 서지 않은 상태이신 것 같습니다.\n천천히, 한 가지씩 짚어가 보겠습니다.`,
  B: (topic) => `"${topic}" — 선택 사이에서 흔들리고 계시군요.\n무엇을 진짜 원하는지부터 같이 정리해 봅시다.`,
  C: (topic) => `"${topic}" — 확신이 강하신 것 같습니다.\n그 확신의 근거를 함께 점검해 보겠습니다.`,
};

const C = {
  black: '#0A0A0A',
  panel: '#111110',
  border: 'rgba(240,235,224,0.10)',
  borderMid: 'rgba(240,235,224,0.18)',
  cream: '#F0EBE0',
  creamMid: 'rgba(240,235,224,0.55)',
  creamDim: 'rgba(240,235,224,0.28)',
  creamFaint: 'rgba(240,235,224,0.05)',
  creamFaint2: 'rgba(240,235,224,0.08)',
};

export default function ThinkingSession() {
  const [, navigate] = useLocation();
  const [phase, setPhase] = useState<'intro' | 'session' | 'complete'>('intro');
  const [topic, setTopic] = useState('');
  const [currentStage, setCurrentStage] = useState<Stage>('표면');
  const [stageIndex, setStageIndex] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [pressureMode, setPressureMode] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [topicType, setTopicType] = useState<TopicType | null>(null);
  const [activeTab, setActiveTab] = useState<'session' | 'history'>('session');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startSession = () => {
    if (!topic.trim()) return;
    const type = classifyTopic(topic);
    setTopicType(type);
    setPhase('session');
    setIsTyping(true);
    setTimeout(() => {
      setMessages([{
        id: 1, role: 'ai',
        content: `${TYPE_OPENING[type](topic)}\n\n${getQuestion('표면')}`,
        stage: '표면',
        timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      }]);
      setIsTyping(false);
    }, 1200);
  };

  const sendMessage = () => {
    if (!inputValue.trim() || isTyping) return;
    const userMsg: Message = {
      id: messages.length + 1, role: 'user', content: inputValue,
      timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);
    const newQC = questionCount + 1;
    setQuestionCount(newQC);
    let nextIdx = stageIndex;
    let nextStage = currentStage;
    if (newQC % 2 === 0 && stageIndex < STAGES.length - 1) {
      nextIdx = stageIndex + 1;
      nextStage = STAGES[nextIdx];
      setStageIndex(nextIdx);
      setCurrentStage(nextStage);
    }
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: prev.length + 1, role: 'ai',
        content: getQuestion(nextStage, pressureMode), stage: nextStage,
        timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      }]);
      setIsTyping(false);
    }, 1500);
  };

  const handleDeepen = () => {
    if (isTyping) return;
    setPressureMode(true);
    setIsTyping(true);
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: prev.length + 1, role: 'ai',
        content: `[압박 강화 모드]\n${getQuestion(currentStage, true)}`,
        stage: currentStage,
        timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      }]);
      setIsTyping(false);
    }, 900);
  };

  // Recovery Logic 시퀀스 — 3 step: 인지(Acknowledge) → 되돌아가기(Anchor) → 재구성(Reconstruct)
  const handleAporia = () => {
    if (isTyping || recoveryMode) return;
    setRecoveryMode(true);
    setPressureMode(false); // 압박 해제

    const stamp = () => new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    const steps = [
      { delay: 600,  text: '[Recovery · 인지]\n막막함을 느끼는 건 자연스러운 일이에요. 잠시 호흡을 가다듬어 봅시다.' },
      { delay: 2000, text: `[Recovery · 되돌아가기]\n조금 전 "${currentStage}" 단계에서 가장 확신했던 한 가지를 떠올려 보세요.\n그 생각, 왜 옳다고 느꼈나요?` },
      { delay: 3800, text: '[Recovery · 재구성]\n방금 떠올린 그 근거를 한 문장으로 요약해 주세요.\n그 한 문장 위에서 다시 출발하겠습니다.' },
    ];

    setIsTyping(true);
    steps.forEach((s, i) => {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: prev.length + 1,
            role: 'ai',
            content: s.text,
            stage: currentStage,
            timestamp: stamp(),
          },
        ]);
        if (i === steps.length - 1) setIsTyping(false);
      }, s.delay);
    });

    // 사용자가 응답 시 자동 일반 모드 복귀
    setTimeout(() => setRecoveryMode(false), steps[steps.length - 1].delay + 200);
  };

  /* ── INTRO ── */
  if (phase === 'intro') {
    return (
      <DashboardLayout title="소크라테스 코칭" titleEn="Coaching">
        {/* 단일 패널 — 콘텐츠 크기 기반 (미니멀 페이지) */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          border: `1px solid ${C.border}`,
          backgroundColor: C.creamFaint2,
        }}>
          {/* 헤더 */}
          <div style={{
            padding: '10px 18px',
            borderBottom: `1px solid ${C.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: '9px', letterSpacing: '0.4em', color: C.creamDim, textTransform: 'uppercase' as const }}>
              SESSION INIT · SOCRATIC METHOD
            </span>
            <div style={{ display: 'flex', gap: '5px' }}>
              {[0, 1, 2].map(i => <div key={i} style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: C.creamFaint, border: `1px solid ${C.border}` }} />)}
            </div>
          </div>

          {/* 본문 */}
          <div style={{ padding: '22px 22px 18px' }}>
            <h2 style={{ fontFamily: "var(--font-serif)", fontSize: '28px', fontWeight: 600, color: C.cream, lineHeight: 1.2, margin: '0 0 8px 0' }}>
              무엇을 생각하고 싶으신가요?
            </h2>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: '11px', color: C.creamDim, lineHeight: 1.85, margin: '0 0 16px 0' }}>
              고민, 아이디어, 결정해야 할 것 — 무엇이든 입력하세요.<br />
              소크라테스의 문답법으로 더 깊이 탐구합니다.
            </p>
            <textarea
              value={topic}
              onChange={e => setTopic(e.target.value.slice(0, 200))}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); startSession(); } }}
              placeholder="예: 커리어를 전환해야 할지 고민됩니다..."
              maxLength={200}
              rows={5}
              style={{
                width: '100%', boxSizing: 'border-box' as const,
                fontFamily: "var(--font-mono)", fontSize: '14px',
                color: C.cream, backgroundColor: 'transparent',
                border: `1px solid ${C.border}`,
                padding: '12px 14px', resize: 'none' as const, outline: 'none',
                lineHeight: 1.7,
                transition: 'border-color 0.2s',
              }}
              onFocus={e => { e.target.style.borderColor = C.borderMid; }}
              onBlur={e => { e.target.style.borderColor = C.border; }}
            />
          </div>

          {/* 푸터 */}
          <div style={{
            padding: '10px 22px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderTop: `1px solid ${C.border}`,
          }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: '9px', color: C.creamDim }}>
              {topic.length} / 200
            </span>
            <button
              onClick={startSession}
              disabled={!topic.trim()}
              style={{
                fontFamily: "var(--font-mono)", fontSize: '10px', fontWeight: 700,
                letterSpacing: '0.25em', textTransform: 'uppercase' as const,
                padding: '8px 24px',
                backgroundColor: topic.trim() ? C.cream : C.creamFaint2,
                color: C.black, border: 'none',
                cursor: topic.trim() ? 'pointer' : 'not-allowed',
                transition: 'all 0.18s',
              }}
              onMouseEnter={e => { if (topic.trim()) e.currentTarget.style.opacity = '0.85'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
            >
              Start Session
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  /* ── COMPLETE ── */
  if (phase === 'complete') {
    return (
      <DashboardLayout title="세션 완료" titleEn="Session Complete">
        <div style={{ display: 'flex', height: 'calc(100vh - 56px)', backgroundColor: C.black, overflow: 'hidden' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '48px 56px', borderRight: `1px solid ${C.border}` }}>
            <div style={{ maxWidth: '480px' }}>
              <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: '10px', letterSpacing: '0.4em', color: SEMANTIC.win, marginBottom: '8px', textTransform: 'uppercase' as const }}>
                ✓ Conviction Reached
              </div>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: '22px', fontWeight: 600, color: C.cream, lineHeight: 1.3, marginBottom: '28px', letterSpacing: '-0.01em' }}>
                납득에 도달했습니다
              </div>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: '80px', fontWeight: 600, color: scoreColor(78), lineHeight: 1, marginBottom: '4px' }}>78</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: '10px', letterSpacing: '0.3em', color: C.creamDim, marginBottom: '40px', textTransform: 'uppercase' as const }}>Logic Score</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', marginBottom: '40px', border: `1px solid ${C.border}` }}>
                {[
                  { label: '논리 구조', en: 'LOGIC',       score: 80, color: SEMANTIC.win },
                  { label: '일관성',   en: 'CONSISTENCY', score: 75, color: SEMANTIC.draw },
                  { label: '근거의 질', en: 'EVIDENCE',    score: 79, color: SEMANTIC.warning },
                ].map((item, i) => (
                  <div key={item.label} style={{ padding: '20px 16px', backgroundColor: C.creamFaint, borderRight: i < 2 ? `1px solid ${C.border}` : 'none' }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: '8px', letterSpacing: '0.3em', color: C.creamDim, marginBottom: '8px', textTransform: 'uppercase' as const }}>{item.en}</div>
                    <div style={{ fontFamily: "var(--font-serif)", fontSize: '34px', fontWeight: 600, color: item.color, marginBottom: '4px' }}>{item.score}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: '10px', color: C.creamMid }}>{item.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => navigate('/dashboard/analytics')}
                  style={{ fontFamily: "var(--font-mono)", fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase' as const, padding: '11px 20px', border: `1px solid ${C.border}`, color: C.creamDim, backgroundColor: 'transparent', cursor: 'pointer', transition: 'all 0.18s', borderRadius: '2px' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = C.creamMid; e.currentTarget.style.color = C.cream; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.creamDim; }}
                >상세 분석</button>
                <button onClick={() => { setPhase('intro'); setTopic(''); setMessages([]); setStageIndex(0); setCurrentStage('표면'); setQuestionCount(0); }}
                  style={{ fontFamily: "var(--font-mono)", fontSize: '10px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' as const, padding: '11px 24px', backgroundColor: C.cream, color: C.black, border: 'none', cursor: 'pointer', transition: 'opacity 0.18s', borderRadius: '2px' }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                >New Session</button>
              </div>
            </div>
          </div>
          <div style={{ width: '280px', flexShrink: 0, backgroundColor: C.panel, padding: '24px 20px', borderLeft: `1px solid ${C.border}` }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: '10px', letterSpacing: '0.3em', color: C.creamDim, textTransform: 'uppercase' as const, marginBottom: '20px' }}>Session Summary</div>
            {[{ label: '총 교환', value: `${messages.length}회` }, { label: '도달 단계', value: STAGE_EN[currentStage] }, { label: '소요 시간', value: '약 15분' }].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: '10px', color: C.creamDim }}>{item.label}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: '11px', fontWeight: 700, color: C.creamMid }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  /* ── SESSION ── */
  return (
    <DashboardLayout title="씽킹 세션" titleEn="Thinking Session">
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)', backgroundColor: C.black, overflow: 'hidden' }}>

        {/* ── 상단 탭 바 ── */}
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', borderBottom: `1px solid ${C.border}`, padding: '0 24px', gap: '0' }}>
          {(['session', 'history'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{
                fontFamily: "var(--font-mono)", fontSize: '11px', letterSpacing: '0.2em',
                textTransform: 'uppercase' as const, padding: '14px 20px',
                color: activeTab === tab ? C.cream : C.creamDim,
                backgroundColor: 'transparent', border: 'none', cursor: 'pointer',
                borderBottom: activeTab === tab ? `2px solid ${C.cream}` : '2px solid transparent',
                marginBottom: '-1px', transition: 'color 0.18s',
              }}
            >{tab === 'session' ? 'Session' : 'History'}</button>
          ))}
          {/* 우측: 주제 표시 */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: '9px', letterSpacing: '0.3em', color: C.creamDim, textTransform: 'uppercase' as const }}>SUBJECT</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: '11px', color: C.creamMid, maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{topic}</span>
          </div>
        </div>

        {/* ── 메인 컨텐츠 ── */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* 좌측: 대화 영역 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: `1px solid ${C.border}` }}>

            {/* 메시지 스트림 */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px', display: 'flex', flexDirection: 'column', gap: '0' }}>
              {messages.map((msg) => {
                const isAI = msg.role === 'ai';
                return (
                  <div key={msg.id} style={{
                    padding: '24px 0',
                    borderBottom: `1px solid ${C.border}`,
                    animation: 'el-fade-in 0.25s ease',
                  }}>
                    {/* 발신자 레이블 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                      <div style={{
                        width: '20px', height: '20px', borderRadius: '50%',
                        backgroundColor: isAI ? C.creamFaint2 : C.creamFaint,
                        border: `1px solid ${isAI ? C.borderMid : C.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: '8px', color: isAI ? C.cream : C.creamDim }}>
                          {isAI ? 'S' : 'U'}
                        </span>
                      </div>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: '10px', letterSpacing: '0.2em', color: isAI ? C.creamMid : C.creamDim, textTransform: 'uppercase' as const }}>
                        {isAI ? 'Socrates' : 'You'}
                      </span>
                      {isAI && msg.stage && (
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: '8px', letterSpacing: '0.25em', color: C.creamDim, textTransform: 'uppercase' as const, padding: '2px 6px', border: `1px solid ${C.border}` }}>
                          {STAGE_EN[msg.stage]}
                        </span>
                      )}
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: '9px', color: C.creamDim, marginLeft: 'auto' }}>{msg.timestamp}</span>
                    </div>
                    {/* 메시지 본문 */}
                    <p style={{
                      fontFamily: isAI ? "var(--font-serif)" : "var(--font-mono)",
                      fontSize: isAI ? '14px' : '11px',
                      color: isAI ? C.cream : C.creamMid,
                      lineHeight: isAI ? 1.9 : 1.75,
                      whiteSpace: 'pre-line' as const,
                      margin: '0 0 0 30px',
                    }}>
                      {msg.content}
                    </p>
                  </div>
                );
              })}

              {/* 타이핑 인디케이터 */}
              {isTyping && (
                <div style={{ padding: '24px 0', borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: C.creamFaint2, border: `1px solid ${C.borderMid}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: '8px', color: C.cream }}>S</span>
                    </div>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: '10px', letterSpacing: '0.2em', color: C.creamMid, textTransform: 'uppercase' as const }}>Socrates</span>
                  </div>
                  <div style={{ display: 'flex', gap: '5px', marginLeft: '30px' }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{ width: '5px', height: '5px', backgroundColor: C.creamDim, borderRadius: '50%', animation: `el-dot 0.9s ease ${i * 0.2}s infinite alternate` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* 하단 입력 바 */}
            <div style={{ flexShrink: 0, borderTop: `1px solid ${C.border}`, backgroundColor: C.panel }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', padding: '16px 24px', gap: '12px' }}>
                <textarea
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="생각을 입력하세요... (Enter로 전송, Shift+Enter 줄바꿈)"
                  rows={2}
                  disabled={isTyping}
                  style={{
                    flex: 1, fontFamily: "var(--font-mono)", fontSize: '13px',
                    color: C.cream, backgroundColor: C.creamFaint2,
                    border: `1px solid ${C.border}`, borderRadius: '2px',
                    padding: '12px 16px', resize: 'none' as const, outline: 'none',
                    lineHeight: 1.7, opacity: isTyping ? 0.5 : 1,
                    transition: 'border-color 0.2s, opacity 0.2s',
                  }}
                  onFocus={e => { e.target.style.borderColor = C.borderMid; }}
                  onBlur={e => { e.target.style.borderColor = C.border; }}
                />
                <button onClick={sendMessage} disabled={!inputValue.trim() || isTyping}
                  style={{
                    fontFamily: "var(--font-mono)", fontSize: '11px', fontWeight: 700,
                    letterSpacing: '0.2em', textTransform: 'uppercase' as const,
                    padding: '12px 24px', height: '52px',
                    backgroundColor: inputValue.trim() && !isTyping ? C.cream : C.creamFaint2,
                    color: C.black, border: 'none', borderRadius: '2px',
                    cursor: inputValue.trim() && !isTyping ? 'pointer' : 'not-allowed',
                    transition: 'all 0.18s', flexShrink: 0,
                  }}
                  onMouseEnter={e => { if (inputValue.trim() && !isTyping) e.currentTarget.style.opacity = '0.85'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                >Send</button>
              </div>
              {/* 하단 상태 바 */}
              <div style={{ padding: '8px 24px 12px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: isTyping ? C.creamDim : '#4ade80', transition: 'background-color 0.3s' }} />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: '9px', letterSpacing: '0.3em', color: C.creamDim, textTransform: 'uppercase' as const }}>{isTyping ? 'Processing' : 'Ready'}</span>
                </div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: '9px', color: C.creamDim }}>{inputValue.length} chars</span>
                {pressureMode && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 8px', border: '1px solid rgba(239,68,68,0.5)', borderRadius: '2px' }}>
                    <div style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: SEMANTIC.lose, animation: 'pulse-dot 1.4s ease-in-out infinite' }} />
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: '9px', letterSpacing: '0.3em', color: SEMANTIC.lose, textTransform: 'uppercase' as const }}>Pressure Mode</span>
                  </div>
                )}
                {recoveryMode && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 8px', border: `1px solid ${C.borderMid}`, borderRadius: '2px', backgroundColor: C.creamFaint }}>
                    <div style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: C.cream, animation: 'pulse-dot 1.4s ease-in-out infinite' }} />
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: '9px', letterSpacing: '0.3em', color: C.cream, textTransform: 'uppercase' as const }}>↶ Recovery</span>
                  </div>
                )}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                  <button onClick={handleDeepen} disabled={isTyping}
                    style={{ fontFamily: "var(--font-mono)", fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase' as const, padding: '4px 10px', border: `1px solid ${pressureMode ? `${SEMANTIC.lose}80` : C.border}`, color: pressureMode ? SEMANTIC.lose : C.creamDim, backgroundColor: 'transparent', cursor: 'pointer', borderRadius: '2px', transition: 'all 0.18s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = pressureMode ? SEMANTIC.lose : C.creamDim; e.currentTarget.style.color = pressureMode ? SEMANTIC.lose : C.creamMid; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = pressureMode ? `${SEMANTIC.lose}80` : C.border; e.currentTarget.style.color = pressureMode ? SEMANTIC.lose : C.creamDim; }}
                    title="압박 강화 모드 — 더 날카로운 반론으로 논리를 단련"
                  >더 파고들어줘</button>
                  <button onClick={handleAporia} disabled={isTyping}
                    style={{ fontFamily: "var(--font-mono)", fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase' as const, padding: '4px 10px', border: `1px solid ${C.border}`, color: C.creamDim, backgroundColor: 'transparent', cursor: 'pointer', borderRadius: '2px', transition: 'all 0.18s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = C.creamDim; e.currentTarget.style.color = C.creamMid; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.creamDim; }}
                  >Stuck?</button>
                  <button onClick={() => setPhase('complete')}
                    style={{ fontFamily: "var(--font-mono)", fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase' as const, padding: '4px 10px', border: `1px solid ${C.border}`, color: C.creamDim, backgroundColor: 'transparent', cursor: 'pointer', borderRadius: '2px', transition: 'all 0.18s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = C.creamDim; e.currentTarget.style.color = C.creamMid; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.creamDim; }}
                  >End Session</button>
                </div>
              </div>
            </div>
          </div>

          {/* 우측 설정 패널 */}
          <div style={{ width: '280px', flexShrink: 0, backgroundColor: C.panel, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

            {/* 현재 스테이지 */}
            <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: '9px', letterSpacing: '0.35em', color: C.creamDim, textTransform: 'uppercase' as const, marginBottom: '12px' }}>Current Stage</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', border: `1px solid ${C.borderMid}`, backgroundColor: C.creamFaint2, borderRadius: '2px' }}>
                <div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: '14px', fontWeight: 700, color: C.cream, letterSpacing: '0.1em', marginBottom: '3px' }}>{currentStage}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: '9px', letterSpacing: '0.2em', color: C.creamDim, textTransform: 'uppercase' as const }}>{STAGE_EN[currentStage]}</div>
                </div>
                <div style={{ fontFamily: "var(--font-serif)", fontSize: '30px', fontWeight: 600, color: C.creamDim }}>0{stageIndex + 1}</div>
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: '10px', color: C.creamDim, lineHeight: 1.6, marginTop: '10px' }}>{STAGE_DESC[currentStage]}</div>
            </div>

            {/* 진행률 */}
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: '9px', letterSpacing: '0.35em', color: C.creamDim, textTransform: 'uppercase' as const, marginBottom: '12px' }}>Progress</div>
              <div style={{ display: 'flex', gap: '3px', marginBottom: '10px' }}>
                {STAGES.map((s, i) => (
                  <div key={s} style={{ flex: 1, height: '3px', backgroundColor: i <= stageIndex ? STAGE_COLOR[s] : C.creamFaint2, transition: 'background-color 0.4s', borderRadius: '1px' }} />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: '9px', color: C.creamDim }}>Stage {stageIndex + 1} / 4</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: '9px', color: C.creamDim }}>{questionCount} exchanges</span>
              </div>
            </div>

            {/* 스테이지 목록 */}
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: '9px', letterSpacing: '0.35em', color: C.creamDim, textTransform: 'uppercase' as const, marginBottom: '12px' }}>Stages</div>
              {STAGES.map((s, i) => {
                const isActive = i === stageIndex;
                const isPast = i < stageIndex;
                return (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 0', borderBottom: i < 3 ? `1px solid ${C.border}` : 'none' }}>
                    <div style={{ width: '16px', height: '16px', border: `1px solid ${isActive ? C.creamMid : C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: isActive ? C.creamFaint2 : 'transparent' }}>
                      {isPast
                        ? <span style={{ color: C.creamDim, fontSize: '10px' }}>✓</span>
                        : <span style={{ fontFamily: "var(--font-mono)", fontSize: '8px', color: isActive ? C.cream : C.creamDim }}>{i + 1}</span>
                      }
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: '10px', fontWeight: isActive ? 700 : 400, color: isPast ? C.creamDim : isActive ? C.cream : C.creamDim, letterSpacing: '0.1em' }}>{s}</span>
                    </div>
                    {isActive && <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: C.cream, animation: 'el-pulse 1.5s ease infinite' }} />}
                  </div>
                );
              })}
            </div>

            {/* 세션 정보 */}
            <div style={{ padding: '16px 20px', marginTop: 'auto' }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: '9px', letterSpacing: '0.35em', color: C.creamDim, textTransform: 'uppercase' as const, marginBottom: '12px' }}>Session Info</div>
              {[{ label: 'Method', value: 'Elenctic' }, { label: 'Messages', value: `${messages.length}` }, { label: 'Status', value: isTyping ? 'Processing' : 'Active' }].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: '9px', color: C.creamDim }}>{item.label}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: '10px', fontWeight: 700, color: C.creamMid }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes el-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes el-dot {
          0% { opacity: 0.2; transform: translateY(0); }
          100% { opacity: 0.8; transform: translateY(-3px); }
        }
        @keyframes el-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </DashboardLayout>
  );
}
