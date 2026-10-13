/*
 * SignupConsent — 가입(로그인) 필수 동의 체크박스. Login·Join이 함께 쓴다.
 * 약관·방침 링크는 새 탭으로 열어 체크 상태를 잃지 않게 한다.
 */
import { T, body } from '@/components/logos-ui';
import { useT } from '@/i18n';

export const CONSENT_HINT_ID = 'consent-hint';

export default function SignupConsent({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  const t = useT('auth');
  const link = { color: T.creamMid, textDecoration: 'underline' } as const;
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <label htmlFor="consent" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, minHeight: 44, cursor: 'pointer', fontFamily: body, fontSize: 13, lineHeight: 1.6, letterSpacing: 'normal', color: T.cream }}>
        <input id="consent" type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-required="true" aria-describedby={CONSENT_HINT_ID} style={{ width: 20, height: 20, marginTop: 2, flexShrink: 0, accentColor: 'var(--l-accent)', cursor: 'pointer' }} />
        <span>{t('consent')} <span style={{ color: T.creamMid }}>{t('consentRequired')}</span></span>
      </label>
      <p id={CONSENT_HINT_ID} style={{ margin: 0, paddingLeft: 30, fontFamily: body, fontSize: 12, lineHeight: 1.6, letterSpacing: 'normal', color: T.creamMid }}>
        <a href="/terms" target="_blank" rel="noopener noreferrer" style={link}>{t('consentTerms')}</a>{' · '}
        <a href="/privacy" target="_blank" rel="noopener noreferrer" style={link}>{t('consentPrivacy')}</a>
        {!checked && <> · {t('consentHint')}</>}
      </p>
    </div>
  );
}
