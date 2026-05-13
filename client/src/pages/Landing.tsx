/*
 * Landing.tsx
 * LOGOS Design: "뮤제 리믹스" 스타일
 * 
 * 참조: musee_remix_scene.webp
 * 
 * Layout:
 * - 세이지 그린 배경 (#C5C9B4)
 * - 동상 화면 중앙 상단에 크게 배치 (실루엣 느낌)
 * - 픽셀/도트 그리드가 동상 중앙을 가로지름
 * - 하단에 초대형 DM Sans 마퀴 텍스트 (화면 꽉 채움)
 * - 최소한의 UI: 좌상단 로고 + 우상단 단일 버튼
 * 
 * Typography:
 * - 마퀴/제목: DM Sans Bold (초대형)
 * - 서브/UI: Pretendard
 * - 강조: Source Serif 4 Italic
 * 
 * Colors:
 * - BG: #C5C9B4 (sage green)
 * - Text/Statue: #1E1E14 (very dark olive)
 * - Pixel grid: rgba(30,30,20, 0.15~0.7)
 */
import { useCallback, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import ThinkerModel from '@/components/ThinkerModel';
import PixelDotGrid from '@/components/PixelDotGrid';

// Musee-style: single long marquee text at bottom
const MARQUEE_LINE = [
  'THINK DEEPER',
  '사고의 주체성',
  'SOCRATIC METHOD',
  '논리적 확신',
  'APORIA',
  '질문이 답이다',
  'LOGOS',
  'THINK DEEPER',
  '사고의 주체성',
  'SOCRATIC METHOD',
];

const MARQUEE_LINE_2 = [
  '생각하는 힘',
  'CONVICTION',
  '아포리아를 넘어서',
  'DEPTH OF THOUGHT',
  '소크라테스 씽킹 코치',
  'QUESTION EVERYTHING',
  '생각하는 힘',
  'CONVICTION',
];

export default function Landing() {
  const [, navigate] = useLocation();
  const heroRef = useRef<HTMLDivElement>(null);

  // Colors
  const BG = '#C5C9B4';
  const TEXT = '#1E1E14';
  const TEXT_MID = 'rgba(30,30,20,0.55)';

  return (
    <div
      className="min-h-screen flex flex-col overflow-hidden"
      style={{ backgroundColor: BG, color: TEXT }}
    >
      {/* ── NAV ── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-5"
        style={{ backgroundColor: 'transparent' }}
      >
        {/* Logo mark */}
        <div className="flex items-center gap-2.5">
          <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
            <polygon
              points="14,2 26,9.5 26,18.5 14,26 2,18.5 2,9.5"
              stroke={TEXT}
              strokeWidth="1.5"
              fill="none"
            />
          </svg>
          <span
            className="text-xs font-semibold tracking-[0.18em] uppercase"
            style={{ fontFamily: 'DM Sans, sans-serif', color: TEXT }}
          >
            LOGOS
          </span>
        </div>

        {/* Single CTA button — musee style "TICKETS" */}
        <button
          onClick={() => navigate('/dashboard')}
          className="text-xs tracking-[0.25em] uppercase transition-opacity hover:opacity-60"
          style={{ fontFamily: 'DM Sans, sans-serif', color: TEXT, fontWeight: 500 }}
        >
          시작하기
        </button>
      </nav>

      {/* ── HERO ── */}
      <div
        ref={heroRef}
        className="relative flex-1 flex flex-col"
        style={{ minHeight: '100vh', overflow: 'hidden' }}
      >
        {/* Pixel/Dot Grid — behind statue, centered */}
        <div
          className="absolute z-10 pointer-events-none"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'min(700px, 80vw)',
            height: 'min(600px, 70vh)',
          }}
        >
          <PixelDotGrid className="w-full h-full" />
        </div>

        {/* 3D Thinker — center, above pixel grid */}
        <div
          className="absolute z-20"
          style={{
            left: '50%',
            top: '45%',
            transform: 'translate(-50%, -50%)',
            width: 'min(380px, 48vw)',
            height: 'min(560px, 72vh)',
          }}
        >
          <ThinkerModel className="w-full h-full" />
        </div>

        {/* Top-center label */}
        <div
          className="absolute z-30 pointer-events-none"
          style={{ left: '50%', top: '7%', transform: 'translateX(-50%)', textAlign: 'center' }}
        >
          <div
            className="text-[0.6rem] tracking-[0.45em] uppercase"
            style={{ fontFamily: 'DM Sans, sans-serif', color: TEXT_MID }}
          >
            소크라테스 씽킹 코치
          </div>
        </div>

        {/* ── MARQUEE ROW 1 — bottom large text (musee style) ── */}
        {/* This is the hero text that bleeds off screen on both sides */}
        <div
          className="absolute z-40 pointer-events-none overflow-hidden"
          style={{
            bottom: '12%',
            left: 0,
            right: 0,
            whiteSpace: 'nowrap',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              animation: 'marquee-left 45s linear infinite',
              gap: 0,
            }}
          >
            {[...MARQUEE_LINE, ...MARQUEE_LINE].map((text, i) => (
              <span
                key={i}
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontWeight: 700,
                  fontSize: 'clamp(52px, 8.5vw, 120px)',
                  letterSpacing: '-0.02em',
                  color: TEXT,
                  paddingRight: '0.35em',
                  lineHeight: 1,
                }}
              >
                {text}
                {i < MARQUEE_LINE.length * 2 - 1 && (
                  <span style={{ opacity: 0.3, paddingLeft: '0.35em' }}>·</span>
                )}
              </span>
            ))}
          </div>
        </div>

        {/* CTA — center bottom, above marquee */}
        <div
          className="absolute z-50 flex flex-col items-center gap-3"
          style={{ bottom: '4%', left: '50%', transform: 'translateX(-50%)' }}
        >
          <button
            onClick={() => navigate('/dashboard')}
            className="px-8 py-3 text-xs tracking-[0.25em] uppercase font-semibold transition-all duration-200"
            style={{
              fontFamily: 'DM Sans, sans-serif',
              backgroundColor: TEXT,
              color: BG,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#3A3A28';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = TEXT;
            }}
          >
            생각을 시작하다
          </button>
        </div>

        {/* Side labels */}
        <div
          className="absolute left-5 top-1/2 -translate-y-1/2 z-30 pointer-events-none"
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
        >
          <span
            className="text-[0.55rem] tracking-[0.4em] uppercase"
            style={{ fontFamily: 'DM Sans, sans-serif', color: TEXT_MID }}
          >
            Thinking Coach
          </span>
        </div>
        <div
          className="absolute right-5 top-1/2 z-30 pointer-events-none"
          style={{
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            transform: 'translateY(-50%) rotate(180deg)',
          }}
        >
          <span
            className="text-[0.55rem] tracking-[0.4em] uppercase"
            style={{ fontFamily: 'DM Sans, sans-serif', color: TEXT_MID }}
          >
            2026 · LOGOS
          </span>
        </div>
      </div>

      {/* ── SECTION 2 — About (dark) ── */}
      <section
        className="py-36 px-8"
        style={{ backgroundColor: '#1E1E14', color: '#C5C9B4' }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-20 items-start">
            <div>
              <div
                className="text-[0.6rem] tracking-[0.45em] uppercase mb-8 opacity-40"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                About LOGOS
              </div>
              <h2
                className="text-4xl md:text-5xl font-bold leading-tight mb-10"
                style={{
                  fontFamily: "'Source Serif 4', Georgia, serif",
                  letterSpacing: '-0.02em',
                  fontWeight: 700,
                }}
              >
                AI가 답을 주는<br />시대의 역설
              </h2>
              <p
                className="text-sm leading-relaxed opacity-65 mb-5"
                style={{ fontFamily: 'DM Sans, sans-serif', lineHeight: 1.85 }}
              >
                모든 AI가 즉답을 제공하는 세상에서, LOGOS는 반대로 질문합니다.
                소크라테스가 아테네 광장에서 했던 것처럼 — 당신이 스스로 생각하게 만드는 것이 우리의 유일한 목표입니다.
              </p>
              <p
                className="text-sm leading-relaxed opacity-65"
                style={{ fontFamily: 'DM Sans, sans-serif', lineHeight: 1.85 }}
              >
                답을 찾는 것이 아니라, 올바른 질문을 발견하는 여정. 그것이 진정한 지적 성장입니다.
              </p>
            </div>
            <div className="space-y-10 pt-16">
              {[
                { label: '01', title: '사고의 주체성 회복', desc: 'AI가 답을 주는 시대에 스스로 생각하는 힘을 기릅니다.' },
                { label: '02', title: '논리적 확신', desc: '남의 논리가 아닌, 질문을 통해 스스로 발견한 결론에 도달합니다.' },
                { label: '03', title: '성장의 시각화', desc: '추상적인 사고 과정을 논리력 스코어로 수치화합니다.' },
              ].map((item) => (
                <div key={item.label} className="flex gap-6 items-start">
                  <span
                    className="text-xs tracking-[0.3em] opacity-25 mt-0.5 shrink-0"
                    style={{ fontFamily: 'DM Sans, sans-serif' }}
                  >
                    {item.label}
                  </span>
                  <div>
                    <h3
                      className="text-base font-semibold mb-2"
                      style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}
                    >
                      {item.title}
                    </h3>
                    <p
                      className="text-sm opacity-55 leading-relaxed"
                      style={{ fontFamily: 'DM Sans, sans-serif', lineHeight: 1.8 }}
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

      {/* ── SECTION 3 — 4단계 (sage green) ── */}
      <section
        className="py-36 px-8"
        style={{ backgroundColor: BG, color: TEXT }}
      >
        <div className="max-w-5xl mx-auto">
          <div
            className="text-[0.6rem] tracking-[0.45em] uppercase mb-8 opacity-40"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            Socratic Progression
          </div>
          <h2
            className="text-4xl md:text-5xl font-bold mb-20"
            style={{
              fontFamily: "'Source Serif 4', Georgia, serif",
              letterSpacing: '-0.02em',
              fontWeight: 700,
            }}
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
                className="pl-6 py-4"
                style={{
                  borderLeft: i > 0 ? '1px solid rgba(30,30,20,0.15)' : 'none',
                  paddingLeft: i === 0 ? 0 : '1.5rem',
                }}
              >
                <div
                  className="text-[0.55rem] tracking-[0.4em] uppercase opacity-35 mb-3"
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                >
                  {item.level}
                </div>
                <div
                  className="text-2xl font-bold mb-3"
                  style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontWeight: 700 }}
                >
                  {item.stage}
                </div>
                <p
                  className="text-sm italic opacity-65 mb-2 leading-relaxed"
                  style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
                >
                  "{item.question}"
                </p>
                <p
                  className="text-xs opacity-45"
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                >
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 4 — Pricing (very dark) ── */}
      <section
        className="py-36 px-8"
        style={{ backgroundColor: '#141410', color: '#C5C9B4' }}
      >
        <div className="max-w-4xl mx-auto">
          <div
            className="text-[0.6rem] tracking-[0.45em] uppercase mb-8 opacity-35"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            Subscription
          </div>
          <h2
            className="text-4xl md:text-5xl font-bold mb-16"
            style={{
              fontFamily: "'Source Serif 4', Georgia, serif",
              letterSpacing: '-0.02em',
              fontWeight: 700,
            }}
          >
            생각의 깊이에<br />투자하세요
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px" style={{ backgroundColor: 'rgba(197,201,180,0.1)' }}>
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
                  backgroundColor: plan.highlight ? '#C5C9B4' : '#141410',
                  color: plan.highlight ? '#141410' : '#C5C9B4',
                }}
              >
                <div
                  className="text-[0.6rem] tracking-[0.35em] uppercase mb-4 opacity-50"
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                >
                  {plan.plan}
                </div>
                <div className="flex items-baseline gap-1 mb-8">
                  <span
                    className="text-4xl font-bold"
                    style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontWeight: 700 }}
                  >
                    {plan.price}
                  </span>
                  <span className="text-sm opacity-50" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                    {plan.period}
                  </span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <span className="opacity-35" style={{ fontFamily: 'DM Sans, sans-serif' }}>—</span>
                      <span style={{ fontFamily: 'DM Sans, sans-serif', opacity: 0.75 }}>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="w-full py-3 text-xs tracking-[0.25em] uppercase font-semibold border transition-all duration-200"
                  style={{
                    fontFamily: 'DM Sans, sans-serif',
                    borderColor: plan.highlight ? '#141410' : 'rgba(197,201,180,0.3)',
                    backgroundColor: 'transparent',
                    color: plan.highlight ? '#141410' : '#C5C9B4',
                  }}
                  onMouseEnter={(e) => {
                    const btn = e.currentTarget;
                    if (plan.highlight) {
                      btn.style.backgroundColor = '#141410';
                      btn.style.color = '#C5C9B4';
                    } else {
                      btn.style.backgroundColor = 'rgba(197,201,180,0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    const btn = e.currentTarget;
                    btn.style.backgroundColor = 'transparent';
                    btn.style.color = plan.highlight ? '#141410' : '#C5C9B4';
                  }}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer
        className="py-10 px-8 flex items-center justify-between"
        style={{ backgroundColor: BG, color: TEXT }}
      >
        <div className="flex items-center gap-2.5">
          <svg width="18" height="18" viewBox="0 0 28 28" fill="none">
            <polygon points="14,2 26,9.5 26,18.5 14,26 2,18.5 2,9.5" stroke={TEXT} strokeWidth="1.5" fill="none" />
          </svg>
          <span
            className="text-xs tracking-[0.2em] uppercase opacity-50"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            LOGOS © 2026
          </span>
        </div>
        <div
          className="text-xs tracking-[0.15em] uppercase opacity-35"
          style={{ fontFamily: 'DM Sans, sans-serif' }}
        >
          생각하는 힘을 기르다
        </div>
      </footer>

      {/* ── CSS ANIMATIONS ── */}
      <style>{`
        @keyframes marquee-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
