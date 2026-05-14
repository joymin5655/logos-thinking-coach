/*
 * Landing.tsx — LOGOS 랜딩 페이지
 *
 * Design Philosophy: UIMIX 스타일 — 기술적 엄밀함 + 지적 권위
 * ─────────────────────────────────────────────
 * Palette: Black (#0A0A0A) + Cream (#F0EBE0) + Accent (#C8C0A8)
 * Typography: Space Mono (UI/라벨) + Source Serif 4 (제목)
 * Header: 로고(좌) | 마퀴 텍스트(중앙 flex-1) | CTA(우) — 단일 행
 * Hero: 순수 검정 배경, 3D 동상 우측 배치, 좌측 텍스트 블록
 */
import { useRef, useCallback, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import ThinkerModel from '@/components/ThinkerModel';
import SpotlightBeam from '@/components/SpotlightBeam';

// ── 팔레트 ──
const BLACK = '#0A0A0A';
const CREAM = '#F0EBE0';
const CREAM_MID = 'rgba(240,235,224,0.55)';
const CREAM_DIM = 'rgba(240,235,224,0.25)';
const ACCENT = '#C8C0A8';

// ── 마퀴 텍스트 ──
const MARQUEE_TEXT =
  'LOGOS · 생각의 코치 · THINK DEEPER · 소크라테스 · APORIA · 논리적 확신 · ';

export default function Landing() {
  const [, navigate] = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);
  const smoothMouse = useRef({ x: 0.5, y: 0.5 });
  const rafRef = useRef<number>(0);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    smoothMouse.current = { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      el.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, [handleMouseMove]);

  return (
    <div
      ref={containerRef}
      style={{
        backgroundColor: BLACK,
        color: CREAM,
        minHeight: '100vh',
        overflow: 'hidden',
        position: 'relative',
        fontFamily: "'Space Mono', monospace",
      }}
    >
      {/* ── NAV — 단일 행: 로고 | 마퀴(중앙) | CTA ── */}
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          backgroundColor: 'rgba(10,10,10,0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${CREAM_DIM}`,
          display: 'flex',
          alignItems: 'center',
          height: 52,
          overflow: 'hidden',
        }}
      >
        {/* 로고 영역 — 좌측 고정 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '0 24px',
            flexShrink: 0,
            borderRight: `1px solid ${CREAM_DIM}`,
            height: '100%',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 22 22" fill="none">
            <polygon
              points="11,1.5 20.5,7.5 17.5,18.5 4.5,18.5 1.5,7.5"
              stroke={CREAM}
              strokeWidth="1.3"
              fill="none"
            />
          </svg>
          <span
            style={{
              fontFamily: "'Space Mono', monospace",
              fontWeight: 700,
              fontSize: '12px',
              letterSpacing: '0.22em',
              color: CREAM,
              whiteSpace: 'nowrap',
            }}
          >
            LOGOS
          </span>
          <div style={{ width: 1, height: 10, backgroundColor: CREAM_DIM }} />
          <span
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: '8px',
              letterSpacing: '0.15em',
              color: CREAM_MID,
              whiteSpace: 'nowrap',
            }}
          >
            EST. 2026
          </span>
        </div>

        {/* 마퀴 텍스트 — 중앙 flex-1, 양쪽 페이드 마스크 */}
        <div
          style={{
            flex: 1,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            position: 'relative',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            /* 양쪽 끝 페이드 아웃 */
            maskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
          }}
        >
          <div
            style={{
              display: 'inline-block',
              animation: 'logos-marquee-left 22s linear infinite',
              willChange: 'transform',
            }}
          >
            {[MARQUEE_TEXT, MARQUEE_TEXT, MARQUEE_TEXT, MARQUEE_TEXT].map((t, i) => (
              <span
                key={i}
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontWeight: 400,
                  fontSize: '9px',
                  letterSpacing: '0.2em',
                  color: CREAM_MID,
                  display: 'inline-block',
                  textTransform: 'uppercase',
                  paddingRight: 0,
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* CTA 버튼 — 우측 고정 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0 24px',
            flexShrink: 0,
            borderLeft: `1px solid ${CREAM_DIM}`,
            height: '100%',
          }}
        >
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              fontFamily: "'Space Mono', monospace",
              fontWeight: 700,
              fontSize: '9px',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: BLACK,
              backgroundColor: CREAM,
              border: 'none',
              padding: '7px 16px',
              cursor: 'pointer',
              transition: 'background-color 0.18s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = ACCENT; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = CREAM; }}
          >
            시작하기
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100vh',
          overflow: 'hidden',
          backgroundColor: BLACK,
        }}
      >
        {/* ── 코너 프레임 장식 ── */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: 48, height: 48, borderTop: `2px solid ${CREAM_DIM}`, borderLeft: `2px solid ${CREAM_DIM}`, zIndex: 50 }} />
        <div style={{ position: 'absolute', top: 0, right: 0, width: 48, height: 48, borderTop: `2px solid ${CREAM_DIM}`, borderRight: `2px solid ${CREAM_DIM}`, zIndex: 50 }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: 48, height: 48, borderBottom: `2px solid ${CREAM_DIM}`, borderLeft: `2px solid ${CREAM_DIM}`, zIndex: 50 }} />
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 48, height: 48, borderBottom: `2px solid ${CREAM_DIM}`, borderRight: `2px solid ${CREAM_DIM}`, zIndex: 50 }} />

        {/* ── 3D 동상 + 스포트라이트 — 우측 배치 ── */}
        <div
          style={{
            position: 'absolute',
            zIndex: 15,
            right: '3%',
            top: '-2%',
            width: 'clamp(320px, 42vw, 640px)',
            height: '108vh',
            pointerEvents: 'none',
          }}
        >
          <ThinkerModel className="w-full h-full" />
          {/* 스포트라이트 빔 오버레이 — 동상 위에서 내려오는 크림/골드 빔 */}
          <SpotlightBeam color="cream" style={{ zIndex: 25 }} />
        </div>

        {/* ── 좌측 텍스트 블록 ── */}
        <div
          style={{
            position: 'absolute',
            zIndex: 30,
            left: '6%',
            top: '50%',
            transform: 'translateY(-50%)',
            maxWidth: 460,
          }}
        >
          {/* 상단 구분선 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, opacity: 0.55 }}>
            <div style={{ width: 28, height: 1, backgroundColor: CREAM }} />
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', letterSpacing: '0.2em', color: CREAM }}>001</span>
            <div style={{ flex: 1, height: 1, backgroundColor: CREAM, opacity: 0.3 }} />
          </div>

          {/* dither 패턴 사이드바 */}
          <div style={{ position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                left: -16,
                top: 0,
                bottom: 0,
                width: 4,
                backgroundImage: `repeating-linear-gradient(0deg, transparent 0px, transparent 1px, ${CREAM} 1px, ${CREAM} 2px), repeating-linear-gradient(90deg, transparent 0px, transparent 1px, ${CREAM} 1px, ${CREAM} 2px)`,
                backgroundSize: '3px 3px',
                opacity: 0.3,
              }}
            />
            <h1
              style={{
                fontFamily: "'Space Mono', monospace",
                fontWeight: 700,
                fontSize: 'clamp(2.4rem, 5vw, 4.2rem)',
                letterSpacing: '0.06em',
                lineHeight: 1.05,
                color: CREAM,
                marginBottom: 8,
                textTransform: 'uppercase',
              }}
            >
              THINK
              <span style={{ display: 'block', color: CREAM, marginTop: 4, opacity: 0.88 }}>
                DEEPER
              </span>
            </h1>
          </div>

          {/* 도트 패턴 */}
          <div style={{ display: 'flex', gap: 3, marginBottom: 16, opacity: 0.35 }}>
            {Array.from({ length: 36 }).map((_, i) => (
              <div key={i} style={{ width: 2, height: 2, backgroundColor: CREAM, borderRadius: '50%' }} />
            ))}
          </div>

          {/* 설명 텍스트 */}
          <div style={{ position: 'relative' }}>
            <p
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: '11px',
                lineHeight: 1.85,
                color: CREAM_MID,
                marginBottom: 28,
                letterSpacing: '0.04em',
              }}
            >
              소크라테스의 문답법으로 논리의 빈틈을 발견하고<br />
              더 깊이 사고하는 힘을 기릅니다.
            </p>
            <div
              style={{
                position: 'absolute',
                right: -12,
                top: '50%',
                width: 10,
                height: 10,
                border: `1px solid ${CREAM}`,
                opacity: 0.25,
                transform: 'translateY(-50%)',
              }}
            >
              <div style={{ position: 'absolute', top: '50%', left: '50%', width: 3, height: 3, backgroundColor: CREAM, transform: 'translate(-50%, -50%)', opacity: 0.6 }} />
            </div>
          </div>

          {/* CTA 버튼 */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                position: 'relative',
                padding: '10px 22px',
                fontFamily: "'Space Mono', monospace",
                fontWeight: 700,
                fontSize: '9px',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: BLACK,
                backgroundColor: CREAM,
                border: `1px solid ${CREAM}`,
                cursor: 'pointer',
                transition: 'all 0.18s',
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = ACCENT; e.currentTarget.style.borderColor = ACCENT; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = CREAM; e.currentTarget.style.borderColor = CREAM; }}
            >
              <span style={{ position: 'absolute', top: -4, left: -4, width: 7, height: 7, borderTop: `1px solid ${CREAM}`, borderLeft: `1px solid ${CREAM}` }} />
              <span style={{ position: 'absolute', bottom: -4, right: -4, width: 7, height: 7, borderBottom: `1px solid ${CREAM}`, borderRight: `1px solid ${CREAM}` }} />
              시작하기
            </button>
            <button
              onClick={() => { document.getElementById('about-section')?.scrollIntoView({ behavior: 'smooth' }); }}
              style={{
                padding: '10px 22px',
                fontFamily: "'Space Mono', monospace",
                fontWeight: 400,
                fontSize: '9px',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: CREAM,
                backgroundColor: 'transparent',
                border: `1px solid ${CREAM_DIM}`,
                cursor: 'pointer',
                transition: 'all 0.18s',
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = CREAM_DIM; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              더 알아보기
            </button>
          </div>

          {/* 하단 기술 주석 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 24, opacity: 0.35 }}>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: CREAM }}>∞</span>
            <div style={{ flex: 1, height: 1, backgroundColor: CREAM, opacity: 0.3 }} />
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', color: CREAM, letterSpacing: '0.15em' }}>SOCRATIC METHOD</span>
          </div>
        </div>

        {/* ── 수직 사이드 레이블 ── */}
        <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', zIndex: 40, writingMode: 'vertical-rl', pointerEvents: 'none' }}>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '7px', letterSpacing: '0.45em', textTransform: 'uppercase', color: CREAM_DIM }}>Thinking Coach</span>
        </div>
        <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%) rotate(180deg)', zIndex: 40, writingMode: 'vertical-rl', pointerEvents: 'none' }}>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '7px', letterSpacing: '0.45em', textTransform: 'uppercase', color: CREAM_DIM }}>2026 · LOGOS</span>
        </div>

        {/* ── 하단 푸터 바 ── */}
        <div
          style={{
            position: 'absolute',
            bottom: 0, left: 0, right: 0,
            zIndex: 50,
            borderTop: `1px solid ${CREAM_DIM}`,
            backgroundColor: 'rgba(10,10,10,0.7)',
            backdropFilter: 'blur(8px)',
            padding: '8px 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontFamily: "'Space Mono', monospace", fontSize: '8px', color: CREAM_DIM, letterSpacing: '0.1em' }}>
            <span>SYSTEM.ACTIVE</span>
            <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
              {[8, 14, 6, 10, 12, 5, 9, 7].map((h, i) => (
                <div key={i} style={{ width: 2, height: h, backgroundColor: CREAM_DIM }} />
              ))}
            </div>
            <span>V1.0.0</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: "'Space Mono', monospace", fontSize: '8px', color: CREAM_DIM }}>
            <span>◐ RENDERING</span>
            <div style={{ display: 'flex', gap: 3 }}>
              {[0, 0.2, 0.4].map((delay, i) => (
                <div key={i} style={{ width: 4, height: 4, backgroundColor: CREAM, borderRadius: '50%', opacity: 0.6 - i * 0.15, animation: `pulse-dot 1.4s ease-in-out ${delay}s infinite` }} />
              ))}
            </div>
            <span>FRAME: ∞</span>
          </div>
        </div>
      </div>

      {/* ── SECTION 2 — About ── */}
      <section id="about-section" style={{ backgroundColor: CREAM, color: BLACK, padding: '10rem 2rem' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '3rem', opacity: 0.4 }}>
            <div style={{ width: 28, height: 1, backgroundColor: BLACK }} />
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', letterSpacing: '0.25em', color: BLACK }}>002</span>
            <div style={{ flex: 1, height: 1, backgroundColor: BLACK, opacity: 0.2 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5rem', alignItems: 'start' }}>
            <div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', letterSpacing: '0.42em', textTransform: 'uppercase', opacity: 0.38, marginBottom: '1.5rem', color: BLACK }}>About LOGOS</div>
              <h2 style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontWeight: 600, fontSize: 'clamp(2rem, 4vw, 3.4rem)', letterSpacing: '-0.025em', lineHeight: 1.12, marginBottom: '2.5rem', color: BLACK }}>
                소크라테스가<br />AI가 되다
              </h2>
              <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', lineHeight: 1.9, opacity: 0.65, maxWidth: '420px', color: BLACK, letterSpacing: '0.02em' }}>
                LOGOS는 2,400년 전 아테네의 소크라테스 문답법을 현대 AI로 재현합니다.
                당신의 논리에서 빈틈을 찾아내고, 더 깊이 생각하도록 이끕니다.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', paddingTop: '3.5rem' }}>
              {[
                { num: '01', title: '소크라테스 문답', desc: '질문을 통해 논리의 빈틈을 스스로 발견하게 합니다.' },
                { num: '02', title: '논리력 스코어링', desc: '세션 후 논리적 일관성, 근거 충분성을 수치로 분석합니다.' },
                { num: '03', title: '성장 추적', desc: '매 세션의 변화를 시각화하여 사고력 성장을 확인합니다.' },
              ].map((item) => (
                <div key={item.num} style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', paddingBottom: '2.5rem', borderBottom: '1px solid rgba(10,10,10,0.12)' }}>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', letterSpacing: '0.22em', opacity: 0.3, paddingTop: '4px', minWidth: '24px', color: BLACK }}>{item.num}</span>
                  <div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: '11px', letterSpacing: '0.08em', marginBottom: '0.5rem', color: BLACK, textTransform: 'uppercase' }}>{item.title}</div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', opacity: 0.55, lineHeight: 1.7, color: BLACK }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 3 — Features ── */}
      <section style={{ backgroundColor: '#0F0F0F', color: CREAM, padding: '10rem 2rem' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '3rem', opacity: 0.35 }}>
            <div style={{ width: 28, height: 1, backgroundColor: CREAM }} />
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', letterSpacing: '0.25em', color: CREAM }}>003</span>
            <div style={{ flex: 1, height: 1, backgroundColor: CREAM, opacity: 0.15 }} />
          </div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', letterSpacing: '0.42em', textTransform: 'uppercase', opacity: 0.32, marginBottom: '1.5rem', color: CREAM }}>Features</div>
          <h2 style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontWeight: 600, fontSize: 'clamp(2rem, 4vw, 3.2rem)', letterSpacing: '-0.02em', marginBottom: '5rem', maxWidth: '520px', color: CREAM }}>
            논리의 빈틈을<br />스스로 발견하다
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', backgroundColor: CREAM_DIM }}>
            {[
              { icon: '◎', title: '소크라테스 코칭', desc: '반박 질문, 가정 도전, 증거 요구를 통해 논리를 단련합니다.' },
              { icon: '◈', title: '실시간 논리 분석', desc: '대화 중 논리적 오류와 빈틈을 즉시 감지하고 피드백합니다.' },
              { icon: '◉', title: '성장 대시보드', desc: '논리력 스코어, 세션 기록, 성장 그래프를 한눈에 확인합니다.' },
            ].map((f) => (
              <div key={f.title} style={{ padding: '3rem 2.5rem', backgroundColor: '#0F0F0F', borderTop: `1px solid ${CREAM_DIM}` }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '18px', marginBottom: '1.5rem', opacity: 0.5, color: CREAM }}>{f.icon}</div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: '10px', letterSpacing: '0.12em', marginBottom: '0.75rem', color: CREAM, textTransform: 'uppercase' }}>{f.title}</div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', opacity: 0.48, lineHeight: 1.75, color: CREAM }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 4 — Pricing ── */}
      <section style={{ backgroundColor: CREAM, color: BLACK, padding: '10rem 2rem' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '3rem', opacity: 0.35 }}>
            <div style={{ width: 28, height: 1, backgroundColor: BLACK }} />
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', letterSpacing: '0.25em', color: BLACK }}>004</span>
            <div style={{ flex: 1, height: 1, backgroundColor: BLACK, opacity: 0.15 }} />
          </div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', letterSpacing: '0.42em', textTransform: 'uppercase', opacity: 0.32, marginBottom: '1.5rem', color: BLACK }}>Subscription</div>
          <h2 style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontWeight: 600, fontSize: 'clamp(2rem, 4vw, 3.2rem)', letterSpacing: '-0.02em', marginBottom: '4rem', color: BLACK }}>
            생각의 깊이에<br />투자하세요
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', backgroundColor: 'rgba(10,10,10,0.12)' }}>
            {[
              { plan: 'Free', price: '₩0', period: '/월', features: ['일 3회 씽킹 세션', '기본 논리력 스코어', '세션 기록 7일'], cta: '무료로 시작', highlight: false },
              { plan: 'Pro', price: '₩9,900', period: '/월', features: ['무제한 씽킹 세션', '상세 논리력 분석', '무제한 세션 기록', '성장 추이 그래프', '개선 피드백'], cta: '지금 시작하기', highlight: true },
              { plan: 'Team', price: '₩49,000', period: '/월 (5인)', features: ['Pro 기능 전체', '팀 논리력 비교', '관리자 대시보드', '맞춤 세션 설계', '전담 지원'], cta: '팀 플랜 문의', highlight: false },
            ].map((plan) => (
              <div key={plan.plan} style={{ padding: '2.5rem', backgroundColor: plan.highlight ? BLACK : CREAM, color: plan.highlight ? CREAM : BLACK }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', letterSpacing: '0.32em', textTransform: 'uppercase', opacity: 0.45, marginBottom: '1rem' }}>{plan.plan}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '2rem' }}>
                  <span style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontWeight: 700, fontSize: '2.2rem' }}>{plan.price}</span>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', opacity: 0.45 }}>{plan.period}</span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem 0', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {plan.features.map((f) => (
                    <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: "'Space Mono', monospace", fontSize: '10px', opacity: 0.72 }}>
                      <span style={{ opacity: 0.35 }}>—</span>{f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate('/dashboard')}
                  style={{ width: '100%', padding: '12px', fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: '9px', letterSpacing: '0.22em', textTransform: 'uppercase', border: `1px solid ${plan.highlight ? CREAM : 'rgba(10,10,10,0.25)'}`, backgroundColor: 'transparent', color: plan.highlight ? CREAM : BLACK, cursor: 'pointer', transition: 'all 0.18s' }}
                  onMouseEnter={e => { if (plan.highlight) { e.currentTarget.style.backgroundColor = CREAM; e.currentTarget.style.color = BLACK; } else { e.currentTarget.style.backgroundColor = 'rgba(10,10,10,0.06)'; } }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = plan.highlight ? CREAM : BLACK; }}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ backgroundColor: BLACK, color: CREAM, padding: '2rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `1px solid ${CREAM_DIM}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="14" height="14" viewBox="0 0 22 22" fill="none">
            <polygon points="11,1.5 20.5,7.5 17.5,18.5 4.5,18.5 1.5,7.5" stroke={CREAM} strokeWidth="1.3" fill="none" />
          </svg>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.45, color: CREAM }}>LOGOS © 2026</span>
        </div>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.28, color: CREAM }}>생각하는 힘을 기르다</div>
      </footer>

      {/* ── KEYFRAMES ── */}
      <style>{`
        @keyframes logos-marquee-left {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}
