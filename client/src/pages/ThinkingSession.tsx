/*
 * ThinkingSession.tsx
 * LOGOS Design: 씽킹 세션 — 소크라테스 문답 UI
 * - 말풍선 없는 리스트 형태 대화
 * - 4단계 진행 표시 (표면→전제→본질→통합)
 * - 아포리아 구제 버튼
 * - 세션 종결 버튼
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
      setMessages([
        {
          id: 1,
          role: 'ai',
          content: `"${topic}"에 대해 함께 생각해보겠습니다.\n\n${getQuestion('표면')}`,
          stage: '표면',
          timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setIsTyping(false);
    }, 1200);
  };

  const sendMessage = () => {
    if (!inputValue.trim()) return;

    const userMsg: Message = {
      id: messages.length + 1,
      role: 'user',
      content: inputValue,
      timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    const newQuestionCount = questionCount + 1;
    setQuestionCount(newQuestionCount);

    // Advance stage every 2 questions
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
        id: messages.length + 2,
        role: 'ai',
        content: getQuestion(nextStage),
        stage: nextStage,
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
        id: messages.length + 1,
        role: 'ai',
        content: '막막함을 느끼는 건 자연스러운 일이에요. 잠시 돌아가볼까요?\n\n조금 전에 가장 확신했던 부분으로 돌아가서 — 그 생각이 왜 옳다고 느꼈나요?',
        stage: currentStage,
        timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aMsg]);
      setIsTyping(false);
    }, 1000);
  };

  const endSession = () => {
    setPhase('complete');
  };

  const CREAM       = '#F0EBE0';
  const CREAM_MID   = 'rgba(240,235,224,0.55)';
  const CREAM_DIM   = 'rgba(240,235,224,0.12)';
  const CREAM_FAINT = 'rgba(240,235,224,0.06)';
  const BLACK       = '#0A0A0A';
  const stageColors: Record<Stage, string> = {
    '표면': 'rgba(240,235,224,0.35)',
    '전제': 'rgba(240,235,224,0.55)',
    '본질': 'rgba(240,235,224,0.75)',
    '통합': '#F0EBE0',
  };

  if (phase === 'intro') {
    return (
      <DashboardLayout title="씽킹 세션" titleEn="Thinking Session">
        <div className="max-w-2xl mx-auto py-16">
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '6px', letterSpacing: '0.4em', textTransform: 'uppercase' as const, color: CREAM_MID, marginBottom: '16px' }}>New Session</div>
          <h2 style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '36px', fontWeight: 600, color: CREAM, letterSpacing: '-0.02em', marginBottom: '12px' }}>
            무엇을 생각하고 싶으신가요?
          </h2>
          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: CREAM_MID, lineHeight: 1.9, marginBottom: '48px' }}>
            고민, 아이디어, 결정해야 할 것 — 무엇이든 입력하세요.<br />
            소크라테스가 질문을 통해 당신의 생각을 깊이 있게 만들어드립니다.
          </p>
          <div className="mb-6">
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="예: 직장을 그만두고 창업을 해야 할지 고민됩니다..."
              className="w-full p-5 resize-none bg-transparent outline-none"
              rows={4}
              style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: CREAM, borderBottom: `2px solid ${CREAM_DIM}`, lineHeight: 1.8 }}
              onFocus={(e) => { e.target.style.borderBottomColor = CREAM; }}
              onBlur={(e) => { e.target.style.borderBottomColor = CREAM_DIM; }}
            />
          </div>
          <div className="flex items-center justify-between">
            <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '7px', color: CREAM_MID }}>오늘 남은 세션: 2회 (무료)</p>
            <button
              onClick={startSession}
              disabled={!topic.trim()}
              className="transition-all duration-200 disabled:opacity-30"
              style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', letterSpacing: '0.2em', textTransform: 'uppercase' as const, fontWeight: 700, padding: '12px 28px', backgroundColor: CREAM, color: BLACK, border: 'none', cursor: topic.trim() ? 'pointer' : 'not-allowed' }}
            >
              생각 시작하기 →
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (phase === 'complete') {
    return (
      <DashboardLayout title="세션 완료" titleEn="Session Complete">
        <div className="max-w-2xl mx-auto py-16 text-center">
          <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '64px', fontWeight: 600, color: CREAM, marginBottom: '4px' }}>78</div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '6px', letterSpacing: '0.4em', textTransform: 'uppercase' as const, color: CREAM_MID, marginBottom: '32px' }}>Logic Score</div>
          <h2 style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '28px', fontWeight: 600, color: CREAM, marginBottom: '12px' }}>세션이 완료되었습니다</h2>
          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: CREAM_MID, lineHeight: 1.9, marginBottom: '48px' }}>
            오늘의 사고 여정을 마쳤습니다.<br />
            당신은 스스로 생각하는 힘을 한 단계 키웠습니다.
          </p>
          <div className="grid grid-cols-3 gap-3 mb-12">
            {[
              { label: '논리 구조', score: 80 },
              { label: '일관성', score: 75 },
              { label: '근거의 질', score: 79 },
            ].map((item) => (
              <div key={item.label} className="p-5" style={{ border: `1px solid ${CREAM_DIM}`, backgroundColor: CREAM_FAINT }}>
                <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '24px', fontWeight: 600, color: CREAM, marginBottom: '4px' }}>{item.score}</div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '7px', color: CREAM_MID }}>{item.label}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => navigate('/dashboard/analytics')}
              style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', letterSpacing: '0.2em', textTransform: 'uppercase' as const, padding: '10px 24px', border: `1px solid ${CREAM_DIM}`, color: CREAM_MID, backgroundColor: 'transparent', cursor: 'pointer', transition: 'all 0.18s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = CREAM; e.currentTarget.style.color = CREAM; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = CREAM_DIM; e.currentTarget.style.color = CREAM_MID; }}
            >
              상세 분석 보기
            </button>
            <button
              onClick={() => { setPhase('intro'); setTopic(''); setMessages([]); setStageIndex(0); setCurrentStage('표면'); setQuestionCount(0); }}
              style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', letterSpacing: '0.2em', textTransform: 'uppercase' as const, fontWeight: 700, padding: '10px 24px', backgroundColor: CREAM, color: BLACK, border: 'none', cursor: 'pointer', transition: 'opacity 0.18s' }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.8'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
            >
              새 세션 시작
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="씽킹 세션" titleEn="Thinking Session">
      <div className="max-w-2xl mx-auto">
        {/* Stage Progress */}
        <div className="flex items-center gap-0 mb-10">
          {STAGES.map((stage, i) => (
            <div key={stage} className="flex items-center flex-1">
              <div className="flex-1 flex flex-col items-center">
                <div
                  className="w-6 h-6 flex items-center justify-center mb-1 transition-all duration-500"
                  style={{ fontFamily: "'Space Mono', monospace", fontSize: '7px', fontWeight: 700, backgroundColor: i <= stageIndex ? stageColors[stage] : CREAM_FAINT, color: i <= stageIndex ? BLACK : CREAM_MID }}
                >
                  {i + 1}
                </div>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '6px', letterSpacing: '0.15em', color: i <= stageIndex ? stageColors[stage] : CREAM_DIM }}>
                  {stage}
                </span>
              </div>
              {i < STAGES.length - 1 && (
                <div className="h-px flex-1 mx-1 mb-4 transition-all duration-500"
                  style={{ backgroundColor: i < stageIndex ? stageColors[STAGES[i + 1]] : CREAM_DIM }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Topic */}
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', color: CREAM_MID, marginBottom: '32px', paddingBottom: '16px', borderBottom: `1px solid ${CREAM_DIM}` }}>
          주제: {topic}
        </div>

        {/* Messages */}
        <div className="mb-8">
          {messages.map((msg) => (
            <div key={msg.id} className="py-5" style={{ borderBottom: `1px solid ${CREAM_DIM}` }}>
              <div className="flex items-start gap-4">
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '6px', letterSpacing: '0.2em', textTransform: 'uppercase' as const, width: '48px', flexShrink: 0, paddingTop: '2px', color: msg.role === 'ai' ? (msg.stage ? stageColors[msg.stage] : CREAM_MID) : 'rgba(240,235,224,0.3)' }}>
                  {msg.role === 'ai' ? (msg.stage || 'AI') : 'You'}
                </div>
                <div className="flex-1">
                  <p style={{ fontFamily: msg.role === 'ai' ? "'Source Serif 4', Georgia, serif" : "'Space Mono', monospace", fontSize: msg.role === 'ai' ? '13px' : '10px', color: CREAM, lineHeight: 1.85, whiteSpace: 'pre-line' as const }}>
                    {msg.content}
                  </p>
                </div>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '6px', color: CREAM_MID, flexShrink: 0, paddingTop: '2px', opacity: 0.5 }}>
                  {msg.timestamp}
                </span>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="py-5" style={{ borderBottom: `1px solid ${CREAM_DIM}` }}>
              <div className="flex items-start gap-4">
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '6px', letterSpacing: '0.2em', textTransform: 'uppercase' as const, width: '48px', flexShrink: 0, color: stageColors[currentStage] }}>
                  {currentStage}
                </div>
                <div className="flex gap-1 pt-1">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: CREAM, opacity: 0.4, animation: `fade-in-up 0.6s ease ${i * 0.15}s infinite alternate` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="mb-6">
          <div className="flex items-end gap-4 pb-2" style={{ borderBottom: `2px solid ${CREAM_DIM}` }}>
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="생각을 입력하세요..."
              className="flex-1 bg-transparent outline-none resize-none"
              rows={2}
              style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', color: CREAM, lineHeight: 1.75 }}
            />
            <button
              onClick={sendMessage}
              disabled={!inputValue.trim() || isTyping}
              className="shrink-0 transition-all duration-200 disabled:opacity-30"
              style={{ fontFamily: "'Space Mono', monospace", fontSize: '7px', letterSpacing: '0.15em', textTransform: 'uppercase' as const, fontWeight: 700, padding: '8px 16px', backgroundColor: CREAM, color: BLACK, border: 'none', cursor: 'pointer' }}
            >
              전송
            </button>
          </div>
          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '6px', color: CREAM_MID, marginTop: '8px', opacity: 0.6 }}>
            Enter로 전송 · Shift+Enter로 줄바꿼
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button onClick={handleAporia}
            style={{ fontFamily: "'Space Mono', monospace", fontSize: '7px', letterSpacing: '0.15em', textTransform: 'uppercase' as const, padding: '9px 18px', border: `1px solid ${CREAM_DIM}`, color: CREAM_MID, backgroundColor: 'transparent', cursor: 'pointer', transition: 'all 0.18s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = CREAM; e.currentTarget.style.color = CREAM; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = CREAM_DIM; e.currentTarget.style.color = CREAM_MID; }}
          >
            막혀요
          </button>
          <button onClick={endSession}
            style={{ fontFamily: "'Space Mono', monospace", fontSize: '7px', letterSpacing: '0.15em', textTransform: 'uppercase' as const, padding: '9px 18px', border: `1px solid ${CREAM_DIM}`, color: CREAM_MID, backgroundColor: 'transparent', cursor: 'pointer', transition: 'all 0.18s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = CREAM; e.currentTarget.style.color = CREAM; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = CREAM_DIM; e.currentTarget.style.color = CREAM_MID; }}
          >
            이 정도면 됨어
          </button>
          <button onClick={sendMessage} className="ml-auto"
            style={{ fontFamily: "'Space Mono', monospace", fontSize: '7px', letterSpacing: '0.15em', textTransform: 'uppercase' as const, fontWeight: 700, padding: '9px 18px', backgroundColor: CREAM, color: BLACK, border: 'none', cursor: 'pointer', transition: 'opacity 0.18s' }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.8'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
          >
            더 파고들어줘
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
