/*
 * Join.tsx — 파일럿 참가(/join?c=CODE).
 * 동의 → (로그인) → join_cohort. 군(arm)은 화면에 내지 않는다(블라인드).
 * 로그인은 Google 리다이렉트라 동의 체크를 sessionStorage에 잠깐 두었다가 돌아오면 체크된 채로 보여 준다.
 */
import { useEffect, useState } from 'react';
import { Link, useLocation, useSearch } from 'wouter';
import PrefsToggle from '@/components/PrefsToggle';
import SignupConsent, { CONSENT_HINT_ID } from '@/components/SignupConsent';
import { FocusStyle, T, body, btnDisabled, btnPrimary, mono, panelStyle, serif } from '@/components/logos-ui';
import { ensureProfile, useAuth } from '@/lib/auth';
import { fetchMyMeta, joinCohort, parseCohortCode, type JoinErrorCode } from '@/lib/cohort';
import { useT } from '@/i18n';
import { usePageMeta } from '@/lib/usePageMeta';
import { CONSENT_VERSION } from '../../../shared/pilot';

const CONSENT_FLAG = 'logos.join.consent';

const bigBtn = { ...btnPrimary, minHeight: 48, width: '100%', fontFamily: body, fontSize: 15, fontWeight: 500, letterSpacing: 'normal', textTransform: 'none' } as const;
const monoLabel = { fontFamily: mono, fontSize: 11, letterSpacing: '0.16em', fontWeight: 700, color: T.cream } as const;
const ERROR_KEY = {
  invalid_code: 'errInvalidCode',
  consent_mismatch: 'errConsentMismatch',
  already_joined: 'errAlreadyJoined',
  full: 'errFull',
  unknown: 'errUnknown',
} as const satisfies Record<JoinErrorCode, string>;

// 로그인 왕복 동안 동의 체크를 기억한다. 저장소를 못 쓰면 그냥 다시 체크하면 된다.
function flagKey(code: string) {
  return `${code}|${CONSENT_VERSION}`;
}
function takeConsentFlag(code: string | null): boolean {
  if (!code) return false;
  try {
    const hit = sessionStorage.getItem(CONSENT_FLAG) === flagKey(code);
    sessionStorage.removeItem(CONSENT_FLAG);
    return hit;
  } catch {
    return false;
  }
}
function putConsentFlag(code: string) {
  try {
    sessionStorage.setItem(CONSENT_FLAG, flagKey(code));
  } catch {
    /* 저장소 접근 불가 */
  }
}

type Phase = 'form' | 'joining' | 'done' | 'already';

export default function Join() {
  const t = useT('pilot');
  const ta = useT('auth');
  const [, navigate] = useLocation();
  const code = parseCohortCode(useSearch());
  const { user, loading, ready, signIn } = useAuth();
  const [consent, setConsent] = useState(() => takeConsentFlag(code));
  const [agreed, setAgreed] = useState(false);
  const [phase, setPhase] = useState<Phase>('form');
  const [error, setError] = useState<JoinErrorCode | null>(null);
  const [signInFailed, setSignInFailed] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  usePageMeta('join', { noindex: true });

  // 이미 이 코드로 참가해 동의까지 마친 사람은 폼 없이 바로 안내한다
  useEffect(() => {
    if (!user || !code) return;
    let cancelled = false;
    void fetchMyMeta().then((m) => {
      if (!cancelled && m?.cohort_code === code && m.consent_at) setPhase('already');
    });
    return () => {
      cancelled = true;
    };
  }, [user, code]);

  const join = async () => {
    if (!code || !consent || phase === 'joining') return;
    setPhase('joining');
    setError(null);
    await ensureProfile(); // 프로필(first-touch)이 먼저 만들어져야 한다
    const res = await joinCohort(code);
    if ('error' in res) {
      setError(res.error);
      setPhase('form');
    } else {
      setPhase(res.joined ? 'done' : 'already');
    }
  };

  const login = async () => {
    if (!code || !consent || !agreed || redirecting) return;
    setRedirecting(true);
    setSignInFailed(false);
    putConsentFlag(code);
    if (!(await signIn(`/join?c=${encodeURIComponent(code)}`))) {
      setSignInFailed(true);
      setRedirecting(false);
    }
  };

  const toDiagnostic = () => navigate('/dashboard/diagnostic');
  const homeLink = (
    <Link href="/" style={{ fontFamily: body, fontSize: 13, color: T.creamMid, textDecoration: 'underline' }}>{t('home')}</Link>
  );

  let content;
  if (!code) {
    content = (
      <div style={{ display: 'grid', gap: 14 }}>
        <h1 style={{ margin: 0, fontFamily: serif, fontWeight: 600, fontSize: 26, lineHeight: 1.3, color: T.cream }}>{t('noCodeTitle')}</h1>
        <p style={{ margin: 0, fontFamily: body, fontSize: 15, lineHeight: 1.6, color: T.creamMid }}>{t('noCodeBody')}</p>
        <div>{homeLink}</div>
      </div>
    );
  } else if (phase === 'done' || phase === 'already') {
    const fresh = phase === 'done';
    content = (
      <div style={{ display: 'grid', gap: 14 }} role="status">
        <span style={monoLabel}>{t('label', { code })}</span>
        <h1 style={{ margin: 0, fontFamily: serif, fontWeight: 600, fontSize: 26, lineHeight: 1.3, color: T.cream }}>{t(fresh ? 'doneTitle' : 'alreadyTitle')}</h1>
        <p style={{ margin: 0, fontFamily: body, fontSize: 15, lineHeight: 1.6, color: T.creamMid }}>{t(fresh ? 'doneBody' : 'alreadyBody')}</p>
        <button type="button" className="lg-btn" style={bigBtn} onClick={toDiagnostic}>{t('startDiagnostic')}</button>
      </div>
    );
  } else {
    const joining = phase === 'joining';
    const checking = loading && !user;
    const blocked = !consent || (!user && !agreed) || joining || redirecting || checking || !ready;
    const todo = ['todo1', 'todo2', 'todo3'] as const;
    const data = ['data1', 'data2', 'data3'] as const;
    content = (
      <>
        <div style={{ display: 'grid', gap: 10 }}>
          <span style={monoLabel}>{t('label', { code })}</span>
          <h1 style={{ margin: 0, fontFamily: serif, fontWeight: 600, fontSize: 26, lineHeight: 1.3, color: T.cream }}>{t('heading')}</h1>
          <p style={{ margin: 0, fontFamily: body, fontSize: 15, lineHeight: 1.6, color: T.creamMid }}>{t('lead')}</p>
        </div>

        <section aria-label={t('todoLabel')} style={{ border: `1px solid ${T.borderMid}`, padding: 16, display: 'grid', gap: 12 }}>
          <span style={monoLabel}>{t('todoLabel')}</span>
          <div style={{ display: 'grid', gridTemplateColumns: '28px minmax(0, 1fr)', gap: 10, fontFamily: body, fontSize: 14, lineHeight: 1.55, color: T.cream }}>
            {todo.map((k, i) => (
              <div key={k} style={{ display: 'contents' }}>
                <span style={{ fontFamily: mono, fontWeight: 700 }}>{String(i + 1).padStart(2, '0')}</span>
                <span>{t(k)}</span>
              </div>
            ))}
          </div>
        </section>

        <section aria-label={t('dataLabel')} style={{ ...panelStyle, padding: 16, display: 'grid', gap: 10 }}>
          <span style={monoLabel}>{t('dataLabel')}</span>
          <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6, fontFamily: body, fontSize: 14, lineHeight: 1.55, color: T.cream }}>
            {data.map((k) => <li key={k}>{t(k)}</li>)}
          </ul>
          <span style={{ fontFamily: body, fontSize: 13, lineHeight: 1.55, color: T.creamMid }}>{t('withdrawNote')}</span>
        </section>

        <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', minHeight: 44, fontFamily: body, fontSize: 14, lineHeight: 1.55, color: T.cream, cursor: 'pointer' }}>
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ margin: '4px 0 0', width: 18, height: 18, flex: 'none', accentColor: 'var(--l-fg)' }} />
          <span>
            {t('consent')}{' '}
            <span style={{ fontFamily: mono, fontSize: 11, color: T.creamMid }}>{t('consentVersion', { version: CONSENT_VERSION })}</span>
          </span>
        </label>

        {!user && <SignupConsent checked={agreed} onChange={setAgreed} />}

        {!ready && !loading && <p role="status" style={{ margin: 0, padding: 12, border: `1px solid ${T.borderMid}`, fontFamily: body, fontSize: 13, color: T.amber }}>{ta('notConfigured')}</p>}
        {error && <p role="alert" style={{ margin: 0, padding: '10px 14px', border: `1px solid ${T.error}`, fontFamily: body, fontSize: 13, lineHeight: 1.6, color: T.cream }}>{t(ERROR_KEY[error])}</p>}
        {signInFailed && <p role="alert" style={{ margin: 0, fontFamily: body, fontSize: 12, color: T.error }}>{ta('signInFailed')}</p>}

        <div style={{ display: 'grid', gap: 8 }}>
          <button type="button" className="lg-btn" disabled={blocked} aria-describedby={user ? undefined : CONSENT_HINT_ID} onClick={() => void (user ? join() : login())} style={{ ...bigBtn, ...(blocked ? btnDisabled : {}) }}>
            {joining ? t('joining') : redirecting ? ta('redirecting') : checking ? t('checking') : user ? t('joinNow') : t('joinGoogle')}
          </button>
          <span style={{ fontFamily: body, fontSize: 12, lineHeight: 1.6, color: T.creamMid, textAlign: 'center' }}>
            {t('ageNote')} · <Link href="/privacy" style={{ color: T.creamMid, textDecoration: 'underline' }}>{t('privacyLink')}</Link>
          </span>
        </div>
      </>
    );
  }

  return (
    <div style={{ minHeight: 'calc(100dvh / var(--ui-scale))', background: T.black, color: T.cream, fontFamily: mono, display: 'flex', flexDirection: 'column' }}>
      <FocusStyle />
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: `1px solid ${T.border}` }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, color: T.cream, textDecoration: 'none' }}>
          <img src="/logo.png" className="logo-mark" alt="" style={{ width: 22, height: 22, objectFit: 'contain' }} />
          <span style={{ fontWeight: 700, fontSize: 11, letterSpacing: '0.22em' }}>LOGOS</span>
        </Link>
        <PrefsToggle />
      </header>
      <main style={{ flex: 1, width: '100%', maxWidth: 480, boxSizing: 'border-box', margin: '0 auto', padding: '24px 20px 32px', display: 'flex', flexDirection: 'column', gap: 22 }}>
        {content}
      </main>
    </div>
  );
}
