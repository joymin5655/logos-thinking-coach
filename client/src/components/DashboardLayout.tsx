/*
 * DashboardLayout.tsx
 * LOGOS Design: 대시보드 레이아웃 — 랜딩페이지 팔레트 통일
 *
 * 색은 모두 CSS 변수(index.css의 --l-*)라 라이트/다크를 따른다.
 *   Sidebar BG  : --l-bg        Main BG : --l-panel
 *   Text        : --l-fg        Text dim: --l-fg-mid
 *   Border      : --l-border    Tint    : --l-faint
 *   Accent      : --l-accent
 * Typography: Space Mono
 */
import { useLocation } from 'wouter';
import { useState } from 'react';
import PrefsToggle from '@/components/PrefsToggle';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/lib/auth';
import { usePending } from '@/lib/sync';
import { useLocale, useT } from '@/i18n';
import type { nav as NavDict } from '@/i18n/ko/nav';

// ── 팔레트 (값은 CSS 변수) ──
const BLACK    = 'var(--l-bg)';
const NEAR_BK  = 'var(--l-panel)';
const CREAM    = 'var(--l-fg)';
const CREAM_MID = 'var(--l-fg-mid)';
const CREAM_DIM = 'var(--l-border)';
const TINT     = 'var(--l-faint)';
const ACCENT   = 'var(--l-accent)';
const ON_CREAM = 'var(--l-on-fg)';

interface NavItem {
  path: string;
  labelKey: Exclude<keyof typeof NavDict, 'newSession' | 'userMenu' | 'defaultName' | 'plan' | 'settings' | 'privacy' | 'admin' | 'signOut' | 'signIn' | 'pending' | 'collapse'>;
  /** 한국어 화면에서만 보이는 영문 보조 표기(디자인 요소) */
  labelEn: string;
  icon: React.ReactNode;
  /** Spec의 Session 1/2/3 인덱스 (3 코어 세션만 표기) */
  session?: '01' | '02' | '03';
}

const NAV_ITEMS: NavItem[] = [
  {
    path: '/dashboard',
    labelKey: 'home',
    labelEn: 'Home',
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <path d="M2 6L8 1L14 6V14H10V10H6V14H2V6Z" stroke="currentColor" strokeWidth="1.2" fill="none" />
      </svg>
    ),
  },
  {
    path: '/dashboard/diagnostic',
    labelKey: 'diagnostic',
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
    labelKey: 'argue',
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
    labelKey: 'session',
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
    labelKey: 'arena',
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
    labelKey: 'analytics',
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
    labelKey: 'history',
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
    labelKey: 'subscription',
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
  const t = useT('nav');
  const { locale } = useLocale();
  const { user, isAdmin, signOut } = useAuth();
  const pending = usePending();
  const [avatarFailed, setAvatarFailed] = useState(false);
  const meta = (user?.user_metadata ?? {}) as { full_name?: string; name?: string; avatar_url?: string };
  const name = meta.full_name || meta.name || user?.email?.split('@')[0] || t('defaultName');
  const avatarUrl = meta.avatar_url;
  const initial = name.slice(0, 1).toUpperCase();
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
            aria-label={t('collapse')}
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
                  backgroundColor: isActive ? TINT : 'transparent',
                  borderLeft: isActive ? `2px solid ${CREAM}` : `2px solid transparent`,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = CREAM;
                    e.currentTarget.style.backgroundColor = TINT;
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
                      <span>{t(item.labelKey)}</span>
                    </div>
                    {locale === 'ko' && (
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
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* User section */}
        <div
          className="px-4 py-4"
          style={{ borderTop: `1px solid ${CREAM_DIM}`, display: 'grid', gap: 12 }}
        >
          {!collapsed && <PrefsToggle />}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={t('userMenu')}
                  className="flex items-center gap-3 text-left w-full"
                  style={{ color: CREAM_MID, minWidth: 0 }}
                >
                  <span
                    className="w-6 h-6 flex items-center justify-center shrink-0 overflow-hidden"
                    style={{ border: `1px solid ${CREAM_DIM}`, fontFamily: "var(--font-mono)", fontSize: '10px', fontWeight: 700 }}
                  >
                    {avatarUrl && !avatarFailed ? (
                      <img src={avatarUrl} alt="" width={24} height={24} referrerPolicy="no-referrer" onError={() => setAvatarFailed(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      initial
                    )}
                  </span>
                  {!collapsed && (
                    <span style={{ minWidth: 0, flex: 1 }}>
                      <span
                        style={{
                          display: 'block', fontFamily: "var(--font-mono)", fontSize: '10px', fontWeight: 700,
                          color: CREAM, letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}
                      >
                        {name}
                      </span>
                      <span
                        style={{
                          display: 'block', fontFamily: "var(--font-mono)", fontSize: '8px', letterSpacing: '0.15em',
                          textTransform: 'uppercase', color: CREAM_MID, marginTop: '1px',
                        }}
                      >
                        {t('plan')}
                      </span>
                      {pending > 0 && (
                        <span style={{ display: 'block', fontFamily: "var(--font-mono)", fontSize: '8px', color: 'var(--l-amber)', marginTop: '2px' }}>
                          {t('pending', { n: pending })}
                        </span>
                      )}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="min-w-48">
                <DropdownMenuItem onSelect={() => navigate('/dashboard/settings')}>{t('settings')}</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate('/privacy')}>{t('privacy')}</DropdownMenuItem>
                {isAdmin && <DropdownMenuItem onSelect={() => navigate('/admin')}>{t('admin')}</DropdownMenuItem>}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => {
                    void signOut().then((done) => done && navigate('/'));
                  }}
                >
                  {t('signOut')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button
              type="button"
              onClick={() => navigate(`/login?next=${encodeURIComponent(location)}`)}
              style={{
                fontFamily: "var(--font-mono)", fontSize: '9px', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase',
                color: ON_CREAM, backgroundColor: CREAM, border: 'none', padding: '8px 10px', cursor: 'pointer',
              }}
            >
              {collapsed ? '→' : t('signIn')}
            </button>
          )}
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
                  color: ON_CREAM,
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
                {t('newSession')}
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
