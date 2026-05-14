/*
 * DashboardLayout.tsx
 * LOGOS Design: 대시보드 레이아웃 — 사이드바 + 메인 콘텐츠
 * - 다크 올리브 사이드바 (#2C2C1E)
 * - 크림 메인 영역 (#E8E0D0)
 * - 미니멀 아이콘 + 텍스트 네비게이션
 */
import { useLocation } from 'wouter';
import { useState } from 'react';

interface NavItem {
  path: string;
  label: string;
  labelEn: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    path: '/dashboard',
    label: '홈',
    labelEn: 'Home',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 6L8 1L14 6V14H10V10H6V14H2V6Z" stroke="currentColor" strokeWidth="1.2" fill="none" />
      </svg>
    ),
  },
  {
    path: '/dashboard/session',
    label: '씽킹 세션',
    labelEn: 'Session',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2" />
        <path d="M8 5V8L10 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    path: '/dashboard/analytics',
    label: '논리력 분석',
    labelEn: 'Analytics',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
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
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
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
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
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
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#C5C9B4' }}>
      {/* Sidebar */}
      <aside
        className="flex flex-col shrink-0 transition-all duration-300"
        style={{
          width: collapsed ? '60px' : '220px',
          backgroundColor: '#2C2C1E',
          color: '#E8E0D0',
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-3 px-4 py-5 border-b"
          style={{ borderColor: 'rgba(232, 224, 208, 0.1)' }}
        >
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <img
              src="/template-storage/logos-icon-192_bd75ec0c.png"
              alt="LOGOS"
              width="24"
              height="24"
              className="shrink-0"
              style={{ objectFit: 'contain' }}
            />
            {!collapsed && (
              <span
                className="text-sm font-bold tracking-[0.15em] uppercase"
                style={{ fontFamily: 'Outfit, sans-serif', color: '#C5C9B4' }}
              >
                LOGOS
              </span>
            )}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto opacity-30 hover:opacity-70 transition-opacity"
            style={{ color: '#E8E0D0' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              {collapsed ? (
                <path d="M2 4H12M2 7H12M2 10H12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              ) : (
                <path d="M2 4H12M2 7H8M2 10H10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-150"
                style={{
                  color: isActive ? '#EF9F27' : 'rgba(232, 224, 208, 0.6)',
                  backgroundColor: isActive ? 'rgba(239, 159, 39, 0.08)' : 'transparent',
                  borderLeft: isActive ? '2px solid #EF9F27' : '2px solid transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = '#E8E0D0';
                    e.currentTarget.style.backgroundColor = 'rgba(232, 224, 208, 0.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = 'rgba(232, 224, 208, 0.6)';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span className="shrink-0">{item.icon}</span>
                {!collapsed && (
                  <div>
                    <div
                      className="text-xs font-semibold"
                      style={{ fontFamily: 'Outfit, sans-serif' }}
                    >
                      {item.label}
                    </div>
                    <div
                      className="text-[0.6rem] tracking-[0.15em] uppercase opacity-40"
                      style={{ fontFamily: 'Outfit, sans-serif' }}
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
          className="px-4 py-4 border-t"
          style={{ borderColor: 'rgba(232, 224, 208, 0.1)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ backgroundColor: '#534AB7', color: '#E8E0D0' }}
            >
              U
            </div>
            {!collapsed && (
              <div>
                <div
                  className="text-xs font-semibold"
                  style={{ fontFamily: 'Outfit, sans-serif', color: '#C5C9B4' }}
                >
                  사용자
                </div>
                <div
                  className="text-[0.6rem] opacity-40"
                  style={{ fontFamily: 'Outfit, sans-serif', color: '#C5C9B4' }}
                >
                  Free Plan
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto" style={{ backgroundColor: '#D8DBC8' }}>
        {/* Top bar */}
        {(title || titleEn) && (
          <div
            className="sticky top-0 z-10 flex items-center justify-between px-8 py-4 border-b"
            style={{
              backgroundColor: '#D8DBC8',
              borderColor: 'rgba(30, 30, 20, 0.1)',
            }}
          >
            <div>
              {titleEn && (
                <div
                  className="text-[0.6rem] tracking-[0.35em] uppercase opacity-40 mb-0.5"
                  style={{ fontFamily: 'Outfit, sans-serif', color: '#1E1E14' }}
                >
                  {titleEn}
                </div>
              )}
              {title && (
                <h1
                  className="text-lg font-bold"
                  style={{ fontFamily: "'Source Serif 4', Georgia, serif", color: '#1E1E14', fontWeight: 700 }}
                >
                  {title}
                </h1>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                className="text-xs tracking-[0.15em] uppercase px-4 py-2 transition-all duration-200"
                style={{
                  fontFamily: 'Outfit, sans-serif',
                  color: '#C5C9B4',
                  backgroundColor: '#1E1E14',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#3A3A28';
                  e.currentTarget.style.color = '#C5C9B4';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#1E1E14';
                  e.currentTarget.style.color = '#C5C9B4';
                }}
                onClick={() => navigate('/dashboard/session')}
              >
                + 새 세션
              </button>
            </div>
          </div>
        )}
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
