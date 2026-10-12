/*
 * Subscription.tsx
 * LOGOS Design: 구독 페이지
 * - 현재 플랜 상태 (결제는 아직 열리지 않음)
 * - 플랜 카드 (PlanCards 공유 컴포넌트, 사전 알림 신청 포함)
 * - FAQ
 */
import DashboardLayout from '@/components/DashboardLayout';
import PlanCards from '@/components/PlanCards';
import { useT } from '@/i18n';

const FAQ = ['faq1', 'faq2', 'faq3', 'faq4'] as const;

export default function Subscription() {
  const t = useT('pricing');

  return (
    <DashboardLayout title={t('subTitle')} titleEn="Subscription">
      {/* Current Status */}
      <div className="p-6 mb-8 flex flex-wrap gap-4 items-center justify-between" style={{ border: '1px solid var(--l-border)', backgroundColor: 'var(--l-faint)' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--l-fg-mid)', marginBottom: '6px' }}>{t('currentPlan')}</div>
          <div className="flex items-center gap-3">
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: '26px', fontWeight: 600, color: 'var(--l-fg)' }}>{t('planFree')}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.15em', padding: '3px 8px', backgroundColor: 'var(--l-faint)', color: 'var(--l-fg-mid)' }}>{t('planActive')}</span>
          </div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--l-fg-mid)', marginTop: '5px' }}>{t('betaNote')}</p>
        </div>
        <div className="text-right">
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--l-fg-mid)', marginBottom: '4px' }}>{t('billing')}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700, color: 'var(--l-fg)' }}>{t('billingSoon')}</div>
        </div>
      </div>

      <div className="mb-10">
        <PlanCards variant="dashboard" currentPlanId="free" />
      </div>

      <div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--l-fg-mid)', marginBottom: '20px' }}>{t('faq')}</div>
        <div>
          {FAQ.map((k) => (
            <div key={k} className="py-5" style={{ borderTop: '1px solid var(--l-border)' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700, color: 'var(--l-fg)', marginBottom: '8px' }}>{t(`${k}q`)}</div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--l-fg-mid)', lineHeight: 1.8 }}>{t(`${k}a`)}</p>
            </div>
          ))}
          <div style={{ borderTop: '1px solid var(--l-border)' }} />
        </div>
      </div>
    </DashboardLayout>
  );
}
