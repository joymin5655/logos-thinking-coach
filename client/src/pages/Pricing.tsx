import MarketingLayout from '@/components/MarketingLayout';
import PlanCards from '@/components/PlanCards';
import { useT } from '@/i18n';
import { usePageMeta } from '@/lib/usePageMeta';

export default function Pricing() {
  usePageMeta('pricing');
  const t = useT('pricing');
  return (
    <MarketingLayout singleViewport>
      <section
        style={{
          backgroundColor: 'var(--l-bg)',
          color: 'var(--l-fg)',
          padding: '3.5rem 2rem 2rem',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          boxSizing: 'border-box',
          overflowY: 'auto',
        }}
      >
        <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.5rem' }} aria-hidden="true">
            <div style={{ width: 28, height: 1, backgroundColor: 'var(--l-border-mid)' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.25em', color: 'var(--l-accent)' }}>004</span>
            <div style={{ flex: 1, height: 1, backgroundColor: 'var(--l-border)' }} />
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.42em', textTransform: 'uppercase', marginBottom: '0.5rem', color: 'var(--l-accent)' }}>{t('eyebrow')}</div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 'clamp(1.5rem, 2.8vw, 2.2rem)', letterSpacing: '-0.02em', marginBottom: '1.5rem', color: 'var(--l-fg)' }}>
            {t('heading')}
          </h1>

          <PlanCards variant="public" />
        </div>
      </section>
    </MarketingLayout>
  );
}
