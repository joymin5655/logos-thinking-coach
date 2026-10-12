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
import { useTheme } from '@/contexts/ThemeContext';
import { useT } from '@/i18n';

// 테마 토큰(--l-*) — 페이지 배경/전경은 테마를 따르고, 대비 띠(compare)만 반전한다.
const BG = 'var(--l-bg)';
const FG = 'var(--l-fg)';
const FG_MID = 'var(--l-fg-mid)';
const FG_DIM = 'var(--l-border-mid)';
const ON_FG = 'var(--l-on-fg)';

export default function Landing() {
  const [, navigate] = useLocation();
  const t = useT('landing');
  const tm = useT('marketing');
  const dark = useTheme().theme === 'dark';
  // 금색 강조: 다크 배경에서는 밝은 금, 크림 배경에서는 깊은 금
  const ACCENT = dark ? SEMANTIC.draw : SEMANTIC_DARK.draw;
  const HIGHLIGHT = dark ? SEMANTIC.insight : SEMANTIC_DARK.warning;
  // 반전 띠(배경 = --l-fg)에서는 반대 팔레트
  const BAND_ACCENT = dark ? SEMANTIC_DARK.draw : SEMANTIC.draw;
  const BAND_MID = 'color-mix(in srgb, var(--l-on-fg) 60%, transparent)';
  const BAND_LINE = 'color-mix(in srgb, var(--l-on-fg) 20%, transparent)';
  const MARQUEE_TEXT = tm('marquee');
  const ENTRY_CARDS = [
    { no: '01', title: t('entry1Title'), body: t('entry1Body'), cta: t('entry1Cta'), to: '/dashboard/session' },
    { no: '02', title: t('entry2Title'), body: t('entry2Body'), cta: t('entry2Cta'), to: '/dashboard/session' },
    { no: '03', title: t('entry3Title'), body: t('entry3Body'), cta: t('entry3Cta'), to: '/dashboard/argue' },
  ];
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
        borderTop: `1px solid ${FG_DIM}`,
        backgroundColor: BG,
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
          borderBottom: `1px solid ${FG_DIM}`,
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
          {[MARQUEE_TEXT, MARQUEE_TEXT, MARQUEE_TEXT, MARQUEE_TEXT].map((txt, i) => (
            <span
              key={i}
              style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 400,
                fontSize: '9px',
                letterSpacing: '0.2em',
                color: FG_MID,
                display: 'inline-block',
                textTransform: 'uppercase',
              }}
            >
              {txt}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontFamily: "var(--font-mono)", fontSize: '9px', color: FG_DIM, letterSpacing: '0.1em' }}>
          <span>SYSTEM.ACTIVE</span>
          <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
            {[8, 14, 6, 10, 12, 5, 9, 7].map((h, i) => (
              <div key={i} style={{ width: 2, height: h, backgroundColor: FG_DIM }} />
            ))}
          </div>
          <span>V1.0.0</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: "var(--font-mono)", fontSize: '9px', color: FG_DIM }}>
          <span>◐ RENDERING</span>
          <div style={{ display: 'flex', gap: 3 }}>
            {[0, 0.2, 0.4].map((delay, i) => (
              <div key={i} style={{ width: 4, height: 4, backgroundColor: FG, borderRadius: '50%', opacity: 0.6 - i * 0.15, animation: `pulse-dot 1.4s ease-in-out ${delay}s infinite` }} />
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
          backgroundColor: BG,
        }}
      >
        {/* 코너 프레임 장식 */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: 48, height: 48, borderTop: `2px solid ${FG_DIM}`, borderLeft: `2px solid ${FG_DIM}`, zIndex: 50 }} />
        <div style={{ position: 'absolute', top: 0, right: 0, width: 48, height: 48, borderTop: `2px solid ${FG_DIM}`, borderRight: `2px solid ${FG_DIM}`, zIndex: 50 }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: 48, height: 48, borderBottom: `2px solid ${FG_DIM}`, borderLeft: `2px solid ${FG_DIM}`, zIndex: 50 }} />
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 48, height: 48, borderBottom: `2px solid ${FG_DIM}`, borderRight: `2px solid ${FG_DIM}`, zIndex: 50 }} />

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
            <div style={{ width: 28, height: 1, backgroundColor: FG }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: '12px', letterSpacing: '0.2em', color: ACCENT }}>001</span>
            <div style={{ flex: 1, height: 1, backgroundColor: FG, opacity: 0.3 }} />
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
                backgroundImage: `repeating-linear-gradient(0deg, transparent 0px, transparent 1px, ${FG} 1px, ${FG} 2px), repeating-linear-gradient(90deg, transparent 0px, transparent 1px, ${FG} 1px, ${FG} 2px)`,
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
                color: FG,
                marginBottom: 8,
                textTransform: 'uppercase',
              }}
            >
              THINK
              <span style={{ display: 'block', color: FG, marginTop: 4, opacity: 0.88 }}>
                DEEPER
              </span>
            </h1>
          </div>

          {/* 도트 패턴 */}
          <div style={{ display: 'flex', gap: 3, marginBottom: 16, opacity: 0.35 }}>
            {Array.from({ length: 36 }).map((_, i) => (
              <div key={i} style={{ width: 2, height: 2, backgroundColor: FG, borderRadius: '50%' }} />
            ))}
          </div>

          {/* 설명 텍스트 */}
          <div style={{ position: 'relative' }}>
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: '14px',
                lineHeight: 1.85,
                color: FG_MID,
                marginBottom: 28,
                letterSpacing: '0.04em',
              }}
            >
              <strong style={{ color: HIGHLIGHT, fontWeight: 700 }}>{t('heroStrong')}</strong><br />
              {t('heroLine2')}<br />
              {t('heroLine3')}
            </p>
            <div
              style={{
                position: 'absolute',
                right: -12,
                top: '50%',
                width: 10,
                height: 10,
                border: `1px solid ${FG}`,
                opacity: 0.25,
                transform: 'translateY(-50%)',
              }}
            >
              <div style={{ position: 'absolute', top: '50%', left: '50%', width: 3, height: 3, backgroundColor: FG, transform: 'translate(-50%, -50%)', opacity: 0.6 }} />
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
                color: BG,
                backgroundColor: FG,
                border: `1px solid ${FG}`,
                cursor: 'pointer',
                transition: 'all 0.18s',
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = ACCENT; e.currentTarget.style.borderColor = ACCENT; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = FG; e.currentTarget.style.borderColor = FG; }}
            >
              <span style={{ position: 'absolute', top: -4, left: -4, width: 7, height: 7, borderTop: `1px solid ${FG}`, borderLeft: `1px solid ${FG}` }} />
              <span style={{ position: 'absolute', bottom: -4, right: -4, width: 7, height: 7, borderBottom: `1px solid ${FG}`, borderRight: `1px solid ${FG}` }} />
              {t('ctaStart')}
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
                color: FG,
                backgroundColor: 'transparent',
                border: `1px solid ${FG_DIM}`,
                cursor: 'pointer',
                transition: 'all 0.18s',
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--l-faint)'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              {t('ctaMore')}
            </button>
          </div>

          {/* 하단 기술 주석 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 24, opacity: 0.35 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: '12px', color: FG }}>∞</span>
            <div style={{ flex: 1, height: 1, backgroundColor: FG, opacity: 0.3 }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: '12px', color: FG, letterSpacing: '0.15em' }}>SOCRATIC METHOD</span>
          </div>
        </div>

        {/* 수직 사이드 레이블 */}
        <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', zIndex: 40, writingMode: 'vertical-rl', pointerEvents: 'none' }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: '10px', letterSpacing: '0.45em', textTransform: 'uppercase', color: FG_DIM }}>Thinking Coach</span>
        </div>
        <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%) rotate(180deg)', zIndex: 40, writingMode: 'vertical-rl', pointerEvents: 'none' }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: '10px', letterSpacing: '0.45em', textTransform: 'uppercase', color: FG_DIM }}>2026 · LOGOS</span>
        </div>

      </div>
      </div>

      {/* ── 진입 동기 ── */}
      <section aria-labelledby="entry-heading" style={{ backgroundColor: BG, color: FG, padding: '4rem 1.25rem', borderTop: `1px solid ${FG_DIM}` }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.4em', textTransform: 'uppercase', color: ACCENT, marginBottom: 10 }}>Why people start</div>
          <h2 id="entry-heading" style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 'clamp(1.4rem, 2.6vw, 2rem)', letterSpacing: '-0.02em', margin: '0 0 1.5rem' }}>
            {t('entryTitle')}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 1, backgroundColor: FG_DIM }}>
            {ENTRY_CARDS.map((c) => (
              <button
                key={c.title}
                type="button"
                onClick={() => navigate(c.to)}
                style={{ textAlign: 'left', backgroundColor: BG, color: FG, border: 'none', padding: '1.5rem', cursor: 'pointer', display: 'grid', gap: 10, alignContent: 'start' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--l-panel)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = BG; }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.3em', color: FG_MID }}>{c.no}</span>
                <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 20 }}>{c.title}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.8, color: FG_MID }}>{c.body}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em', color: FG }}>{c.cta} →</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── 같은 고민, 다른 대화 ── */}
      <section aria-labelledby="compare-heading" style={{ backgroundColor: FG, color: ON_FG, padding: '4rem 1.25rem' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.4em', textTransform: 'uppercase', color: BAND_ACCENT, marginBottom: 10 }}>Compare</div>
          <h2 id="compare-heading" style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 'clamp(1.4rem, 2.6vw, 2rem)', letterSpacing: '-0.02em', margin: '0 0 1.25rem' }}>
            {t('compareTitle')}
          </h2>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 18, margin: '0 0 1.25rem', padding: '0.75rem 1rem', borderLeft: `3px solid ${ON_FG}`, backgroundColor: 'color-mix(in srgb, var(--l-on-fg) 8%, transparent)' }}>
            {t('compareQuestion')}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            <div style={{ border: `1px solid ${BAND_LINE}`, padding: '1.25rem', display: 'grid', gap: 10, alignContent: 'start' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: BAND_MID }}>{t('genericAi')}</div>
              <ul style={{ margin: 0, paddingLeft: '1.1em', display: 'grid', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.8 }}>
                <li>{t('generic1')}</li>
                <li>{t('generic2')}</li>
                <li>{t('generic3')}</li>
              </ul>
              <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 11, color: BAND_MID }}>{t('genericNote')}</p>
            </div>
            <div style={{ border: `1px solid ${ON_FG}`, backgroundColor: ON_FG, color: FG, padding: '1.25rem', display: 'grid', gap: 10, alignContent: 'start' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: ACCENT }}>LOGOS</div>
              <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 20, lineHeight: 1.5 }}>{t('logosQuestion')}</p>
              <p style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 11, color: FG_MID, lineHeight: 1.7 }}>{t('logosNote')}</p>
            </div>
          </div>
          <div style={{ marginTop: '1.5rem' }}>
            <button
              type="button"
              onClick={() => navigate('/dashboard/session')}
              style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', padding: '10px 22px', backgroundColor: ON_FG, color: FG, border: `1px solid ${ON_FG}`, cursor: 'pointer' }}
            >
              {t('compareCta')}
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
