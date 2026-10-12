/*
 * Login.tsx — Google 로그인 한 가지. 이미 로그인했으면 next로 보낸다.
 */
import { useEffect, useState } from 'react';
import { Link, useLocation, useSearch } from 'wouter';
import PrefsToggle from '@/components/PrefsToggle';
import { T, mono, serif, body, btnPrimary, btnDisabled, panelStyle } from '@/components/logos-ui';
import { safeNext, useAuth } from '@/lib/auth';
import { useT } from '@/i18n';
import { usePageMeta } from '@/lib/usePageMeta';

export default function Login() {
  usePageMeta('login');
  const t = useT('auth');
  const [, navigate] = useLocation();
  const next = safeNext(new URLSearchParams(useSearch()).get('next'));
  const { user, loading, ready, signIn } = useAuth();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (user) navigate(next, { replace: true });
  }, [user, next, navigate]);

  const go = async () => {
    setBusy(true);
    setFailed(false);
    const ok = await signIn(next);
    if (!ok) {
      setFailed(true);
      setBusy(false);
    }
  };

  const disabled = busy || loading || !ready;
  return (
    <div style={{ minHeight: 'calc(100dvh / var(--ui-scale))', background: T.black, color: T.cream, fontFamily: mono, display: 'flex', flexDirection: 'column' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: `1px solid ${T.border}` }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, color: T.cream, textDecoration: 'none' }}>
          <img src="/logo.png" className="logo-mark" alt="" style={{ width: 22, height: 22, objectFit: 'contain' }} />
          <span style={{ fontWeight: 700, fontSize: 11, letterSpacing: '0.22em' }}>LOGOS</span>
        </Link>
        <PrefsToggle />
      </header>
      <main style={{ flex: 1, display: 'grid', placeItems: 'center', padding: 20 }}>
        <div style={{ ...panelStyle, width: '100%', maxWidth: 400, display: 'grid', gap: 18 }}>
          <h1 style={{ margin: 0, fontFamily: serif, fontWeight: 600, fontSize: 24, color: T.cream }}>{t('loginTitle')}</h1>
          <p style={{ margin: 0, fontFamily: body, fontSize: 13, lineHeight: 1.7, letterSpacing: 'normal', color: T.creamMid }}>{t('loginLead')}</p>
          {!ready && !loading ? (
            <p role="status" style={{ margin: 0, padding: 12, border: `1px solid ${T.borderMid}`, fontFamily: body, fontSize: 13, color: T.amber }}>{t('notConfigured')}</p>
          ) : null}
          <button type="button" className="lg-btn" onClick={() => void go()} disabled={disabled} style={{ ...btnPrimary, ...(disabled ? btnDisabled : {}) }}>
            {busy ? t('redirecting') : t('google')}
          </button>
          {failed && <p role="alert" style={{ margin: 0, fontFamily: body, fontSize: 12, color: T.error }}>{t('signInFailed')}</p>}
          <p style={{ margin: 0, fontFamily: body, fontSize: 12, lineHeight: 1.6, letterSpacing: 'normal', color: T.creamMid }}>
            {t('privacyNote')}{' '}
            <Link href="/privacy" style={{ color: T.creamMid, textDecoration: 'underline' }}>{t('privacyLink')}</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
