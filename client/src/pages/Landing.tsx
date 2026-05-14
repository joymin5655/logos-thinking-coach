/*
 * Landing.tsx — LOGOS 랜딩 페이지
 *
 * 유니콘 스튜디오 정밀 재현:
 * ─────────────────────────────────────────────
 * Background: #C8C8B6 (정확한 값), Speed:25, Track mouse
 * Model: venus_demilo → The Thinker GLB, Matcap, Scale:186.5
 *   Position X:52.1 Y:116 Z:-58, Rotation X:180 Y:179
 *   Animation Speed:50, Axis Y:43
 *   Interactivity: Position/Rotation/Light:22, Momentum:100
 * Glyph Dither: Waffle preset, .;-=+*#%@, Scale:69, Gamma:44
 *   Mix:100, Color mode:Texture, Background:ON
 *   Shape 46.6×46.7%, Position X:50 Y:65.4
 * Text (Musee d'Or): Font Outfit Regular, Size:18.6, Line-height:83
 *   Letterspacing:-4.5, Fill:#262618, Width:92.8%
 *   Position X:50 Y:75.4
 * Projection: Repeat Horiz., Speed X:50, Scale:1, Skew:100
 */
import { useRef, useCallback, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import ThinkerModel from '@/components/ThinkerModel';
import PixelDotGrid from '@/components/PixelDotGrid';

// Exact background color from unicorn studio
const BG = '#C8C8B6';
// Text fill: #262618 (from unicorn studio text settings)
const TEXT = '#262618';
const TEXT_MID = 'rgba(38,38,24,0.4)';

// Marquee text — Outfit font, matching "Musee d'Or" style
// Unicorn: single scrolling text "Musee d' Or" repeated
const MARQUEE_TEXT = [
  "LOGOS · 생각의 코치 · THINK DEEPER · 소크라테스 · APORIA · 논리적 확신 · LOGOS · 생각의 코치 · THINK DEEPER · 소크라테스 · APORIA · 논리적 확신 · ",
  "LOGOS · 생각의 코치 · THINK DEEPER · 소크라테스 · APORIA · 논리적 확신 · LOGOS · 생각의 코치 · THINK DEEPER · 소크라테스 · APORIA · 논리적 확신 · ",
];

export default function Landing() {
  const [, navigate] = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });
  // Smooth mouse with momentum (Momentum:100 in unicorn)
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
    // Momentum interpolation loop
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    let cur = { x: 0.5, y: 0.5 };
    const tick = () => {
      // Momentum:100 → slow lerp factor (spring-like)
      cur.x = lerp(cur.x, smoothMouse.current.x, 0.04);
      cur.y = lerp(cur.y, smoothMouse.current.y, 0.04);
      setMouse({ x: cur.x, y: cur.y });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      el.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, [handleMouseMove]);

  // Parallax offset for background (Track mouse: Speed:25)
  const bgShiftX = (mouse.x - 0.5) * -12;
  const bgShiftY = (mouse.y - 0.5) * -8;

  return (
    <div
      ref={containerRef}
      style={{
        backgroundColor: BG,
        color: TEXT,
        minHeight: '100vh',
        overflow: 'hidden',
        position: 'relative',
        fontFamily: "'Outfit', sans-serif",
        cursor: 'default',
      }}
    >
      {/* ── NAV ── */}
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding: '22px 30px',
          pointerEvents: 'none',
        }}
      >
        {/* Pentagon logo — top left (matches unicorn studio pentagon icon) */}
        <div style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
            <polygon
              points="11,1.5 20.5,7.5 17.5,18.5 4.5,18.5 1.5,7.5"
              stroke={TEXT}
              strokeWidth="1.3"
              fill="none"
            />
          </svg>
        </div>

        {/* "TICKETS" equivalent — top right */}
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            pointerEvents: 'auto',
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 400,
            fontSize: '11px',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: TEXT,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            opacity: 1,
            transition: 'opacity 0.18s',
            padding: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.45'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
        >
          시작하기
        </button>
      </nav>

      {/* ── HERO ── */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100vh',
          overflow: 'hidden',
        }}
      >
        {/* Background parallax layer (Track mouse: Speed:25) */}
        <div
          style={{
            position: 'absolute',
            inset: '-5%',
            backgroundColor: BG,
            transform: `translate(${bgShiftX}px, ${bgShiftY}px)`,
            transition: 'transform 0.05s linear',
            zIndex: 0,
          }}
        />

        {/* ── MODEL + GLYPH DITHER (same container for 1:1 coordinate mapping) ──
            Unicorn: Position X:52.1 Y:116 → center-right, extends above viewport
            Scale:186.5 → very large, fills most of viewport height
            PixelDotGrid samples ThinkerModel render at exact same coords */}
        <div
          style={{
            position: 'absolute',
            zIndex: 15,
            left: '52%',
            top: '-2%',
            transform: 'translateX(-50%)',
            width: 'clamp(340px, 44vw, 660px)',
            height: '105vh',
            pointerEvents: 'none',
          }}
        >
          {/* 3D Model: behind glass tiles (zIndex 1) */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 1,
              pointerEvents: 'none',
            }}
          >
            <ThinkerModel
              className="w-full h-full"
            />
          </div>
          {/* ASCII Glass Tiles: IN FRONT of model (zIndex 2), extends beyond container */}
          <div
            style={{
              position: 'absolute',
              top: '18%',
              left: '-18%',
              width: '136%',
              height: '64%',
              zIndex: 2,
              pointerEvents: 'none',
            }}
          >
            <PixelDotGrid
              className="w-full h-full"
            />
          </div>
        </div>

        {/* ── MARQUEE TEXT ──
            Unicorn: Font Outfit Regular, Size:18.6 (relative → ~18% viewport height)
            Line-height:83, Letterspacing:-4.5, Fill:#262618
            Position Y:75.4% → text starts at 75% from top
            Width:92.8% → nearly full width
            Projection: Repeat Horiz., Speed X:50 → scrolling */}
        <div
          style={{
            position: 'absolute',
            zIndex: 30,
            top: '63%',
            left: 0,
            right: 0,
            overflow: 'hidden',
            pointerEvents: 'none',
            lineHeight: 0.83,
          }}
        >
          {/* Row 1 — scrolls left (Speed X:50) */}
          <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
            <div
              style={{
                display: 'inline-block',
                animation: 'logos-marquee-left 28s linear infinite',
                willChange: 'transform',
              }}
            >
              {[MARQUEE_TEXT[0], MARQUEE_TEXT[0]].map((t, i) => (
                <span
                  key={i}
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 700,
                    fontSize: 'clamp(64px, 12.5vh, 148px)',
                    letterSpacing: '-0.045em',
                    color: TEXT,
                    lineHeight: 0.83,
                    display: 'inline-block',
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Vertical side labels */}
        <div
          style={{
            position: 'absolute',
            left: 18,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 40,
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            pointerEvents: 'none',
          }}
        >
          <span
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 300,
              fontSize: '8px',
              letterSpacing: '0.4em',
              textTransform: 'uppercase',
              color: TEXT_MID,
            }}
          >
            Thinking Coach
          </span>
        </div>
        <div
          style={{
            position: 'absolute',
            right: 18,
            top: '50%',
            transform: 'translateY(-50%) rotate(180deg)',
            zIndex: 40,
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            pointerEvents: 'none',
          }}
        >
          <span
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 300,
              fontSize: '8px',
              letterSpacing: '0.4em',
              textTransform: 'uppercase',
              color: TEXT_MID,
            }}
          >
            2026 · LOGOS
          </span>
        </div>

        {/* CTA button */}
        <div
          style={{
            position: 'absolute',
            zIndex: 50,
            bottom: 'clamp(80px, 14vh, 130px)',
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        >
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 500,
              fontSize: '10px',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: BG,
              backgroundColor: TEXT,
              border: 'none',
              padding: '14px 38px',
              cursor: 'pointer',
              transition: 'opacity 0.18s',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.72'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
          >
            생각을 시작하다
          </button>
        </div>
      </div>

      {/* ── SECTION 2 — About (dark) ── */}
      <section style={{ backgroundColor: '#1A1A10', color: '#C8C8B6', padding: '10rem 2rem' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '5rem',
              alignItems: 'start',
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: 300,
                  fontSize: '9px',
                  letterSpacing: '0.42em',
                  textTransform: 'uppercase',
                  opacity: 0.38,
                  marginBottom: '2rem',
                }}
              >
                About LOGOS
              </div>
              <h2
                style={{
                  fontFamily: "'Source Serif 4', Georgia, serif",
                  fontWeight: 600,
                  fontSize: 'clamp(2rem, 4vw, 3.4rem)',
                  letterSpacing: '-0.025em',
                  lineHeight: 1.12,
                  marginBottom: '2.5rem',
                }}
              >
                소크라테스가<br />AI가 되다
              </h2>
              <p
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: 300,
                  fontSize: '15px',
                  lineHeight: 1.75,
                  opacity: 0.68,
                  maxWidth: '420px',
                }}
              >
                LOGOS는 2,400년 전 아테네의 소크라테스 문답법을 현대 AI로 재현합니다.
                당신의 논리에서 빈틈을 찾아내고, 더 깊이 생각하도록 이끕니다.
              </p>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '2.5rem',
                paddingTop: '3.5rem',
              }}
            >
              {[
                { num: '01', title: '소크라테스 문답', desc: '질문을 통해 논리의 빈틈을 스스로 발견하게 합니다.' },
                { num: '02', title: '논리력 스코어링', desc: '세션 후 논리적 일관성, 근거 충분성을 수치로 분석합니다.' },
                { num: '03', title: '성장 추적', desc: '매 세션의 변화를 시각화하여 사고력 성장을 확인합니다.' },
              ].map((item) => (
                <div
                  key={item.num}
                  style={{
                    display: 'flex',
                    gap: '1.5rem',
                    alignItems: 'flex-start',
                    paddingBottom: '2.5rem',
                    borderBottom: '1px solid rgba(200,200,182,0.1)',
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontWeight: 300,
                      fontSize: '10px',
                      letterSpacing: '0.22em',
                      opacity: 0.32,
                      paddingTop: '4px',
                      minWidth: '24px',
                    }}
                  >
                    {item.num}
                  </span>
                  <div>
                    <div
                      style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontWeight: 500,
                        fontSize: '14px',
                        letterSpacing: '0.02em',
                        marginBottom: '0.5rem',
                      }}
                    >
                      {item.title}
                    </div>
                    <div
                      style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontWeight: 300,
                        fontSize: '13px',
                        opacity: 0.55,
                        lineHeight: 1.6,
                      }}
                    >
                      {item.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 3 — Features ── */}
      <section style={{ backgroundColor: '#141410', color: '#C8C8B6', padding: '10rem 2rem' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 300,
              fontSize: '9px',
              letterSpacing: '0.42em',
              textTransform: 'uppercase',
              opacity: 0.32,
              marginBottom: '2rem',
            }}
          >
            Features
          </div>
          <h2
            style={{
              fontFamily: "'Source Serif 4', Georgia, serif",
              fontWeight: 600,
              fontSize: 'clamp(2rem, 4vw, 3.2rem)',
              letterSpacing: '-0.02em',
              marginBottom: '5rem',
              maxWidth: '520px',
            }}
          >
            논리의 빈틈을<br />스스로 발견하다
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '1px',
              backgroundColor: 'rgba(200,200,182,0.07)',
            }}
          >
            {[
              {
                icon: '◎',
                title: '소크라테스 코칭',
                desc: '반박 질문, 가정 도전, 증거 요구를 통해 논리를 단련합니다.',
              },
              {
                icon: '◈',
                title: '실시간 논리 분석',
                desc: '대화 중 논리적 오류와 빈틈을 즉시 감지하고 피드백합니다.',
              },
              {
                icon: '◉',
                title: '성장 대시보드',
                desc: '논리력 스코어, 세션 기록, 성장 그래프를 한눈에 확인합니다.',
              },
            ].map((f) => (
              <div
                key={f.title}
                style={{
                  padding: '3rem 2.5rem',
                  backgroundColor: '#141410',
                  borderTop: '1px solid rgba(200,200,182,0.08)',
                }}
              >
                <div
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: '22px',
                    marginBottom: '1.5rem',
                    opacity: 0.55,
                  }}
                >
                  {f.icon}
                </div>
                <div
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 500,
                    fontSize: '15px',
                    letterSpacing: '0.01em',
                    marginBottom: '0.75rem',
                  }}
                >
                  {f.title}
                </div>
                <div
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 300,
                    fontSize: '13px',
                    opacity: 0.5,
                    lineHeight: 1.65,
                  }}
                >
                  {f.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 4 — Pricing ── */}
      <section style={{ backgroundColor: '#121210', color: '#C8C8B6', padding: '10rem 2rem' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 300,
              fontSize: '9px',
              letterSpacing: '0.42em',
              textTransform: 'uppercase',
              opacity: 0.32,
              marginBottom: '2rem',
            }}
          >
            Subscription
          </div>
          <h2
            style={{
              fontFamily: "'Source Serif 4', Georgia, serif",
              fontWeight: 600,
              fontSize: 'clamp(2rem, 4vw, 3.2rem)',
              letterSpacing: '-0.02em',
              marginBottom: '4rem',
            }}
          >
            생각의 깊이에<br />투자하세요
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '1px',
              backgroundColor: 'rgba(200,200,182,0.08)',
            }}
          >
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
                style={{
                  padding: '2.5rem',
                  backgroundColor: plan.highlight ? '#C8C8B6' : '#121210',
                  color: plan.highlight ? '#121210' : '#C8C8B6',
                }}
              >
                <div
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 300,
                    fontSize: '9px',
                    letterSpacing: '0.32em',
                    textTransform: 'uppercase',
                    opacity: 0.45,
                    marginBottom: '1rem',
                  }}
                >
                  {plan.plan}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '4px',
                    marginBottom: '2rem',
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Source Serif 4', Georgia, serif",
                      fontWeight: 700,
                      fontSize: '2.2rem',
                    }}
                  >
                    {plan.price}
                  </span>
                  <span
                    style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontWeight: 300,
                      fontSize: '12px',
                      opacity: 0.45,
                    }}
                  >
                    {plan.period}
                  </span>
                </div>
                <ul
                  style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: '0 0 2rem 0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                  }}
                >
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontFamily: "'Outfit', sans-serif",
                        fontWeight: 300,
                        fontSize: '13px',
                        opacity: 0.72,
                      }}
                    >
                      <span style={{ opacity: 0.35 }}>—</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate('/dashboard')}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 500,
                    fontSize: '10px',
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    border: `1px solid ${plan.highlight ? '#121210' : 'rgba(200,200,182,0.28)'}`,
                    backgroundColor: 'transparent',
                    color: plan.highlight ? '#121210' : '#C8C8B6',
                    cursor: 'pointer',
                    transition: 'all 0.18s',
                  }}
                  onMouseEnter={e => {
                    if (plan.highlight) {
                      e.currentTarget.style.backgroundColor = '#121210';
                      e.currentTarget.style.color = '#C8C8B6';
                    } else {
                      e.currentTarget.style.backgroundColor = 'rgba(200,200,182,0.08)';
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = plan.highlight ? '#121210' : '#C8C8B6';
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
        style={{
          backgroundColor: BG,
          color: TEXT,
          padding: '2.5rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="15" height="15" viewBox="0 0 22 22" fill="none">
            <polygon
              points="11,1.5 20.5,7.5 17.5,18.5 4.5,18.5 1.5,7.5"
              stroke={TEXT}
              strokeWidth="1.3"
              fill="none"
            />
          </svg>
          <span
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 300,
              fontSize: '10px',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              opacity: 0.45,
            }}
          >
            LOGOS © 2026
          </span>
        </div>
        <div
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 300,
            fontSize: '10px',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            opacity: 0.32,
          }}
        >
          생각하는 힘을 기르다
        </div>
      </footer>

      {/* ── KEYFRAMES ── */}
      <style>{`
        @keyframes logos-marquee-left {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
