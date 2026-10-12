/*
 * Subscription.tsx
 * LOGOS Design: 구독 페이지
 * - 현재 플랜 상태 (결제는 아직 열리지 않음)
 * - 플랜 카드 (PlanCards 공유 컴포넌트, 사전 알림 신청 포함)
 * - FAQ
 */
import DashboardLayout from '@/components/DashboardLayout';
import PlanCards from '@/components/PlanCards';
import { T, mono, serif, Label, panelStyle, FocusStyle } from '@/components/logos-ui';
import { usePageMeta } from '@/lib/usePageMeta';
import { useT } from '@/i18n';

const FAQ = ['faq1', 'faq2', 'faq3', 'faq4'] as const;

export default function Subscription() {
  const t = useT('pricing');
  const tn = useT('nav');
  usePageMeta('subscription', { noindex: true });

  return (
    <DashboardLayout title={t('subTitle')} titleEn={tn('subscriptionEn')}>
      <FocusStyle />
      {/* Current Status */}
      <div style={{ ...panelStyle, backgroundColor: T.faint, marginBottom: 32, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Label style={{ marginBottom: 6 }}>{t('currentPlan')}</Label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontFamily: serif, fontSize: 26, fontWeight: 600, color: T.cream }}>{t('planFree')}</span>
            <span style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.15em', padding: '3px 8px', backgroundColor: T.faint, color: T.creamMid, border: `1px solid ${T.border}` }}>{t('planActive')}</span>
          </div>
          <p className="l-prose" style={{ fontSize: 12, color: T.creamMid, marginTop: 5, marginBottom: 0 }}>{t('betaNote')}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: mono, fontSize: 11, color: T.creamMid, marginBottom: 4 }}>{t('billing')}</div>
          <div style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: T.cream }}>{t('billingSoon')}</div>
        </div>
      </div>

      <div style={{ marginBottom: 40 }}>
        <PlanCards variant="dashboard" currentPlanId="free" />
      </div>

      <div>
        <Label style={{ marginBottom: 20 }}>{t('faq')}</Label>
        <div>
          {FAQ.map((k) => (
            <div key={k} style={{ borderTop: `1px solid ${T.border}`, padding: '20px 0' }}>
              <div style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, color: T.cream, marginBottom: 8 }}>{t(`${k}q`)}</div>
              <p className="l-prose" style={{ fontSize: 13, color: T.creamMid, margin: 0 }}>{t(`${k}a`)}</p>
            </div>
          ))}
          <div style={{ borderTop: `1px solid ${T.border}` }} />
        </div>
      </div>
    </DashboardLayout>
  );
}
