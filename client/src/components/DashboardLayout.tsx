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
import { Link, useLocation } from 'wouter';
import { useEffect, useRef, useState } from 'react';
import PrefsToggle from '@/components/PrefsToggle';
import { AiNotice } from '@/components/logos-ui';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/lib/auth';
import { usePending } from '@/lib/sync';
import { useLocale, useT } from '@/i18n';

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
  labelKey: 'home' | 'diagnostic' | 'argue' | 'session' | 'arena' | 'analytics' | 'history' | 'subscription';
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

// 모바일(≤640px)에서는 사이드바 대신 하단 탭바를 쓴다. 표시 전환은 CSS로만 해 깜빡임이 없다.
const LAYOUT_CSS = `
.dl-tabbar,.dl-mobile-top,.dl-sheet{display:none}
@media (max-width:640px){
  .dl-aside{display:none!important}
  .dl-mobile-top{display:flex}
  .dl-tabbar{display:flex}
  .dl-tabbar[data-hidden="true"]{display:none!important}
  .dl-content{padding-bottom:calc(76px + env(safe-area-inset-bottom,0px))!important}
  .dl-sheet{display:block}
}
.dl-tab{flex:1;min-width:0;min-height:56px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;font-family:var(--font-mono);font-size:11px;background:none;border:none;text-decoration:none;cursor:pointer}
.dl-tab:focus-visible,.dl-sheet a:focus-visible,.dl-sheet button:focus-visible{outline:2px solid var(--l-amber);outline-offset:-2px}
`;

const TAB_PATHS: { path: string; key: 'tabHome' | 'tabArgue' | 'tabCoach' | 'tabArena' }[] = [
  { path: '/dashboard', key: 'tabHome' },
  { path: '/dashboard/argue', key: 'tabArgue' },
  { path: '/dashboard/session', key: 'tabCoach' },
  { path: '/dashboard/arena', key: 'tabArena' },
];
const MORE_PATHS: { path: string; key: 'diagnostic' | 'analytics' | 'history' | 'subscription' }[] = [
  { path: '/dashboard/diagnostic', key: 'diagnostic' },
  { path: '/dashboard/analytics', key: 'analytics' },
  { path: '/dashboard/history', key: 'history' },
  { path: '/dashboard/subscription', key: 'subscription' },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  titleEn?: string;
  /** AI와 상호작용하는 화면이면 상단에 AI 고지 한 줄을 보인다. */
  aiNotice?: boolean;
}

const sheetRow = (active: boolean): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', minHeight: 48, padding: '0 20px', fontFamily: 'var(--font-mono)', fontSize: 13,
  fontWeight: active ? 700 : 400, color: active ? CREAM : CREAM_MID, textDecoration: 'none', boxSizing: 'border-box',
});

export default function DashboardLayout({ children, title, titleEn, aiNotice }: DashboardLayoutProps) {
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
  const [moreOpen, setMoreOpen] = useState(false);
  const [kbd, setKbd] = useState(false); // 모바일에서 입력창에 포커스가 있으면(키보드가 올라오면) 탭바를 숨긴다
  const mainRef = useRef<HTMLElement>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeMore = () => {
    setMoreOpen(false);
    moreBtnRef.current?.focus();
  };
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const isField = (n: EventTarget | null) => n instanceof HTMLTextAreaElement || (n instanceof HTMLInputElement && n.type === 'text');
    const on = (e: FocusEvent) => isField(e.target) && setKbd(true);
    const off = () => setKbd(false);
    el.addEventListener('focusin', on);
    el.addEventListener('focusout', off);
    return () => {
      el.removeEventListener('focusin', on);
      el.removeEventListener('focusout', off);
    };
  }, []);
  useEffect(() => setMoreOpen(false), [location]);
  useEffect(() => {
    if (!moreOpen) return;
    const items = () => Array.from(sheetRef.current?.querySelectorAll<HTMLElement>('a[href], button') ?? []);
    items()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMoreOpen(false);
        moreBtnRef.current?.focus();
        return;
      }
      // 시트 안에서만 Tab이 돌게 한다(aria-modal)
      if (e.key !== 'Tab') return;
      const list = items();
      if (!list.length) return;
      const i = list.indexOf(document.activeElement as HTMLElement);
      const next = e.shiftKey ? (i <= 0 ? list.length - 1 : i - 1) : (i === list.length - 1 ? 0 : i + 1);
      e.preventDefault();
      list[next].focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [moreOpen]);
  const navIcon = (path: string) => NAV_ITEMS.find((n) => n.path === path)?.icon;
  const [collapsed, setCollapsed] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  return (
    <div
      className="flex fit-viewport overflow-hidden"
      style={{ backgroundColor: BLACK, fontFamily: "var(--font-mono)" }}
    >
      {/* ── Sidebar ── */}
      <style>{LAYOUT_CSS}</style>
      <aside
        className="dl-aside flex flex-col shrink-0 transition-all duration-300"
        style={{
          width: collapsed ? '56px' : '216px',
          backgroundColor: BLACK,
          color: CREAM,
          borderRight: `1px solid ${CREAM_DIM}`,
        }}
      >
        {/* Logo — height 60px (top bar와 정렬) */}
        <div
          className={collapsed ? 'flex items-center px-2' : 'flex items-center gap-3 px-4'}
          style={{ height: 60, borderBottom: `1px solid ${CREAM_DIM}`, boxSizing: 'border-box' }}
        >
          {!collapsed && (
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 hover:opacity-75 transition-opacity"
            >
              <img src="/logo.png" className="logo-mark" alt="LOGOS" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
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
            </button>
          )}
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={t('collapse')}
            aria-expanded={!collapsed}
            className="flex items-center justify-center transition-opacity"
            style={{ color: CREAM_MID, opacity: 0.6, minWidth: 36, minHeight: 36, margin: collapsed ? '0 auto' : '0 -8px 0 auto' }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '0.6'; }}
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              {collapsed ? (
                <path d="M2 4H12M2 7H12M2 10H12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              ) : (
                <path d="M2 4H12M2 7H8M2 10H10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>

        {/* Nav Items */}
        <nav aria-label={t('navLabel')} className="flex-1 py-3 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.path;
            const label = t(item.labelKey);
            return (
              <Link
                key={item.path}
                href={item.path}
                aria-current={isActive ? 'page' : undefined}
                aria-label={collapsed ? label : undefined}
                title={collapsed ? label : undefined}
                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-150"
                style={{
                  color: isActive ? CREAM : CREAM_MID,
                  backgroundColor: isActive ? TINT : 'transparent',
                  borderLeft: isActive ? `2px solid ${CREAM}` : `2px solid transparent`,
                  textDecoration: 'none',
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
                <span className="shrink-0" aria-hidden="true">{item.icon}</span>
                {!collapsed && (
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 6,
                        fontFamily: "var(--font-mono)",
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                      }}
                    >
                      {item.session && (
                        <span aria-hidden="true" style={{ fontSize: '9px', fontWeight: 400, letterSpacing: '0.2em', color: 'var(--l-fg-dim)' }}>
                          {item.session}
                        </span>
                      )}
                      <span>{label}</span>
                    </div>
                    {locale === 'ko' && (
                      <div
                        aria-hidden="true"
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: '9px',
                          letterSpacing: '0.18em',
                          textTransform: 'uppercase',
                          color: 'var(--l-fg-dim)',
                          marginTop: '1px',
                        }}
                      >
                        {item.labelEn}
                      </div>
                    )}
                  </div>
                )}
              </Link>
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
                  aria-label={pending > 0 ? `${t('userMenu')} · ${t('pending', { n: pending })}` : t('userMenu')}
                  className="flex items-center gap-3 text-left w-full"
                  style={{ color: CREAM_MID, minWidth: 0 }}
                >
                  <span
                    className="relative w-6 h-6 flex items-center justify-center shrink-0"
                    style={{ border: `1px solid ${CREAM_DIM}`, fontFamily: "var(--font-mono)", fontSize: '10px', fontWeight: 700 }}
                  >
                    {pending > 0 && collapsed && (
                      <span aria-hidden="true" style={{ position: 'absolute', top: -3, right: -3, width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--l-amber)', border: `1px solid ${BLACK}` }} />
                    )}
                    {avatarUrl && !avatarFailed ? (
                      <img src={avatarUrl} alt="" width={24} height={24} referrerPolicy="no-referrer" onError={() => setAvatarFailed(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', overflow: 'hidden' }} />
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
                          display: 'block', fontFamily: "var(--font-mono)", fontSize: '9px', letterSpacing: '0.15em',
                          textTransform: 'uppercase', color: CREAM_MID, marginTop: '1px',
                        }}
                      >
                        {t('plan')}
                      </span>
                      {pending > 0 && (
                        <span style={{ display: 'block', fontFamily: "var(--font-mono)", fontSize: '9px', color: 'var(--l-amber)', marginTop: '2px' }}>
                          {t('pending', { n: pending })}
                        </span>
                      )}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="min-w-48">
                <DropdownMenuItem onSelect={() => navigate('/dashboard/settings')}>{t('settings')}</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate('/terms')}>{t('terms')}</DropdownMenuItem>
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
        ref={mainRef}
        className="flex-1 min-w-0 overflow-y-auto"
        style={{ backgroundColor: NEAR_BK }}
      >
        {/* 모바일 상단: 로고 + 계정·동기화 배지 */}
        <div className="dl-mobile-top items-center justify-between px-4" style={{ height: 48, borderBottom: `1px solid ${CREAM_DIM}`, backgroundColor: NEAR_BK }}>
          <Link href="/" aria-label="LOGOS" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <img src="/logo.png" className="logo-mark" alt="" style={{ width: 20, height: 20, objectFit: 'contain' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 11, letterSpacing: '0.22em', color: CREAM }}>LOGOS</span>
          </Link>
          {user ? (
            <Link
              href="/dashboard/settings"
              aria-label={pending > 0 ? `${t('userMenu')} · ${t('pending', { n: pending })}` : t('userMenu')}
              className="relative flex items-center justify-center"
              style={{ minWidth: 36, minHeight: 36, color: CREAM, textDecoration: 'none' }}
            >
              <span className="relative flex items-center justify-center" style={{ width: 26, height: 26, border: `1px solid ${CREAM_DIM}`, fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700 }}>
                {avatarUrl && !avatarFailed ? (
                  <img src={avatarUrl} alt="" width={26} height={26} referrerPolicy="no-referrer" onError={() => setAvatarFailed(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  initial
                )}
                {pending > 0 && <span aria-hidden="true" style={{ position: 'absolute', top: -3, right: -3, width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--l-amber)', border: `1px solid ${BLACK}` }} />}
              </span>
            </Link>
          ) : (
            <Link href={`/login?next=${encodeURIComponent(location)}`} style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: CREAM, minHeight: 36, display: 'flex', alignItems: 'center' }}>
              {t('signIn')}
            </Link>
          )}
        </div>

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
                  aria-hidden="true"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: '9px',
                    letterSpacing: '0.3em',
                    textTransform: 'uppercase',
                    color: 'var(--l-fg-dim)',
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
              {location !== '/dashboard/session' && (
              <button
                type="button"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: '11px',
                  minHeight: 36,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  color: ON_CREAM,
                  backgroundColor: CREAM,
                  border: 'none',
                  padding: '0 14px',
                  cursor: 'pointer',
                  transition: 'background-color 0.18s',
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = ACCENT; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = CREAM; }}
                onClick={() => navigate('/dashboard/session')}
              >
                {t('newSession')}
              </button>
              )}
            </div>
          </div>
        )}
        <div className="dl-content p-4 md:p-6">
          {aiNotice && <AiNotice />}
          {children}
        </div>
      </main>

      {/* ── 모바일 하단 탭바 ── */}
      <nav
        aria-label={t('tabsLabel')}
        className="dl-tabbar"
        data-hidden={kbd ? 'true' : 'false'}
        style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 40, backgroundColor: BLACK, borderTop: `1px solid ${CREAM_DIM}`, paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {TAB_PATHS.map((tab) => {
          const active = location === tab.path;
          return (
            <Link key={tab.path} href={tab.path} className="dl-tab" aria-current={active ? 'page' : undefined} style={{ color: active ? CREAM : CREAM_MID, fontWeight: active ? 700 : 400 }}>
              <span aria-hidden="true">{navIcon(tab.path)}</span>
              {t(tab.key)}
            </Link>
          );
        })}
        <button ref={moreBtnRef} type="button" className="dl-tab" aria-haspopup="dialog" aria-expanded={moreOpen} onClick={() => setMoreOpen((v) => !v)} style={{ color: moreOpen ? CREAM : CREAM_MID }}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><circle cx="3" cy="8" r="1.3" /><circle cx="8" cy="8" r="1.3" /><circle cx="13" cy="8" r="1.3" /></svg>
          {t('tabMore')}
        </button>
      </nav>

      {moreOpen && (
        <div className="dl-sheet" style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
          <div onClick={closeMore} aria-hidden="true" style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)' }} />
          <div
            ref={sheetRef}
            role="dialog" aria-modal="true" aria-label={t('moreTitle')}
            // 현재 페이지 링크를 눌러도 location이 그대로라 닫히지 않으므로 링크 클릭 때 직접 닫는다
            onClick={(e) => { if ((e.target as HTMLElement).closest('a')) setMoreOpen(false); }}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: BLACK, borderTop: `1px solid ${CREAM_DIM}`, padding: '8px 0', paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))', maxHeight: '80dvh', overflowY: 'auto' }}
          >
            {MORE_PATHS.map((m) => (
              <Link key={m.path} href={m.path} aria-current={location === m.path ? 'page' : undefined} style={sheetRow(location === m.path)}>{t(m.key)}</Link>
            ))}
            {user && <Link href="/dashboard/settings" aria-current={location === '/dashboard/settings' ? 'page' : undefined} style={sheetRow(location === '/dashboard/settings')}>{t('settings')}</Link>}
            {user && isAdmin && <Link href="/admin" style={sheetRow(false)}>{t('admin')}</Link>}
            {user ? (
              <button type="button" onClick={() => { setMoreOpen(false); void signOut().then((done) => done && navigate('/')); }} style={{ ...sheetRow(false), width: '100%', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }}>{t('signOut')}</button>
            ) : (
              <>
                <Link href={`/login?next=${encodeURIComponent(location)}`} style={sheetRow(false)}>{t('signIn')}</Link>
                {/* 모바일에선 사이드바가 숨겨져 비로그인 사용자가 언어·테마를 바꿀 곳이 여기뿐이다 */}
                <div style={{ padding: '8px 20px' }}><PrefsToggle /></div>
              </>
            )}
            <button type="button" onClick={closeMore} style={{ ...sheetRow(false), width: '100%', background: 'none', border: 'none', borderTop: `1px solid ${CREAM_DIM}`, textAlign: 'left', cursor: 'pointer', color: CREAM_MID }}>{t('close')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
