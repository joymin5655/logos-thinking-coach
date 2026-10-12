/*
 * PrefsToggle — 언어(KO/EN)와 라이트/다크 전환 버튼 한 쌍. 마케팅 헤더·대시보드 사이드바에서 쓴다.
 */
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useLocale, useT } from '@/i18n';

const btn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 32, height: 32, padding: '0 8px',
  background: 'transparent', border: '1px solid var(--l-border-mid)', color: 'var(--l-fg-mid)',
  fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em', cursor: 'pointer',
};

export default function PrefsToggle({ style }: { style?: React.CSSProperties }) {
  const t = useT('common');
  const { locale, setLocale } = useLocale();
  const { theme, toggleTheme } = useTheme();
  return (
    <div style={{ display: 'inline-flex', gap: 6, ...style }}>
      <button type="button" style={btn} onClick={() => setLocale(locale === 'ko' ? 'en' : 'ko')} aria-label={t('langToggle')} title={t('langToggle')}>
        {t('langShort')}
      </button>
      <button type="button" style={btn} onClick={toggleTheme} aria-label={t('themeToggle')} title={theme === 'dark' ? t('themeLight') : t('themeDark')}>
        {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
      </button>
    </div>
  );
}
