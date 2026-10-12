/*
 * DashboardLayout.tsx
 * LOGOS Design: 대시보드 레이아웃 — 랜딩페이지 팔레트 통일
 *
 * Palette (랜딩페이지와 동일):
 *   Sidebar BG  : #0A0A0A (BLACK)
 *   Main BG     : #111111 (NEAR BLACK)
 *   Text        : #F0EBE0 (CREAM)
 *   Text dim    : rgba(240,235,224,0.55) (CREAM_MID)
 *   Border      : rgba(240,235,224,0.15) (CREAM_DIM)
 *   Active      : #F0EBE0 (CREAM) border-left + bg tint
 *   Accent      : #C8C0A8 (ACCENT)
 * Typography: Space Mono
 */
import { useLocation } from 'wouter';
import { useState } from 'react';

// ── 팔레트 (랜딩페이지와 동일) ──
const BLACK    = '#0A0A0A';
const NEAR_BK  = '#111111';
const CREAM    = '#F0EBE0';
const CREAM_MID = 'rgba(240,235,224,0.55)';
const CREAM_DIM = 'rgba(240,235,224,0.15)';
const ACCENT   = '#C8C0A8';

interface NavItem {
  path: string;
  label: string;
  labelEn: string;
  icon: React.ReactNode;
  /** Spec의 Session 1/2/3 인덱스 (3 코어 세션만 표기) */
  session?: '01' | '02' | '03';
}

const NAV_ITEMS: NavItem[] = [
  {
    path: '/dashboard',
    label: '홈',
    labelEn: 'Home',
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <path d="M2 6L8 1L14 6V14H10V10H6V14H2V6Z" stroke="currentColor" strokeWidth="1.2" fill="none" />
      </svg>
    ),
  },
  {
    path: '/dashboard/diagnostic',
    label: '3분 진단',
    labelEn: 'Diagnostic',
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2" />
        <path d="M8 4V8H11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    path: '/dashboard/argue',
    label: '오늘의 논증',
    labelEn: 'Daily Argue',
    session: '01',
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2" />
        <path d="M5 8H11M8 5V11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    path: '/dashboard/session',
    label: '소크라테스 코칭',
    labelEn: 'Coaching',
    session: '02',
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2" />
        <path d="M8 5V8L10 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    path: '/dashboard/arena',
    label: '토론 아레나',
    labelEn: 'Arena',
    session: '03',
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <path d="M3 13L8 3L13 13" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M5.5 9H10.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    path: '/dashboard/analytics',
    label: '논리력 분석',
    labelEn: 'Analytics',
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <path d="M2 12L5 8L8 10L11 5L14 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2 14H14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    path: '/dashboard/history',
    label: '세션 기록',
    labelEn: 'History',
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="3" width="12" height="10" rx="1" stroke="currentColor" strokeWidth="1.2" />
        <path d="M5 7H11M5 10H8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    path: '/dashboard/subscription',
    label: '구독',
    labelEn: 'Subscription',
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <path d="M8 2L10 6H14L11 9L12 13L8 11L4 13L5 9L2 6H6L8 2Z" stroke="currentColor" strokeWidth="1.2" fill="none" />
      </svg>
    ),
  },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  titleEn?: string;
}

export default function DashboardLayout({ children, title, titleEn }: DashboardLayoutProps) {
  const [location, navigate] = useLocation();
  const [collapsed, setCollapsed] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ backgroundColor: BLACK, fontFamily: "var(--font-mono)" }}
    >
      {/* ── Sidebar ── */}
      <aside
        className="flex flex-col shrink-0 transition-all duration-300"
        style={{
          width: collapsed ? '56px' : '216px',
          backgroundColor: BLACK,
          color: CREAM,
          borderRight: `1px solid ${CREAM_DIM}`,
        }}
      >
        {/* Logo — height 60px (top bar와 정렬) */}
        <div
          className="flex items-center gap-3 px-4"
          style={{ height: 60, borderBottom: `1px solid ${CREAM_DIM}`, boxSizing: 'border-box' }}
        >
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 hover:opacity-75 transition-opacity"
          >
            <img src="/logo.png" alt="LOGOS" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
            {!collapsed && (
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  fontSize: '11px',
                  letterSpacing: '0.22em',
                  color: CREAM,
                }}
              >
                LOGOS
              </span>
            )}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto transition-opacity"
            style={{ color: CREAM_MID, opacity: 0.4 }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.8'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '0.4'; }}
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              {collapsed ? (
                <path d="M2 4H12M2 7H12M2 10H12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              ) : (
                <path d="M2 4H12M2 7H8M2 10H10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-150"
                style={{
                  color: isActive ? CREAM : CREAM_MID,
                  backgroundColor: isActive ? 'rgba(240,235,224,0.06)' : 'transparent',
                  borderLeft: isActive ? `2px solid ${CREAM}` : `2px solid transparent`,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = CREAM;
                    e.currentTarget.style.backgroundColor = 'rgba(240,235,224,0.04)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = CREAM_MID;
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="shrink-0">{item.icon}</span>
                {!collapsed && (
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 6,
                        fontFamily: "var(--font-mono)",
                        fontSize: '10px',
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                      }}
                    >
                      {item.session && (
                        <span style={{ fontSize: '7px', fontWeight: 400, letterSpacing: '0.2em', opacity: 0.5 }}>
                          {item.session}
                        </span>
                      )}
                      <span>{item.label}</span>
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: '7px',
                        letterSpacing: '0.22em',
                        textTransform: 'uppercase',
                        opacity: 0.35,
                        marginTop: '1px',
                      }}
                    >
                      {item.labelEn}
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* User section */}
        <div
          className="px-4 py-4"
          style={{ borderTop: `1px solid ${CREAM_DIM}` }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0"
              style={{
                backgroundColor: 'transparent',
                border: `1px solid ${CREAM_DIM}`,
                color: CREAM_MID,
                fontFamily: "var(--font-mono)",
                fontSize: '8px',
              }}
            >
              U
            </div>
            {!collapsed && (
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: '9px',
                    fontWeight: 700,
                    color: CREAM_MID,
                    letterSpacing: '0.06em',
                  }}
                >
                  사용자
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: '7px',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    color: CREAM_MID,
                    opacity: 0.4,
                    marginTop: '1px',
                  }}
                >
                  Free Plan
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main
        className="flex-1 min-w-0 overflow-y-auto"
        style={{ backgroundColor: NEAR_BK }}
      >
        {/* Top bar */}
        {(title || titleEn) && (
          <div
            className="sticky top-0 z-10 flex items-center justify-between px-4 md:px-8"
            style={{
              height: 60,
              boxSizing: 'border-box',
              backgroundColor: NEAR_BK,
              borderBottom: `1px solid ${CREAM_DIM}`,
            }}
          >
            <div>
              {titleEn && (
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: '7px',
                    letterSpacing: '0.4em',
                    textTransform: 'uppercase',
                    color: CREAM_MID,
                    opacity: 0.45,
                    marginBottom: '2px',
                    lineHeight: 1,
                  }}
                >
                  {titleEn}
                </div>
              )}
              {title && (
                <h1
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontWeight: 600,
                    fontSize: '16px',
                    color: CREAM,
                    letterSpacing: '-0.01em',
                    lineHeight: 1.15,
                  }}
                >
                  {title}
                </h1>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: '8px',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  color: BLACK,
                  backgroundColor: CREAM,
                  border: 'none',
                  padding: '7px 14px',
                  cursor: 'pointer',
                  transition: 'background-color 0.18s',
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = ACCENT; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = CREAM; }}
                onClick={() => navigate('/dashboard/session')}
              >
                + 새 세션
              </button>
            </div>
          </div>
        )}
        <div className="p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
