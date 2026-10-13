import type { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import PrefsToggle from '@/components/PrefsToggle';
import { useT } from '@/i18n';

// 테마 토큰(--l-*) — 라이트/다크 전환은 index.css가 처리한다.
const BG = 'var(--l-bg)';
const FG = 'var(--l-fg)';
const FG_MID = 'var(--l-fg-mid)';
const BORDER = 'var(--l-border-mid)';
const ACCENT = 'var(--l-accent)';

// 마케팅 공용 CSS — 호버·포커스·터치·폰 폭 규칙. Landing 등 mk- 클래스를 쓰는 페이지도 이 레이아웃 안에서 렌더된다.
const MK_CSS = `
  .mk-link { color: ${FG_MID}; transition: color 0.18s; }
  .mk-link[aria-current="page"] { color: ${FG}; }
  .mk-link:hover, .mk-link:focus-visible { color: ${FG}; }
  .mk-cta { background-color: ${FG}; transition: background-color 0.18s; }
  .mk-cta:hover, .mk-cta:focus-visible { background-color: ${ACCENT}; }
  .mk-mail { color: ${FG_MID}; transition: color 0.18s; }
  .mk-mail:hover, .mk-mail:focus-visible { color: ${ACCENT}; }
  .mk-btn-primary { background-color: ${FG}; border-color: ${FG}; transition: background-color 0.18s, border-color 0.18s; }
  .mk-btn-primary:hover, .mk-btn-primary:focus-visible { background-color: ${ACCENT}; border-color: ${ACCENT}; }
  .mk-btn-ghost { background-color: transparent; transition: background-color 0.18s; }
  .mk-btn-ghost:hover, .mk-btn-ghost:focus-visible { background-color: var(--l-faint); }
  .mk-btn-invert { transition: opacity 0.18s; }
  .mk-btn-invert:hover, .mk-btn-invert:focus-visible { opacity: 0.85; }
  .mk-card { background-color: ${BG}; transition: background-color 0.18s; }
  .mk-card:hover, .mk-card:focus-visible { background-color: var(--l-panel); }
  @media (pointer: coarse) {
    .mk-cta { min-height: 40px; }
    .mk-link { min-height: 40px; display: inline-flex; align-items: center; }
  }
  @media (max-width: 640px) {
    /* 한 화면 고정 페이지도 폰 폭에서는 내용이 잘리지 않고 스크롤된다. */
    .fit-viewport { height: auto !important; min-height: calc(100dvh / var(--ui-scale)); }
    .fit-viewport > .mk-main { overflow: visible !important; }
    /* 가로 스크롤되는 nav 링크는 오른쪽 끝을 흐려 더 있음을 알린다. */
    .mk-nav-links {
      -webkit-mask-image: linear-gradient(to right, black calc(100% - 28px), transparent);
      mask-image: linear-gradient(to right, black calc(100% - 28px), transparent);
    }
  }
`;

type Props = {
  children: ReactNode;
  /** Custom footer node. If omitted, the default LOGOS © 2026 footer is rendered. */
  footer?: ReactNode;
  /** If true, the page (nav + main + footer) fits within one actual viewport — no scroll. */
  singleViewport?: boolean;
};

export default function MarketingLayout({ children, footer, singleViewport }: Props) {
  const [location, navigate] = useLocation();
  const t = useT('marketing');
  const MARQUEE_TEXT = t('marquee');
  const NAV_LINKS = [
    { href: '/about', label: t('navAbout') },
    { href: '/features', label: t('navFeatures') },
    { href: '/pricing', label: t('navPricing') },
  ];

  return (
    <div
      className={singleViewport ? 'fit-viewport' : undefined}
      style={{
        backgroundColor: BG,
        color: FG,
        minHeight: singleViewport ? undefined : '100vh',
        fontFamily: "var(--font-mono)",
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <style>{MK_CSS}</style>
      {/* ── NAV — 로고 | 라우트 링크 | CTA ── */}
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          backgroundColor: 'color-mix(in srgb, var(--l-bg) 92%, transparent)',
          backdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${BORDER}`,
          display: 'flex',
          alignItems: 'center',
          height: 52,
          overflow: 'hidden',
        }}
      >
        {/* 로고 영역 */}
        <Link
          href="/"
          className="mk-logo"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '0 24px',
            flexShrink: 0,
            borderRight: `1px solid ${BORDER}`,
            height: '100%',
            textDecoration: 'none',
          }}
        >
          <img src="/logo.png" className="logo-mark" alt="" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: '12px',
              letterSpacing: '0.22em',
              color: FG,
              whiteSpace: 'nowrap',
            }}
          >
            LOGOS
          </span>
          <div className="mk-mobile-hide" style={{ width: 1, height: 10, backgroundColor: BORDER }} />
          <span
            className="mk-mobile-hide"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: '10px',
              letterSpacing: '0.15em',
              color: FG_MID,
              whiteSpace: 'nowrap',
            }}
          >
            EST. 2026
          </span>
        </Link>

        {/* 가운데 스페이서 */}
        <div className="mk-mobile-hide" style={{ flex: 1 }} />

        {/* 라우트 링크 — 우측 정렬 (폰 폭에서는 남은 폭 안에서 가로 스크롤) */}
        <div
          className="mk-nav-links"
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
                className="mk-link"
                aria-current={isActive ? 'page' : undefined}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontWeight: isActive ? 700 : 400,
                  fontSize: '11px',
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  position: 'relative',
                  padding: '4px 0',
                }}
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
                      backgroundColor: FG,
                    }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        <PrefsToggle style={{ flexShrink: 0, padding: '0 12px' }} />

        {/* CTA — 시작하기 (폰 폭에서는 히어로 CTA로 충분해 숨김) */}
        <div
          className="mk-mobile-hide"
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0 24px',
            flexShrink: 0,
            borderLeft: `1px solid ${BORDER}`,
            height: '100%',
          }}
        >
          <button
            type="button"
            className="mk-cta"
            onClick={() => navigate('/dashboard')}
            style={{
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: '11px',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--l-on-fg)',
              border: 'none',
              padding: '9px 16px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {t('start')}
          </button>
        </div>
      </nav>

      {/* ── 페이지 콘텐츠 ── */}
      <main className="mk-main" style={singleViewport ? { flex: 1, overflow: 'hidden', minHeight: 0 } : undefined}>
        {children}
      </main>

      {/* ── FOOTER ── */}
      {footer ?? (
        <footer
          style={{
            backgroundColor: BG,
            color: FG,
            display: 'flex',
            alignItems: 'center',
            height: 44,
            borderTop: `1px solid ${BORDER}`,
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
              borderRight: `1px solid ${BORDER}`,
              height: '100%',
            }}
          >
            <img src="/logo.png" className="logo-mark" alt="" style={{ width: '14px', height: '14px', objectFit: 'contain' }} />
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: '11px',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: FG_MID,
                whiteSpace: 'nowrap',
              }}
            >
              © 2026
            </span>
          </div>

          <Link
            href="/terms"
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0 20px',
              flexShrink: 0,
              borderRight: `1px solid ${BORDER}`,
              height: '100%',
              fontFamily: "var(--font-mono)",
              fontSize: '11px',
              letterSpacing: '0.12em',
              color: FG_MID,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {t('terms')}
          </Link>
          <Link
            href="/privacy"
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0 20px',
              flexShrink: 0,
              borderRight: `1px solid ${BORDER}`,
              height: '100%',
              fontFamily: "var(--font-mono)",
              fontSize: '11px',
              letterSpacing: '0.12em',
              color: FG_MID,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {t('privacy')}
          </Link>

          {/* 이메일 — 우측 고정 */}
          <a
            href="mailto:contact@lo9os.org"
            className="mk-mail"
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0 20px',
              flexShrink: 0,
              borderLeft: `1px solid ${BORDER}`,
              height: '100%',
              fontFamily: "var(--font-mono)",
              fontSize: '11px',
              letterSpacing: '0.12em',
              textDecoration: 'none',
              order: 2,
            }}
          >
            contact@lo9os.org
          </a>

          {/* 마퀴 — 중앙 flex 1, 양쪽 페이드 마스크 (장식) */}
          <div
            aria-hidden="true"
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
                    fontSize: '10px',
                    letterSpacing: '0.2em',
                    color: FG_MID,
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
