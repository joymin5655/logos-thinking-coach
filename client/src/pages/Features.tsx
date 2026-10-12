import MarketingLayout from '@/components/MarketingLayout';
import { SEMANTIC, SEMANTIC_DARK } from '@/lib/colors';
import { useTheme } from '@/contexts/ThemeContext';
import { useT } from '@/i18n';

export default function Features() {
  const t = useT('features');
  const sem = useTheme().theme === 'dark' ? SEMANTIC : SEMANTIC_DARK;
  const FEATURES = [
    { icon: '◎', title: t('f1Title'), desc: t('f1Desc'), color: sem.draw },
    { icon: '◈', title: t('f2Title'), desc: t('f2Desc'), color: sem.info },
    { icon: '◉', title: t('f3Title'), desc: t('f3Desc'), color: sem.win },
  ];
  return (
    <MarketingLayout singleViewport>
      <section
        style={{
          backgroundColor: 'var(--l-bg)',
          color: 'var(--l-fg)',
          padding: '4rem 2rem 2rem',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '2rem', opacity: 0.35 }}>
            <div style={{ width: 28, height: 1, backgroundColor: 'var(--l-fg)' }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: '11px', letterSpacing: '0.25em', color: sem.draw }}>003</span>
            <div style={{ flex: 1, height: 1, backgroundColor: 'var(--l-fg)', opacity: 0.15 }} />
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: '11px', letterSpacing: '0.42em', textTransform: 'uppercase', opacity: 0.32, marginBottom: '1rem', color: 'var(--l-fg)' }}>{t('eyebrow')}</div>
          <h2 style={{ fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: 'clamp(1.8rem, 3.4vw, 2.8rem)', letterSpacing: '-0.02em', marginBottom: '1rem', maxWidth: '520px', color: 'var(--l-fg)' }}>
            {t('titleLine1')}<br />{t('titleLine2')}
          </h2>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', letterSpacing: '0.18em', textTransform: 'uppercase', color: sem.draw, fontWeight: 700, marginBottom: '2.5rem' }}>
            {t('tagline')}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', backgroundColor: 'var(--l-border-mid)' }}>
            {FEATURES.map((f) => (
              <div key={f.title} style={{ padding: '2rem 1.75rem', backgroundColor: 'var(--l-panel)', borderTop: `2px solid ${f.color}` }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: '28px', marginBottom: '1rem', color: f.color }}>{f.icon}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: '13px', letterSpacing: '0.12em', marginBottom: '0.5rem', color: f.color, textTransform: 'uppercase' }}>{f.title}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: '13px', opacity: 0.55, lineHeight: 1.65, color: 'var(--l-fg)' }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
