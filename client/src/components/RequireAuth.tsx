/*
 * RequireAuth — 로그인한 사용자만 보여 준다. 아니면 /login?next=<현재 경로>로 보낸다.
 */
import type { ReactNode } from 'react';
import { Redirect, useLocation } from 'wouter';
import { useAuth } from '@/lib/auth';
import { useT } from '@/i18n';
import { T, mono } from '@/components/logos-ui';

export default function RequireAuth({ children }: { children: ReactNode }) {
  const t = useT('auth');
  const { user, loading } = useAuth();
  const [path] = useLocation();
  if (loading) {
    return (
      <div role="status" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: T.black, color: T.creamMid, fontFamily: mono, fontSize: 11, letterSpacing: '0.18em' }}>
        {t('checking')}
      </div>
    );
  }
  if (!user) return <Redirect to={`/login?next=${encodeURIComponent(path + window.location.search)}`} replace />;
  return <>{children}</>;
}
