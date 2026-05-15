import type { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';

const BLACK = '#0A0A0A';
const CREAM = '#F0EBE0';
const CREAM_MID = 'rgba(240,235,224,0.55)';
const CREAM_DIM = 'rgba(240,235,224,0.25)';
const ACCENT = '#C8C0A8';

const NAV_LINKS = [
  { href: '/about', label: 'About' },
  { href: '/features', label: 'Features' },
  { href: '/pricing', label: 'Pricing' },
];

const MARQUEE_TEXT =
  'LOGOS · 생각의 코치 · THINK DEEPER · 소크라테스 · APORIA · 논리적 확신 · ';

type Props = {
  children: ReactNode;
  /** Custom footer node. If omitted, the default LOGOS © 2026 footer is rendered. */
  footer?: ReactNode;
  /** If true, the page (nav + main + footer) fits within one actual viewport — no scroll. */
  singleViewport?: boolean;
};

export default function MarketingLayout({ children, footer, singleViewport }: Props) {
  const [location, navigate] = useLocation();

  return (
    <div
      className={singleViewport ? 'fit-viewport' : undefined}
      style={{
        backgroundColor: BLACK,
        color: CREAM,
        minHeight: singleViewport ? undefined : '100vh',
        fontFamily: "var(--font-mono)",
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── NAV — 로고 | 라우트 링크 | CTA ── */}
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
        {/* 로고 영역 */}
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '0 24px',
            flexShrink: 0,
            borderRight: `1px solid ${CREAM_DIM}`,
            height: '100%',
            textDecoration: 'none',
          }}
        >
          <img src="/logo.png" alt="LOGOS" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
          <span
            style={{
              fontFamily: "var(--font-mono)",
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
              fontFamily: "var(--font-mono)",
              fontSize: '8px',
              letterSpacing: '0.15em',
              color: CREAM_MID,
              whiteSpace: 'nowrap',
            }}
          >
            EST. 2026
          </span>
        </Link>

        {/* 가운데 스페이서 */}
        <div style={{ flex: 1 }} />

        {/* 라우트 링크 — 우측 정렬 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '2rem',
            height: '100%',
            padding: '0 24px',
          }}
        >
          {NAV_LINKS.map((link) => {
            const isActive = location === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontWeight: isActive ? 700 : 400,
                  fontSize: '10px',
                  letterSpacing: '0.22em',
                  color: isActive ? CREAM : CREAM_MID,
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  position: 'relative',
                  padding: '4px 0',
                  transition: 'color 0.18s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = CREAM; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = isActive ? CREAM : CREAM_MID; }}
              >
                {link.label}
                {isActive && (
                  <span
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      bottom: -2,
                      height: 1,
                      backgroundColor: CREAM,
                    }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* CTA — 시작하기 */}
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
              fontFamily: "var(--font-mono)",
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
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = ACCENT; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = CREAM; }}
          >
            시작하기
          </button>
        </div>
      </nav>

      {/* ── 페이지 콘텐츠 ── */}
      <main style={singleViewport ? { flex: 1, overflow: 'hidden', minHeight: 0 } : undefined}>
        {children}
      </main>

      {/* ── FOOTER ── */}
      {footer ?? (
        <footer
          style={{
            backgroundColor: BLACK,
            color: CREAM,
            display: 'flex',
            alignItems: 'center',
            height: 44,
            borderTop: `1px solid ${CREAM_DIM}`,
            overflow: 'hidden',
          }}
        >
          {/* 로고 작은 표시 — 좌측 고정 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '0 20px',
              flexShrink: 0,
              borderRight: `1px solid ${CREAM_DIM}`,
              height: '100%',
            }}
          >
            <img src="/logo.png" alt="LOGOS" style={{ width: '14px', height: '14px', objectFit: 'contain', opacity: 0.45 }} />
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: '9px',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                opacity: 0.45,
                color: CREAM,
                whiteSpace: 'nowrap',
              }}
            >
              © 2026
            </span>
          </div>

          {/* 마퀴 — 중앙 flex 1, 양쪽 페이드 마스크 */}
          <div
            style={{
              flex: 1,
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              position: 'relative',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
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
        </footer>
      )}
    </div>
  );
}
