/*
 * Landing.tsx — LOGOS Hero (랜딩 / 라우트: /)
 *
 * Hero 전용. About / Features / Pricing 은 별도 라우트.
 * 공통 nav/footer는 MarketingLayout에서 처리.
 */
import { useRef, useCallback, useEffect } from 'react';
import { useLocation } from 'wouter';
import MarketingLayout from '@/components/MarketingLayout';
import ThinkerModel from '@/components/ThinkerModel';
import SpotlightBeam from '@/components/SpotlightBeam';
import { SEMANTIC, SEMANTIC_DARK } from '@/lib/colors';

const BLACK = '#0A0A0A';
const CREAM = '#F0EBE0';
const CREAM_MID = 'rgba(240,235,224,0.55)';
const CREAM_DIM = 'rgba(240,235,224,0.25)';
const ACCENT = SEMANTIC.draw;       // vivid gold
const HIGHLIGHT = SEMANTIC.insight; // brighter gold

const MARQUEE_TEXT =
  'LOGOS · 생각의 코치 · THINK DEEPER · 소크라테스 · APORIA · 논리적 확신 · ';

const ENTRY_CARDS = [
  { no: '01', title: '결정을 앞두고', body: '이직, 이사, 투자처럼 쉽게 못 정하는 일. 답을 받는 대신 내가 뭘 확신하는지부터 짚어 봐요.', cta: '코칭 세션 시작', to: '/dashboard/session' },
  { no: '02', title: '글·발표 전에 논리 점검', body: '쓰려는 주장을 주제로 넣으면 빈틈과 숨은 전제를 질문으로 찾아 줘요.', cta: '주장 점검하기', to: '/dashboard/session' },
  { no: '03', title: '매일 10분 논증 습관', body: '오늘의 주제에 입장을 정하고 세 번의 반문을 받아요. 연속 기록과 점수 변화가 남아요.', cta: '오늘의 논증', to: '/dashboard/argue' },
];

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

  const heroFooter = (
    <footer
      style={{
        borderTop: `1px solid ${CREAM_DIM}`,
        backgroundColor: BLACK,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 마퀴 스트립 */}
      <div
        style={{
          height: 24,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          borderBottom: `1px solid ${CREAM_DIM}`,
          maskImage: 'linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)',
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
                fontFamily: "var(--font-mono)",
                fontWeight: 400,
                fontSize: '9px',
                letterSpacing: '0.2em',
                color: CREAM_MID,
                display: 'inline-block',
                textTransform: 'uppercase',
              }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* SYSTEM 정보 행 */}
      <div
        style={{
          padding: '10px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontFamily: "var(--font-mono)", fontSize: '9px', color: CREAM_DIM, letterSpacing: '0.1em' }}>
          <span>SYSTEM.ACTIVE</span>
          <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
            {[8, 14, 6, 10, 12, 5, 9, 7].map((h, i) => (
              <div key={i} style={{ width: 2, height: h, backgroundColor: CREAM_DIM }} />
            ))}
          </div>
          <span>V1.0.0</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: "var(--font-mono)", fontSize: '9px', color: CREAM_DIM }}>
          <span>◐ RENDERING</span>
          <div style={{ display: 'flex', gap: 3 }}>
            {[0, 0.2, 0.4].map((delay, i) => (
              <div key={i} style={{ width: 4, height: 4, backgroundColor: CREAM, borderRadius: '50%', opacity: 0.6 - i * 0.15, animation: `pulse-dot 1.4s ease-in-out ${delay}s infinite` }} />
            ))}
          </div>
          <span>FRAME: ∞</span>
        </div>
      </div>
    </footer>
  );

  return (
    <MarketingLayout footer={heroFooter}>
      {/* ── HERO ── (한 화면 높이 고정, 아래에 소개 섹션이 이어진다) */}
      <div style={{ height: 'calc(100dvh / var(--ui-scale) - 44px)', minHeight: 560 }}>
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          backgroundColor: BLACK,
        }}
      >
        {/* 코너 프레임 장식 */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: 48, height: 48, borderTop: `2px solid ${CREAM_DIM}`, borderLeft: `2px solid ${CREAM_DIM}`, zIndex: 50 }} />
        <div style={{ position: 'absolute', top: 0, right: 0, width: 48, height: 48, borderTop: `2px solid ${CREAM_DIM}`, borderRight: `2px solid ${CREAM_DIM}`, zIndex: 50 }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: 48, height: 48, borderBottom: `2px solid ${CREAM_DIM}`, borderLeft: `2px solid ${CREAM_DIM}`, zIndex: 50 }} />
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 48, height: 48, borderBottom: `2px solid ${CREAM_DIM}`, borderRight: `2px solid ${CREAM_DIM}`, zIndex: 50 }} />

        {/* 3D 동상 + 스포트라이트 — 우측 (zoom 미적용) */}
        <div
          className="ui-scale-reset"
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
          <SpotlightBeam color="cream" style={{ zIndex: 25 }} />
        </div>

        {/* 좌측 텍스트 블록 */}
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
          {/* 상단 구분선 + 슬로건 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, opacity: 0.55 }}>
            <div style={{ width: 28, height: 1, backgroundColor: CREAM }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: '12px', letterSpacing: '0.2em', color: ACCENT }}>001</span>
            <div style={{ flex: 1, height: 1, backgroundColor: CREAM, opacity: 0.3 }} />
          </div>

          {/* Primary Slogan (영문) — The AI That Never Answers */}
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: '0.34em',
              textTransform: 'uppercase',
              color: ACCENT,
              marginBottom: 18,
            }}
          >
            The AI That Never Answers
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
                fontFamily: "var(--font-mono)",
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
                fontFamily: "var(--font-mono)",
                fontSize: '14px',
                lineHeight: 1.85,
                color: CREAM_MID,
                marginBottom: 28,
                letterSpacing: '0.04em',
              }}
            >
              <strong style={{ color: HIGHLIGHT, fontWeight: 700 }}>스스로 납득하는 힘.</strong><br />
              소크라테스의 문답법으로 당신은<br />
              논리의 빈틈을 스스로 발견하고 더 깊이 사고합니다.
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
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontSize: '12px',
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
              onClick={() => navigate('/about')}
              style={{
                padding: '10px 22px',
                fontFamily: "var(--font-mono)",
                fontWeight: 400,
                fontSize: '12px',
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
            <span style={{ fontFamily: "var(--font-mono)", fontSize: '12px', color: CREAM }}>∞</span>
            <div style={{ flex: 1, height: 1, backgroundColor: CREAM, opacity: 0.3 }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: '12px', color: CREAM, letterSpacing: '0.15em' }}>SOCRATIC METHOD</span>
          </div>
        </div>

        {/* 수직 사이드 레이블 */}
        <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', zIndex: 40, writingMode: 'vertical-rl', pointerEvents: 'none' }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: '10px', letterSpacing: '0.45em', textTransform: 'uppercase', color: CREAM_DIM }}>Thinking Coach</span>
        </div>
        <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%) rotate(180deg)', zIndex: 40, writingMode: 'vertical-rl', pointerEvents: 'none' }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: '10px', letterSpacing: '0.45em', textTransform: 'uppercase', color: CREAM_DIM }}>2026 · LOGOS</span>
        </div>

      </div>
      </div>

      {/* ── 진입 동기 ── */}
      <section aria-labelledby="entry-heading" style={{ backgroundColor: BLACK, color: CREAM, padding: '4rem 1.25rem', borderTop: `1px solid ${CREAM_DIM}` }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.4em', textTransform: 'uppercase', color: ACCENT, marginBottom: 10 }}>Why people start</div>
          <h2 id="entry-heading" style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 'clamp(1.4rem, 2.6vw, 2rem)', letterSpacing: '-0.02em', margin: '0 0 1.5rem' }}>
            이럴 때 LOGOS를 찾아요
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 1, backgroundColor: CREAM_DIM }}>
            {ENTRY_CARDS.map((c) => (
              <button
                key={c.title}
                type="button"
                onClick={() => navigate(c.to)}
                style={{ textAlign: 'left', backgroundColor: BLACK, color: CREAM, border: 'none', padding: '1.5rem', cursor: 'pointer', display: 'grid', gap: 10, alignContent: 'start' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#141414'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = BLACK; }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.3em', color: CREAM_MID }}>{c.no}</span>
                <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 20 }}>{c.title}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.8, color: CREAM_MID }}>{c.body}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em', color: CREAM }}>{c.cta} →</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── 같은 고민, 다른 대화 ── */}
      <section aria-labelledby="compare-heading" style={{ backgroundColor: CREAM, color: BLACK, padding: '4rem 1.25rem' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.4em', textTransform: 'uppercase', color: SEMANTIC_DARK.draw, marginBottom: 10 }}>Compare</div>
          <h2 id="compare-heading" style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 'clamp(1.4rem, 2.6vw, 2rem)', letterSpacing: '-0.02em', margin: '0 0 1.25rem' }}>
            같은 고민, 다른 대화
          </h2>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 18, margin: '0 0 1.25rem', padding: '0.75rem 1rem', borderLeft: `3px solid ${BLACK}`, backgroundColor: 'rgba(10,10,10,0.05)' }}>
            “이직을 지금 해야 할까요?”
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            <div style={{ border: '1px solid rgba(10,10,10,0.2)', padding: '1.25rem', display: 'grid', gap: 10, alignContent: 'start' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.55)' }}>일반 AI</div>
              <ul style={{ margin: 0, paddingLeft: '1.1em', display: 'grid', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.8 }}>
                <li>연봉, 성장 가능성, 근무 환경을 표로 비교해 보세요.</li>
                <li>업계 상황이 좋을 때 옮기는 편이 유리합니다.</li>
                <li>지금 회사의 불만이 해결 가능한지 먼저 점검해 보세요.</li>
              </ul>
              <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'rgba(10,10,10,0.55)' }}>그럴듯한 답이 바로 나옵니다. 생각은 내가 아니라 AI가 했어요.</p>
            </div>
            <div style={{ border: `1px solid ${BLACK}`, backgroundColor: BLACK, color: CREAM, padding: '1.25rem', display: 'grid', gap: 10, alignContent: 'start' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: ACCENT }}>LOGOS</div>
              <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 20, lineHeight: 1.5 }}>지금 회사에서 가장 확신하는 불만 한 가지는 무엇인가요?</p>
              <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 11, color: CREAM_MID, lineHeight: 1.7 }}>LOGOS는 답을 주지 않아요. 질문 하나만 돌려줍니다. 결론은 당신이 내립니다.</p>
            </div>
          </div>
          <div style={{ marginTop: '1.5rem' }}>
            <button
              type="button"
              onClick={() => navigate('/dashboard/session')}
              style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', padding: '10px 22px', backgroundColor: BLACK, color: CREAM, border: `1px solid ${BLACK}`, cursor: 'pointer' }}
            >
              내 고민으로 해보기
            </button>
          </div>
        </div>
      </section>

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); }
        }
      `}</style>
    </MarketingLayout>
  );
}
