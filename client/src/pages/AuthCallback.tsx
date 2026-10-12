/*
 * AuthCallback.tsx — OAuth 리디렉션 도착 지점. PKCE 교환은 supabase-js가 하고, 끝나면 next로 보낸다.
 */
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { T, mono, sans, panelStyle } from '@/components/logos-ui';
import { safeNext, useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { translate, useT } from '@/i18n';

export default function AuthCallback() {
  const t = useT('auth');
  const [, navigate] = useLocation();
  const { user, loading } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const desc = query.get('error_description') ?? hash.get('error_description');
    if (desc) {
      setError(translate('auth', 'callbackNoSession')); // URL의 error_description은 화면에 그대로 싣지 않는다
      return;
    }
    if (!supabase) {
      setError(translate('auth', 'notConfigured'));
      return;
    }
    // getSession()은 코드 교환이 끝날 때까지 기다린다
    void supabase.auth.getSession().then(({ data, error: e }) => {
      if (e) setError(translate('auth', 'callbackNoSession'));
      else if (!data.session) setError(translate('auth', 'callbackNoSession'));
    });
  }, []);

  useEffect(() => {
    if (!loading && user) navigate(safeNext(new URLSearchParams(window.location.search).get('next')), { replace: true });
  }, [loading, user, navigate]);

  return (
    <div style={{ minHeight: 'calc(100dvh / var(--ui-scale))', background: T.black, color: T.cream, fontFamily: mono, display: 'grid', placeItems: 'center', padding: 20 }}>
      {error ? (
        <div role="alert" style={{ ...panelStyle, maxWidth: 400, display: 'grid', gap: 14 }}>
          <h1 style={{ margin: 0, fontSize: 14, color: T.error }}>{t('callbackError')}</h1>
          <p style={{ margin: 0, fontFamily: sans, fontSize: 13, lineHeight: 1.6, color: T.creamMid, overflowWrap: 'anywhere' }}>{error}</p>
          <Link href="/login" style={{ color: T.cream, textDecoration: 'underline', fontSize: 12 }}>{t('backToLogin')}</Link>
        </div>
      ) : (
        <p role="status" style={{ fontSize: 11, letterSpacing: '0.18em', color: T.creamMid }}>{t('callbackWorking')}</p>
      )}
    </div>
  );
}
