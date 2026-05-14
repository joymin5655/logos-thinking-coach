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

  const stageColors: Record<Stage, string> = {
    '표면': '#888780',
    '전제': '#534AB7',
    '본질': '#1D9E75',
    '통합': '#EF9F27',
  };

  if (phase === 'intro') {
    return (
      <DashboardLayout title="씽킹 세션" titleEn="Thinking Session">
        <div className="max-w-2xl mx-auto py-16">
          <div
            className="text-[0.65rem] tracking-[0.4em] uppercase opacity-40 mb-4"
            style={{ fontFamily: 'Outfit, sans-serif', color: '#1E1E14' }}
          >
            New Session
          </div>
          <h2
            className="text-4xl font-bold mb-3"
            style={{ fontFamily: "'Source Serif 4', Georgia, serif", color: '#1E1E14', letterSpacing: '-0.02em' }}
          >
            무엇을 생각하고 싶으신가요?
          </h2>
          <p
            className="text-sm opacity-60 mb-12 leading-relaxed"
            style={{ fontFamily: 'Outfit, sans-serif', color: '#1E1E14', lineHeight: 1.8 }}
          >
            고민, 아이디어, 결정해야 할 것 — 무엇이든 입력하세요.<br />
            소크라테스가 질문을 통해 당신의 생각을 깊이 있게 만들어드립니다.
          </p>

          <div className="mb-6">
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="예: 직장을 그만두고 창업을 해야 할지 고민됩니다..."
              className="w-full p-5 text-sm resize-none border-0 border-b-2 bg-transparent outline-none"
              rows={4}
              style={{
                fontFamily: 'Outfit, sans-serif',
                color: '#1E1E14',
                borderColor: 'rgba(44,44,30,0.2)',
                lineHeight: 1.8,
              }}
              onFocus={(e) => { e.target.style.borderColor = '#1E1E14'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(44,44,30,0.2)'; }}
            />
          </div>

          <div className="flex items-center justify-between">
            <p
              className="text-xs opacity-40"
              style={{ fontFamily: 'Outfit, sans-serif', color: '#1E1E14' }}
            >
              오늘 남은 세션: 2회 (무료)
            </p>
            <button
              onClick={startSession}
              disabled={!topic.trim()}
              className="px-8 py-3 text-sm tracking-[0.2em] uppercase font-semibold transition-all duration-200 disabled:opacity-30"
              style={{
                fontFamily: 'Outfit, sans-serif',
                backgroundColor: topic.trim() ? '#1E1E14' : 'rgba(44,44,30,0.3)',
                color: '#C5C9B4',
              }}
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
          <div
            className="text-6xl font-bold mb-2"
            style={{ fontFamily: "'Source Serif 4', Georgia, serif", color: '#EF9F27' }}
          >
            78
          </div>
          <div
            className="text-[0.65rem] tracking-[0.4em] uppercase opacity-50 mb-8"
            style={{ fontFamily: 'Outfit, sans-serif', color: '#1E1E14' }}
          >
            Logic Score
          </div>
          <h2
            className="text-3xl font-bold mb-4"
            style={{ fontFamily: "'Source Serif 4', Georgia, serif", color: '#1E1E14' }}
          >
            세션이 완료되었습니다
          </h2>
          <p
            className="text-sm opacity-60 mb-12 leading-relaxed"
            style={{ fontFamily: 'Outfit, sans-serif', color: '#1E1E14', lineHeight: 1.8 }}
          >
            오늘의 사고 여정을 마쳤습니다.<br />
            당신은 스스로 생각하는 힘을 한 단계 키웠습니다.
          </p>

          <div className="grid grid-cols-3 gap-4 mb-12">
            {[
              { label: '논리 구조', score: 80 },
              { label: '일관성', score: 75 },
              { label: '근거의 질', score: 79 },
            ].map((item) => (
              <div
                key={item.label}
                className="p-5 border"
                style={{ borderColor: 'rgba(44,44,30,0.12)', backgroundColor: 'rgba(232,224,208,0.5)' }}
              >
                <div
                  className="text-2xl font-bold mb-1"
                  style={{ fontFamily: "'Source Serif 4', Georgia, serif", color: '#1E1E14' }}
                >
                  {item.score}
                </div>
                <div
                  className="text-xs opacity-50"
                  style={{ fontFamily: 'Outfit, sans-serif', color: '#1E1E14' }}
                >
                  {item.label}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={() => navigate('/dashboard/analytics')}
              className="px-6 py-3 text-xs tracking-[0.2em] uppercase border transition-all duration-200"
              style={{
                fontFamily: 'Outfit, sans-serif',
                borderColor: '#1E1E14',
                color: '#1E1E14',
                backgroundColor: 'transparent',
              }}
            >
              상세 분석 보기
            </button>
            <button
              onClick={() => { setPhase('intro'); setTopic(''); setMessages([]); setStageIndex(0); setCurrentStage('표면'); setQuestionCount(0); }}
              className="px-6 py-3 text-xs tracking-[0.2em] uppercase transition-all duration-200"
              style={{
                fontFamily: 'Outfit, sans-serif',
                backgroundColor: '#1E1E14',
                color: '#C5C9B4',
              }}
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
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[0.55rem] font-bold mb-1 transition-all duration-500"
                  style={{
                    backgroundColor: i <= stageIndex ? stageColors[stage] : 'rgba(44,44,30,0.1)',
                    color: i <= stageIndex ? '#fff' : 'rgba(44,44,30,0.3)',
                  }}
                >
                  {i + 1}
                </div>
                <span
                  className="text-[0.55rem] tracking-[0.15em]"
                  style={{
                    fontFamily: 'Outfit, sans-serif',
                    color: i <= stageIndex ? stageColors[stage] : 'rgba(44,44,30,0.3)',
                  }}
                >
                  {stage}
                </span>
              </div>
              {i < STAGES.length - 1 && (
                <div
                  className="h-px flex-1 mx-1 mb-4 transition-all duration-500"
                  style={{ backgroundColor: i < stageIndex ? stageColors[STAGES[i + 1]] : 'rgba(44,44,30,0.1)' }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Topic */}
        <div
          className="text-xs opacity-40 mb-8 pb-4 border-b"
          style={{
            fontFamily: 'Outfit, sans-serif',
            color: '#1E1E14',
            borderColor: 'rgba(44,44,30,0.12)',
          }}
        >
          주제: {topic}
        </div>

        {/* Messages */}
        <div className="space-y-0 mb-8">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className="py-5 border-b"
              style={{ borderColor: 'rgba(44,44,30,0.08)' }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="text-[0.55rem] tracking-[0.2em] uppercase w-12 shrink-0 pt-0.5"
                  style={{
                    fontFamily: 'Outfit, sans-serif',
                    color: msg.role === 'ai'
                      ? (msg.stage ? stageColors[msg.stage] : '#888780')
                      : 'rgba(44,44,30,0.4)',
                  }}
                >
                  {msg.role === 'ai' ? (msg.stage || 'AI') : 'You'}
                </div>
                <div className="flex-1">
                  <p
                    className="text-sm leading-relaxed whitespace-pre-line"
                    style={{
                      fontFamily: msg.role === 'ai'
                        ? "'Source Serif 4', Georgia, serif"
                        : 'Outfit, sans-serif',
                      color: '#1E1E14',
                      fontWeight: msg.role === 'ai' ? 400 : 400,
                      lineHeight: 1.8,
                    }}
                  >
                    {msg.content}
                  </p>
                </div>
                <span
                  className="text-[0.55rem] opacity-30 shrink-0 pt-0.5"
                  style={{ fontFamily: 'Outfit, sans-serif', color: '#1E1E14' }}
                >
                  {msg.timestamp}
                </span>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="py-5 border-b" style={{ borderColor: 'rgba(44,44,30,0.08)' }}>
              <div className="flex items-start gap-4">
                <div
                  className="text-[0.55rem] tracking-[0.2em] uppercase w-12 shrink-0"
                  style={{ fontFamily: 'Outfit, sans-serif', color: stageColors[currentStage] }}
                >
                  {currentStage}
                </div>
                <div className="flex gap-1 pt-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        backgroundColor: '#1E1E14',
                        opacity: 0.4,
                        animation: `fade-in-up 0.6s ease ${i * 0.15}s infinite alternate`,
                      }}
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
          <div
            className="flex items-end gap-4 border-b-2 pb-2"
            style={{ borderColor: '#1E1E14' }}
          >
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="생각을 입력하세요..."
              className="flex-1 bg-transparent outline-none resize-none text-sm"
              rows={2}
              style={{
                fontFamily: 'Outfit, sans-serif',
                color: '#1E1E14',
                lineHeight: 1.75,
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!inputValue.trim() || isTyping}
              className="shrink-0 px-4 py-2 text-xs tracking-[0.15em] uppercase transition-all duration-200 disabled:opacity-30"
              style={{
                fontFamily: 'Outfit, sans-serif',
                backgroundColor: '#1E1E14',
                color: '#C5C9B4',
              }}
            >
              전송
            </button>
          </div>
          <p
            className="text-[0.6rem] opacity-30 mt-2"
            style={{ fontFamily: 'Outfit, sans-serif', color: '#1E1E14' }}
          >
            Enter로 전송 · Shift+Enter로 줄바꿈
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleAporia}
            className="px-5 py-2.5 text-xs tracking-[0.15em] uppercase border transition-all duration-200"
            style={{
              fontFamily: 'Outfit, sans-serif',
              borderColor: 'rgba(44,44,30,0.3)',
              color: 'rgba(44,44,30,0.6)',
              backgroundColor: 'transparent',
            }}
          >
            막혔어요
          </button>
          <button
            onClick={endSession}
            className="px-5 py-2.5 text-xs tracking-[0.15em] uppercase border transition-all duration-200"
            style={{
              fontFamily: 'Outfit, sans-serif',
              borderColor: 'rgba(44,44,30,0.3)',
              color: 'rgba(44,44,30,0.6)',
              backgroundColor: 'transparent',
            }}
          >
            이 정도면 됐어
          </button>
          <button
            onClick={sendMessage}
            className="ml-auto px-5 py-2.5 text-xs tracking-[0.15em] uppercase transition-all duration-200"
            style={{
              fontFamily: 'Outfit, sans-serif',
              backgroundColor: '#534AB7',
              color: '#C5C9B4',
            }}
          >
            더 파고들어줘
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
