/*
 * Landing.tsx
 * LOGOS Design: "박물관 밖의 철학" — Sage Minimalism + Editorial
 * 
 * Layout:
 * - Full viewport height hero
 * - Marquee text rows crossing behind/in front of 3D statue
 * - ASCII overlay in center area
 * - 3D Rodin Thinker rotating slowly
 * - Minimal nav + CTA
 * 
 * Colors: Cream/Beige (#E8E0D0) bg, Dark Olive (#2C2C1E) text, Amber (#EF9F27) CTA
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import ThinkerModel from '@/components/ThinkerModel';
import AsciiOverlay from '@/components/AsciiOverlay';
import MarqueeText from '@/components/MarqueeText';

const MARQUEE_TOP = [
  'THINK DEEPER',
  '사고의 주체성',
  'SOCRATIC METHOD',
  '논리적 확신',
  'APORIA',
  '질문이 답이다',
];

const MARQUEE_BOTTOM = [
  'LOGOS',
  '소크라테스 씽킹 코치',
  'QUESTION EVERYTHING',
  '생각하는 힘',
  'CONVICTION',
  '아포리아를 넘어서',
];

const MARQUEE_SMALL = [
  'AI가 답을 주는 시대',
  '스스로 생각하는 힘',
  'THINKING COACH',
  '논리력 스코어',
  '사고의 깊이',
  'DEPTH OF THOUGHT',
];

export default function Landing() {
  const [, navigate] = useLocation();
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const heroRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    setMousePos({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    });
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: '#E8E0D0', color: '#2C2C1E' }}
    >
      {/* Navigation */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-5"
        style={{ backgroundColor: 'transparent' }}
      >
        <div className="flex items-center gap-3">
          {/* Logo mark — pentagon inspired */}
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <polygon
              points="14,2 26,9.5 26,18.5 14,26 2,18.5 2,9.5"
              stroke="#2C2C1E"
              strokeWidth="1.5"
              fill="none"
            />
            <polygon
              points="14,7 21,11 21,17 14,21 7,17 7,11"
              stroke="#2C2C1E"
              strokeWidth="0.8"
              fill="none"
              opacity="0.4"
            />
          </svg>
          <span
            className="font-bold tracking-[0.15em] text-sm uppercase"
            style={{ fontFamily: 'Pretendard Variable, sans-serif', color: '#2C2C1E' }}
          >
            LOGOS
          </span>
        </div>

        <div className="flex items-center gap-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-xs tracking-[0.2em] uppercase opacity-60 hover:opacity-100 transition-opacity"
            style={{ fontFamily: 'Pretendard Variable, sans-serif', color: '#2C2C1E' }}
          >
            시작하기
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-xs tracking-[0.2em] uppercase border px-4 py-2 hover:bg-[#2C2C1E] hover:text-[#E8E0D0] transition-colors"
            style={{
              fontFamily: 'Pretendard Variable, sans-serif',
              color: '#2C2C1E',
              borderColor: '#2C2C1E',
            }}
          >
            로그인
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div
        ref={heroRef}
        className="relative flex-1 flex flex-col overflow-hidden"
        style={{ minHeight: '100vh' }}
        onMouseMove={handleMouseMove}
      >
        {/* Top marquee row — behind statue */}
        <div className="absolute top-[18%] left-0 right-0 z-10 pointer-events-none">
          <MarqueeText
            texts={MARQUEE_TOP}
            direction="left"
            speed="slow"
            textClassName="text-[5.5vw] font-bold tracking-[-0.02em] uppercase"
            className="opacity-90"
            style={{ fontFamily: "'Libre Baskerville', Georgia, serif", color: '#2C2C1E' } as React.CSSProperties}
          />
        </div>

        {/* Small marquee — very top */}
        <div className="absolute top-[8%] left-0 right-0 z-10 pointer-events-none">
          <MarqueeText
            texts={MARQUEE_SMALL}
            direction="right"
            speed="medium"
            textClassName="text-[1.8vw] tracking-[0.25em] uppercase"
            className="opacity-35"
            style={{ fontFamily: 'Pretendard Variable, sans-serif', color: '#4A4A38' } as React.CSSProperties}
          />
        </div>

        {/* ASCII Overlay — full hero */}
        <div className="absolute inset-0 z-20 pointer-events-none">
          <AsciiOverlay
            className="w-full h-full"
            mouseX={mousePos.x}
            mouseY={mousePos.y}
          />
        </div>

        {/* 3D Thinker — center, above ASCII */}
        <div
          className="absolute z-30"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'min(420px, 55vw)',
            height: 'min(560px, 75vh)',
          }}
        >
          <ThinkerModel className="w-full h-full" />
        </div>

        {/* Bottom marquee row — in front of statue */}
        <div className="absolute bottom-[22%] left-0 right-0 z-40 pointer-events-none">
          <MarqueeText
            texts={MARQUEE_BOTTOM}
            direction="right"
            speed="slow"
            textClassName="text-[5.5vw] font-bold tracking-[-0.02em] uppercase"
            className="opacity-90"
            style={{ fontFamily: "'Libre Baskerville', Georgia, serif", color: '#2C2C1E' } as React.CSSProperties}
          />
        </div>

        {/* Center label — LOGOS brand */}
        <div
          className="absolute z-50 pointer-events-none"
          style={{
            left: '50%',
            top: '14%',
            transform: 'translateX(-50%)',
            textAlign: 'center',
          }}
        >
          <div
            className="text-[0.65rem] tracking-[0.4em] uppercase opacity-50 mb-1"
            style={{ fontFamily: 'Pretendard Variable, sans-serif', color: '#2C2C1E' }}
          >
            소크라테스 씽킹 코치
          </div>
          <div
            className="text-[3.5vw] font-bold tracking-[0.08em]"
            style={{ fontFamily: "'Libre Baskerville', Georgia, serif", color: '#2C2C1E' }}
          >
            ΛΟΓΟΣ
          </div>
        </div>

        {/* CTA Section — bottom */}
        <div
          className="absolute bottom-8 left-0 right-0 z-50 flex flex-col items-center gap-4"
        >
          <p
            className="text-xs tracking-[0.15em] uppercase opacity-50 text-center max-w-xs"
            style={{ fontFamily: 'Pretendard Variable, sans-serif', color: '#2C2C1E' }}
          >
            AI가 답을 주는 시대, 스스로 생각하는 힘을 기르세요
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="group relative overflow-hidden px-8 py-3 text-sm tracking-[0.2em] uppercase font-semibold transition-all duration-300"
            style={{
              fontFamily: 'Pretendard Variable, sans-serif',
              backgroundColor: '#2C2C1E',
              color: '#E8E0D0',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#EF9F27';
              (e.currentTarget as HTMLButtonElement).style.color = '#2C2C1E';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#2C2C1E';
              (e.currentTarget as HTMLButtonElement).style.color = '#E8E0D0';
            }}
          >
            생각을 시작하다
          </button>
          <div
            className="text-[0.6rem] tracking-[0.3em] uppercase opacity-30"
            style={{ fontFamily: 'Pretendard Variable, sans-serif', color: '#2C2C1E' }}
          >
            Scroll to explore
          </div>
        </div>

        {/* Side labels */}
        <div
          className="absolute left-6 top-1/2 -translate-y-1/2 z-50 pointer-events-none"
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
        >
          <span
            className="text-[0.6rem] tracking-[0.35em] uppercase opacity-30"
            style={{ fontFamily: 'Pretendard Variable, sans-serif', color: '#2C2C1E' }}
          >
            Thinking Coach
          </span>
        </div>
        <div
          className="absolute right-6 top-1/2 -translate-y-1/2 z-50 pointer-events-none"
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'translateY(-50%) rotate(180deg)' }}
        >
          <span
            className="text-[0.6rem] tracking-[0.35em] uppercase opacity-30"
            style={{ fontFamily: 'Pretendard Variable, sans-serif', color: '#2C2C1E' }}
          >
            2026 · LOGOS
          </span>
        </div>
      </div>

      {/* Section 2 — About */}
      <section
        className="py-40 px-8"
        style={{ backgroundColor: '#2C2C1E', color: '#E8E0D0' }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div>
              <div
                className="text-[0.65rem] tracking-[0.4em] uppercase mb-6 opacity-50"
                style={{ fontFamily: 'Pretendard Variable, sans-serif' }}
              >
                About LOGOS
              </div>
              <h2
                className="text-4xl md:text-5xl font-bold leading-tight mb-8"
                style={{ fontFamily: "'Libre Baskerville', Georgia, serif", letterSpacing: '-0.02em' }}
              >
                AI가 답을 주는<br />시대의 역설
              </h2>
              <p
                className="text-base leading-relaxed opacity-70 mb-6"
                style={{ fontFamily: 'Pretendard Variable, sans-serif', lineHeight: 1.8 }}
              >
                모든 AI가 즉답을 제공하는 세상에서, LOGOS는 반대로 질문합니다.
                소크라테스가 아테네 광장에서 했던 것처럼 — 당신이 스스로 생각하게 만드는 것이 우리의 유일한 목표입니다.
              </p>
              <p
                className="text-base leading-relaxed opacity-70"
                style={{ fontFamily: 'Pretendard Variable, sans-serif', lineHeight: 1.8 }}
              >
                답을 찾는 것이 아니라, 올바른 질문을 발견하는 여정. 그것이 진정한 지적 성장입니다.
              </p>
            </div>
            <div className="space-y-8">
              {[
                { label: '01', title: '사고의 주체성 회복', desc: 'AI가 답을 주는 시대에 스스로 생각하는 힘을 기릅니다.' },
                { label: '02', title: '논리적 확신', desc: '남의 논리가 아닌, 질문을 통해 스스로 발견한 결론에 도달합니다.' },
                { label: '03', title: '성장의 시각화', desc: '추상적인 사고 과정을 논리력 스코어로 수치화합니다.' },
              ].map((item) => (
                <div key={item.label} className="flex gap-6 items-start">
                  <span
                    className="text-xs tracking-[0.3em] opacity-30 mt-1 shrink-0"
                    style={{ fontFamily: 'Pretendard Variable, sans-serif' }}
                  >
                    {item.label}
                  </span>
                  <div>
                    <h3
                      className="text-base font-bold mb-2"
                      style={{ fontFamily: 'Pretendard Variable, sans-serif', fontWeight: 700 }}
                    >
                      {item.title}
                    </h3>
                    <p
                      className="text-sm opacity-60 leading-relaxed"
                      style={{ fontFamily: 'Pretendard Variable, sans-serif', lineHeight: 1.75 }}
                    >
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Section 3 — How it works */}
      <section
        className="py-40 px-8"
        style={{ backgroundColor: '#E8E0D0', color: '#2C2C1E' }}
      >
        <div className="max-w-5xl mx-auto">
          <div
            className="text-[0.65rem] tracking-[0.4em] uppercase mb-6 opacity-50"
            style={{ fontFamily: 'Pretendard Variable, sans-serif' }}
          >
            Socratic Progression
          </div>
          <h2
            className="text-4xl md:text-5xl font-bold mb-20"
            style={{ fontFamily: "'Libre Baskerville', Georgia, serif", letterSpacing: '-0.02em' }}
          >
            4단계 사고 심화
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-0">
            {[
              { level: 'Level 1', stage: '표면', question: '왜 그렇게 생각하세요?', desc: '현상 파악' },
              { level: 'Level 2', stage: '전제', question: '그게 항상 사실일까요?', desc: '고정관념 도전' },
              { level: 'Level 3', stage: '본질', question: '진짜 문제는 무엇인가요?', desc: '핵심 직면' },
              { level: 'Level 4', stage: '통합', question: '지금 발견한 게 무엇인가요?', desc: '납득과 정리' },
            ].map((item, i) => (
              <div
                key={item.level}
                className="border-l border-[#2C2C1E]/20 pl-6 py-4 first:border-l-0 first:pl-0"
              >
                <div
                  className="text-[0.6rem] tracking-[0.35em] uppercase opacity-40 mb-3"
                  style={{ fontFamily: 'Pretendard Variable, sans-serif' }}
                >
                  {item.level}
                </div>
                <div
                  className="text-2xl font-bold mb-3"
                  style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}
                >
                  {item.stage}
                </div>
                <p
                  className="text-sm italic opacity-70 mb-2 leading-relaxed"
                  style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}
                >
                  "{item.question}"
                </p>
                <p
                  className="text-xs opacity-50"
                  style={{ fontFamily: 'Pretendard Variable, sans-serif' }}
                >
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4 — Pricing */}
      <section
        className="py-40 px-8"
        style={{ backgroundColor: '#1A1A14', color: '#E8E0D0' }}
      >
        <div className="max-w-4xl mx-auto">
          <div
            className="text-[0.65rem] tracking-[0.4em] uppercase mb-6 opacity-50"
            style={{ fontFamily: 'Pretendard Variable, sans-serif' }}
          >
            Subscription
          </div>
          <h2
            className="text-4xl md:text-5xl font-bold mb-16"
            style={{ fontFamily: "'Libre Baskerville', Georgia, serif", letterSpacing: '-0.02em' }}
          >
            생각의 깊이에 투자하세요
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#E8E0D0]/10">
            {[
              {
                plan: 'Free',
                price: '₩0',
                period: '/월',
                features: ['일 3회 씽킹 세션', '기본 논리력 스코어', '세션 기록 7일'],
                cta: '무료로 시작',
                highlight: false,
              },
              {
                plan: 'Pro',
                price: '₩9,900',
                period: '/월',
                features: ['무제한 씽킹 세션', '상세 논리력 분석', '무제한 세션 기록', '성장 추이 그래프', '개선 피드백'],
                cta: '지금 시작하기',
                highlight: true,
              },
              {
                plan: 'Team',
                price: '₩49,000',
                period: '/월 (5인)',
                features: ['Pro 기능 전체', '팀 논리력 비교', '관리자 대시보드', '맞춤 세션 설계', '전담 지원'],
                cta: '팀 플랜 문의',
                highlight: false,
              },
            ].map((plan) => (
              <div
                key={plan.plan}
                className="p-8"
                style={{
                  backgroundColor: plan.highlight ? '#EF9F27' : '#1A1A14',
                  color: plan.highlight ? '#1A1A14' : '#E8E0D0',
                }}
              >
                <div
                  className="text-xs tracking-[0.3em] uppercase mb-4 opacity-60"
                  style={{ fontFamily: 'Pretendard Variable, sans-serif' }}
                >
                  {plan.plan}
                </div>
                <div className="flex items-baseline gap-1 mb-8">
                  <span
                    className="text-4xl font-bold"
                    style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}
                  >
                    {plan.price}
                  </span>
                  <span className="text-sm opacity-60">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <span className="opacity-40">—</span>
                      <span style={{ fontFamily: 'Pretendard Variable, sans-serif' }}>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="w-full py-3 text-xs tracking-[0.2em] uppercase font-semibold border transition-all duration-200"
                  style={{
                    fontFamily: 'Pretendard Variable, sans-serif',
                    borderColor: plan.highlight ? '#1A1A14' : '#E8E0D0',
                    backgroundColor: 'transparent',
                    color: plan.highlight ? '#1A1A14' : '#E8E0D0',
                  }}
                  onMouseEnter={(e) => {
                    const btn = e.currentTarget;
                    if (plan.highlight) {
                      btn.style.backgroundColor = '#1A1A14';
                      btn.style.color = '#EF9F27';
                    } else {
                      btn.style.backgroundColor = '#E8E0D0';
                      btn.style.color = '#1A1A14';
                    }
                  }}
                  onMouseLeave={(e) => {
                    const btn = e.currentTarget;
                    btn.style.backgroundColor = 'transparent';
                    btn.style.color = plan.highlight ? '#1A1A14' : '#E8E0D0';
                  }}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="py-12 px-8 flex items-center justify-between"
        style={{ backgroundColor: '#E8E0D0', color: '#2C2C1E' }}
      >
        <div className="flex items-center gap-3">
          <svg width="20" height="20" viewBox="0 0 28 28" fill="none">
            <polygon points="14,2 26,9.5 26,18.5 14,26 2,18.5 2,9.5" stroke="#2C2C1E" strokeWidth="1.5" fill="none" />
          </svg>
          <span
            className="text-xs tracking-[0.2em] uppercase opacity-60"
            style={{ fontFamily: 'Pretendard Variable, sans-serif' }}
          >
            LOGOS © 2026
          </span>
        </div>
        <div
          className="text-xs tracking-[0.15em] uppercase opacity-40"
          style={{ fontFamily: 'Pretendard Variable, sans-serif' }}
        >
          생각하는 힘을 기르다
        </div>
      </footer>
    </div>
  );
}
