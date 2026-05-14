/*
 * ThinkingSession.tsx
 * LOGOS Design: 씽킹 세션 — ARENA 레이아웃
 * - 전체 화면 몰입형 arena 구조
 * - 상단: 스테이지 진행 바 (4단계 열 구조)
 * - 중앙: AI vs USER 대결 구도 (좌/우 분리)
 * - 하단: 고정 입력 콘솔
 * - 검정+크림 팔레트, Space Mono 폰트
 */
import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import DashboardLayout from '@/components/DashboardLayout';

type Stage = '표면' | '전제' | '본질' | '통합';
type MessageRole = 'ai' | 'user';

interface Message {
  id: number;
  role: MessageRole;
  content: string;
  stage?: Stage;
  timestamp: string;
}

const STAGES: Stage[] = ['표면', '전제', '본질', '통합'];
const STAGE_EN: Record<Stage, string> = { '표면': 'SURFACE', '전제': 'PREMISE', '본질': 'ESSENCE', '통합': 'SYNTHESIS' };

const STAGE_QUESTIONS: Record<Stage, string[]> = {
  '표면': [
    '왜 그렇게 생각하세요?',
    '그 상황에서 가장 불편했던 점은 무엇인가요?',
    '지금 이 고민이 생긴 계기가 무엇인가요?',
  ],
  '전제': [
    '그게 항상 사실일까요?',
    '그 생각의 근거는 무엇인가요?',
    '다른 관점에서 보면 어떻게 보일까요?',
  ],
  '본질': [
    '진짜 문제는 무엇인가요?',
    '이 상황에서 당신이 진정으로 원하는 것은 무엇인가요?',
    '이 문제의 핵심에 있는 것은 무엇이라고 생각하세요?',
  ],
  '통합': [
    '지금 발견한 게 무엇인가요?',
    '이 대화를 통해 어떤 결론에 도달했나요?',
    '앞으로 어떤 행동을 취하고 싶으신가요?',
  ],
};

function getQuestion(stage: Stage): string {
  const questions = STAGE_QUESTIONS[stage];
  return questions[Math.floor(Math.random() * questions.length)];
}

const CREAM       = '#F0EBE0';
const CREAM_MID   = 'rgba(240,235,224,0.55)';
const CREAM_DIM   = 'rgba(240,235,224,0.12)';
const CREAM_FAINT = 'rgba(240,235,224,0.05)';
const BLACK       = '#0A0A0A';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const startSession = () => {
    if (!topic.trim()) return;
    setPhase('session');
    setIsTyping(true);
    setTimeout(() => {
      setMessages([{
        id: 1, role: 'ai',
        content: `"${topic}"에 대해 함께 생각해보겠습니다.\n\n${getQuestion('표면')}`,
        stage: '표면',
        timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      }]);
      setIsTyping(false);
    }, 1200);
  };

  const sendMessage = () => {
    if (!inputValue.trim()) return;
    const userMsg: Message = {
      id: messages.length + 1, role: 'user', content: inputValue,
      timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);
    const newQuestionCount = questionCount + 1;
    setQuestionCount(newQuestionCount);
    let nextStageIndex = stageIndex;
    let nextStage = currentStage;
    if (newQuestionCount % 2 === 0 && stageIndex < STAGES.length - 1) {
      nextStageIndex = stageIndex + 1;
      nextStage = STAGES[nextStageIndex];
      setStageIndex(nextStageIndex);
      setCurrentStage(nextStage);
    }
    setTimeout(() => {
      const aiMsg: Message = {
        id: messages.length + 2, role: 'ai',
        content: getQuestion(nextStage), stage: nextStage,
        timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1500);
  };

  const handleAporia = () => {
    setIsTyping(true);
    setTimeout(() => {
      const aMsg: Message = {
        id: messages.length + 1, role: 'ai',
        content: '막막함을 느끼는 건 자연스러운 일이에요. 잠시 돌아가볼까요?\n\n조금 전에 가장 확신했던 부분으로 돌아가서 — 그 생각이 왜 옳다고 느꼈나요?',
        stage: currentStage,
        timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aMsg]);
      setIsTyping(false);
    }, 1000);
  };

  const endSession = () => setPhase('complete');

  /* ── INTRO ── */
  if (phase === 'intro') {
    return (
      <DashboardLayout title="씽킹 세션" titleEn="Thinking Session">
        <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>

          {/* 배경 그리드 라인 */}
          <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(${CREAM_DIM} 1px, transparent 1px), linear-gradient(90deg, ${CREAM_DIM} 1px, transparent 1px)`, backgroundSize: '60px 60px', pointerEvents: 'none' }} />

          {/* 중앙 컨텐츠 */}
          <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '640px', padding: '0 24px' }}>

            {/* 상단 레이블 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: CREAM_DIM }} />
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '7px', letterSpacing: '0.5em', color: CREAM_MID, textTransform: 'uppercase' as const }}>ARENA · SESSION INIT</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: CREAM_DIM }} />
            </div>

            {/* 스테이지 미리보기 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2px', marginBottom: '48px' }}>
              {STAGES.map((s, i) => (
                <div key={s} style={{ padding: '12px 8px', border: `1px solid ${CREAM_DIM}`, textAlign: 'center' as const, backgroundColor: i === 0 ? CREAM_FAINT : 'transparent' }}>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '5px', letterSpacing: '0.3em', color: CREAM_MID, marginBottom: '4px' }}>0{i + 1}</div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', fontWeight: 700, color: i === 0 ? CREAM : CREAM_MID }}>{s}</div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '5px', letterSpacing: '0.2em', color: CREAM_DIM, marginTop: '2px' }}>{STAGE_EN[s]}</div>
                </div>
              ))}
            </div>

            {/* 주제 입력 */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '6px', letterSpacing: '0.4em', color: CREAM_MID, marginBottom: '12px', textTransform: 'uppercase' as const }}>ENTER SUBJECT</div>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); startSession(); } }}
                placeholder="고민, 아이디어, 결정해야 할 것..."
                rows={3}
                style={{
                  width: '100%', boxSizing: 'border-box' as const,
                  fontFamily: "'Space Mono', monospace", fontSize: '11px',
                  color: CREAM, backgroundColor: CREAM_FAINT,
                  border: `1px solid ${CREAM_DIM}`, borderLeft: `3px solid ${CREAM_MID}`,
                  padding: '16px 20px', resize: 'none' as const, outline: 'none',
                  lineHeight: 1.7,
                }}
                onFocus={(e) => { e.target.style.borderLeftColor = CREAM; e.target.style.borderColor = CREAM_MID; }}
                onBlur={(e) => { e.target.style.borderLeftColor = CREAM_MID; e.target.style.borderColor = CREAM_DIM; }}
              />
            </div>

            {/* 시작 버튼 */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button
                onClick={startSession}
                disabled={!topic.trim()}
                style={{
                  fontFamily: "'Space Mono', monospace", fontSize: '8px', fontWeight: 700,
                  letterSpacing: '0.3em', textTransform: 'uppercase' as const,
                  padding: '14px 36px', backgroundColor: topic.trim() ? CREAM : CREAM_DIM,
                  color: BLACK, border: 'none', cursor: topic.trim() ? 'pointer' : 'not-allowed',
                  transition: 'all 0.18s',
                }}
              >
                ENTER ARENA →
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  /* ── COMPLETE ── */
  if (phase === 'complete') {
    return (
      <DashboardLayout title="세션 완료" titleEn="Session Complete">
        <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(${CREAM_DIM} 1px, transparent 1px), linear-gradient(90deg, ${CREAM_DIM} 1px, transparent 1px)`, backgroundSize: '60px 60px', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '560px', padding: '0 24px', textAlign: 'center' as const }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '6px', letterSpacing: '0.5em', color: CREAM_MID, marginBottom: '24px', textTransform: 'uppercase' as const }}>SESSION COMPLETE</div>
            <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '72px', fontWeight: 600, color: CREAM, lineHeight: 1, marginBottom: '4px' }}>78</div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '6px', letterSpacing: '0.4em', color: CREAM_MID, marginBottom: '40px', textTransform: 'uppercase' as const }}>LOGIC SCORE</div>

            {/* 구분선 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: CREAM_DIM }} />
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '6px', letterSpacing: '0.3em', color: CREAM_DIM }}>BREAKDOWN</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: CREAM_DIM }} />
            </div>

            {/* 스코어 카드 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2px', marginBottom: '40px' }}>
              {[{ label: '논리 구조', en: 'LOGIC', score: 80 }, { label: '일관성', en: 'CONSISTENCY', score: 75 }, { label: '근거의 질', en: 'EVIDENCE', score: 79 }].map((item) => (
                <div key={item.label} style={{ padding: '20px 12px', border: `1px solid ${CREAM_DIM}`, backgroundColor: CREAM_FAINT }}>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '5px', letterSpacing: '0.3em', color: CREAM_DIM, marginBottom: '8px' }}>{item.en}</div>
                  <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '28px', fontWeight: 600, color: CREAM, marginBottom: '4px' }}>{item.score}</div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '7px', color: CREAM_MID }}>{item.label}</div>
                </div>
              ))}
            </div>

            {/* 버튼 */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button onClick={() => navigate('/dashboard/analytics')}
                style={{ fontFamily: "'Space Mono', monospace", fontSize: '7px', letterSpacing: '0.2em', textTransform: 'uppercase' as const, padding: '12px 24px', border: `1px solid ${CREAM_DIM}`, color: CREAM_MID, backgroundColor: 'transparent', cursor: 'pointer', transition: 'all 0.18s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = CREAM; e.currentTarget.style.color = CREAM; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = CREAM_DIM; e.currentTarget.style.color = CREAM_MID; }}
              >상세 분석</button>
              <button onClick={() => { setPhase('intro'); setTopic(''); setMessages([]); setStageIndex(0); setCurrentStage('표면'); setQuestionCount(0); }}
                style={{ fontFamily: "'Space Mono', monospace", fontSize: '7px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' as const, padding: '12px 24px', backgroundColor: CREAM, color: BLACK, border: 'none', cursor: 'pointer', transition: 'opacity 0.18s' }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.8'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
              >NEW ARENA</button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  /* ── SESSION (ARENA) ── */
  return (
    <DashboardLayout title="씽킹 세션" titleEn="Thinking Session">
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)', backgroundColor: BLACK, overflow: 'hidden' }}>

        {/* ── 상단 ARENA 헤더 ── */}
        <div style={{ flexShrink: 0, borderBottom: `1px solid ${CREAM_DIM}`, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {STAGES.map((stage, i) => {
            const isActive = i === stageIndex;
            const isPast = i < stageIndex;
            return (
              <div key={stage} style={{
                padding: '10px 16px',
                borderRight: i < 3 ? `1px solid ${CREAM_DIM}` : 'none',
                backgroundColor: isActive ? CREAM_FAINT : 'transparent',
                position: 'relative' as const,
                transition: 'background-color 0.4s',
              }}>
                {/* 활성 스테이지 상단 강조선 */}
                {isActive && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', backgroundColor: CREAM }} />}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '5px', letterSpacing: '0.3em', color: isPast ? CREAM_MID : isActive ? CREAM : CREAM_DIM }}>0{i + 1}</span>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', fontWeight: isActive ? 700 : 400, color: isPast ? CREAM_MID : isActive ? CREAM : CREAM_DIM, letterSpacing: '0.15em' }}>{stage}</span>
                  {isPast && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '5px', color: CREAM_MID, marginLeft: 'auto' }}>✓</span>}
                  {isActive && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '5px', letterSpacing: '0.2em', color: CREAM_MID, marginLeft: 'auto', animation: 'arena-blink 1.4s ease infinite' }}>LIVE</span>}
                </div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '5px', letterSpacing: '0.2em', color: CREAM_DIM, marginTop: '2px' }}>{STAGE_EN[stage]}</div>
              </div>
            );
          })}
        </div>

        {/* ── 주제 바 ── */}
        <div style={{ flexShrink: 0, padding: '8px 24px', borderBottom: `1px solid ${CREAM_DIM}`, display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: CREAM_FAINT }}>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '6px', letterSpacing: '0.4em', color: CREAM_DIM, textTransform: 'uppercase' as const, flexShrink: 0 }}>SUBJECT</span>
          <div style={{ width: '1px', height: '10px', backgroundColor: CREAM_DIM }} />
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: CREAM_MID, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{topic}</span>
        </div>

        {/* ── 대화 ARENA ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0', display: 'flex', flexDirection: 'column', gap: 0 }}>
          {messages.map((msg, idx) => {
            const isAI = msg.role === 'ai';
            return (
              <div key={msg.id} style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                borderBottom: `1px solid ${CREAM_DIM}`,
                minHeight: '80px',
                animation: 'arena-slide-in 0.3s ease',
              }}>
                {/* AI 패널 (좌측) */}
                <div style={{
                  padding: '20px 28px',
                  borderRight: `1px solid ${CREAM_DIM}`,
                  backgroundColor: isAI ? CREAM_FAINT : 'transparent',
                  display: 'flex', flexDirection: 'column', justifyContent: 'center',
                }}>
                  {isAI && (
                    <>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '5px', letterSpacing: '0.4em', color: CREAM_DIM, marginBottom: '10px', textTransform: 'uppercase' as const }}>
                        SOCRATES · {msg.stage ? STAGE_EN[msg.stage] : ''}
                      </div>
                      <p style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '13px', color: CREAM, lineHeight: 1.85, whiteSpace: 'pre-line' as const, margin: 0 }}>
                        {msg.content}
                      </p>
                    </>
                  )}
                </div>
                {/* USER 패널 (우측) */}
                <div style={{
                  padding: '20px 28px',
                  backgroundColor: !isAI ? 'rgba(240,235,224,0.04)' : 'transparent',
                  display: 'flex', flexDirection: 'column', justifyContent: 'center',
                }}>
                  {!isAI && (
                    <>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '5px', letterSpacing: '0.4em', color: CREAM_DIM, marginBottom: '10px', textTransform: 'uppercase' as const }}>
                        YOU · {msg.timestamp}
                      </div>
                      <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: CREAM_MID, lineHeight: 1.8, whiteSpace: 'pre-line' as const, margin: 0 }}>
                        {msg.content}
                      </p>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {/* 타이핑 인디케이터 */}
          {isTyping && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: `1px solid ${CREAM_DIM}`, minHeight: '60px' }}>
              <div style={{ padding: '20px 28px', borderRight: `1px solid ${CREAM_DIM}`, backgroundColor: CREAM_FAINT, display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '5px', letterSpacing: '0.4em', color: CREAM_DIM, textTransform: 'uppercase' as const }}>SOCRATES</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {[0, 1, 2].map((i) => (
                    <div key={i} style={{ width: '4px', height: '4px', backgroundColor: CREAM_MID, borderRadius: '50%', animation: `arena-dot 0.9s ease ${i * 0.2}s infinite alternate` }} />
                  ))}
                </div>
              </div>
              <div style={{ padding: '20px 28px' }} />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* ── 하단 입력 콘솔 ── */}
        <div style={{ flexShrink: 0, borderTop: `2px solid ${CREAM_DIM}`, backgroundColor: BLACK }}>
          {/* 콘솔 레이블 */}
          <div style={{ padding: '6px 24px', borderBottom: `1px solid ${CREAM_DIM}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '5px', letterSpacing: '0.4em', color: CREAM_DIM, textTransform: 'uppercase' as const }}>INPUT CONSOLE</span>
            <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: isTyping ? CREAM_DIM : CREAM_MID, transition: 'background-color 0.3s' }} />
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '5px', letterSpacing: '0.3em', color: CREAM_DIM }}>{isTyping ? 'WAITING' : 'READY'}</span>
          </div>

          {/* 입력 영역 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 0 }}>
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="생각을 입력하세요..."
              rows={2}
              disabled={isTyping}
              style={{
                fontFamily: "'Space Mono', monospace", fontSize: '11px',
                color: CREAM, backgroundColor: 'transparent',
                border: 'none', borderRight: `1px solid ${CREAM_DIM}`,
                padding: '16px 24px', resize: 'none' as const, outline: 'none',
                lineHeight: 1.7, opacity: isTyping ? 0.4 : 1,
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <button onClick={sendMessage} disabled={!inputValue.trim() || isTyping}
                style={{ fontFamily: "'Space Mono', monospace", fontSize: '7px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' as const, padding: '0 24px', height: '50%', backgroundColor: inputValue.trim() && !isTyping ? CREAM : CREAM_DIM, color: BLACK, border: 'none', borderBottom: `1px solid ${CREAM_DIM}`, cursor: inputValue.trim() && !isTyping ? 'pointer' : 'not-allowed', transition: 'background-color 0.18s' }}
              >SEND</button>
              <div style={{ display: 'flex', height: '50%' }}>
                <button onClick={handleAporia} disabled={isTyping}
                  style={{ fontFamily: "'Space Mono', monospace", fontSize: '6px', letterSpacing: '0.15em', textTransform: 'uppercase' as const, flex: 1, backgroundColor: 'transparent', color: CREAM_DIM, border: 'none', borderRight: `1px solid ${CREAM_DIM}`, cursor: 'pointer', transition: 'color 0.18s' }}
                  onMouseEnter={e => { e.currentTarget.style.color = CREAM_MID; }}
                  onMouseLeave={e => { e.currentTarget.style.color = CREAM_DIM; }}
                >STUCK</button>
                <button onClick={endSession}
                  style={{ fontFamily: "'Space Mono', monospace", fontSize: '6px', letterSpacing: '0.15em', textTransform: 'uppercase' as const, flex: 1, backgroundColor: 'transparent', color: CREAM_DIM, border: 'none', cursor: 'pointer', transition: 'color 0.18s' }}
                  onMouseEnter={e => { e.currentTarget.style.color = CREAM_MID; }}
                  onMouseLeave={e => { e.currentTarget.style.color = CREAM_DIM; }}
                >END</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 키프레임 ── */}
      <style>{`
        @keyframes arena-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes arena-dot {
          0% { opacity: 0.2; transform: translateY(0); }
          100% { opacity: 1; transform: translateY(-3px); }
        }
        @keyframes arena-slide-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </DashboardLayout>
  );
}
