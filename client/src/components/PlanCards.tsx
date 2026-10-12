/*
 * PlanCards.tsx — Free / Pro / Team 플랜 그리드 (공유 컴포넌트)
 *
 * 사용처:
 *   - /pricing (public, MarketingLayout) — variant="public"
 *   - /dashboard/subscription (auth, DashboardLayout) — variant="dashboard"
 *
 * 책임:
 *   - 빌링 사이클(월/연) 토글 + 연 20% 할인 가격 갱신
 *   - 모든 기능 ✓/— 일관 표시 (단일 진실 소스: shared/plans.ts, 문구는 i18n 'pricing')
 *   - Pro/Team 사전 알림 신청(waitlist 테이블): 비회원은 로그인으로 보내고, 회원은 저장한다
 */
import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import { PLANS, YEARLY_DISCOUNT, monthlyEquivalent, yearlyTotal, type Plan, type BillingCycle } from '@shared/plans';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { formatNumber, useT } from '@/i18n';

type Variant = 'public' | 'dashboard';
type WaitPlan = 'pro' | 'team';

type Props = {
  variant: Variant;
  /** dashboard variant: 현재 사용자 플랜 ID (해당 카드 CTA 비활성) */
  currentPlanId?: Plan['id'];
};

/** 내 사전 신청 목록을 불러오고, 신청하는 훅. 중복(23505)은 이미 신청한 것이므로 성공으로 본다. */
function useWaitlist() {
  const t = useT('pricing');
  const [, navigate] = useLocation();
  const { user, ready } = useAuth();
  const [joined, setJoined] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const uid = user?.id;

  useEffect(() => {
    if (!supabase || !uid) {
      setJoined(new Set());
      return;
    }
    let cancelled = false;
    void Promise.resolve(supabase.from('waitlist').select('plan')).then(({ data, error }) => {
      if (!cancelled && !error && data) setJoined(new Set(data.map((r: { plan: string }) => r.plan)));
    });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const join = useCallback(
    async (plan: WaitPlan) => {
      if (!ready || !supabase) {
        toast(t('notReady'));
        return;
      }
      if (!uid) {
        toast(t('loginToNotify'));
        navigate('/login?next=/pricing');
        return;
      }
      setBusy(plan);
      const { error } = await supabase.from('waitlist').insert({ plan });
      setBusy(null);
      if (error && error.code !== '23505') {
        toast.error(t('joinFailed'));
        return;
      }
      setJoined((prev) => new Set(prev).add(plan));
      toast(t('joinedToast'));
    },
    [ready, uid, navigate, t],
  );

  return { joined, busy, join };
}

export default function PlanCards({ variant, currentPlanId }: Props) {
  const t = useT('pricing');
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const { joined, busy, join } = useWaitlist();
  const isPublic = variant === 'public';
  const pct = Math.round(YEARLY_DISCOUNT * 100);

  return (
    <>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--l-fg-mid)', margin: '0 0 12px', lineHeight: 1.7 }}>
        {t('betaNote')} {t('plannedNote')}
      </p>
      {/* Billing Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 14, flexWrap: 'wrap' }}>
        {(['monthly', 'yearly'] as BillingCycle[]).map((c) => {
          const active = cycle === c;
          return (
            <button
              key={c}
              type="button"
              aria-pressed={active}
              onClick={() => setCycle(c)}
              style={{
                fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase' as const,
                padding: '8px 14px',
                backgroundColor: active ? 'var(--l-fg)' : 'transparent',
                color: active ? 'var(--l-on-fg)' : 'var(--l-fg-mid)',
                border: '1px solid var(--l-border-mid)',
                cursor: 'pointer', transition: 'all 0.18s',
              }}
            >
              {c === 'monthly' ? t('billingMonthly') : t('billingYearly', { pct })}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1px', backgroundColor: 'var(--l-border)' }}>
        {PLANS.map((plan) => {
          const monthly = monthlyEquivalent(plan, cycle);
          const soon = !!plan.comingSoon;
          const isCurrent = currentPlanId === plan.id;
          const isJoined = soon && joined.has(plan.id);
          const isBusy = busy === plan.id;
          const isFree = plan.id === 'free';
          const ctaDisabled = isCurrent || isFree || isJoined || isBusy;
          const ctaLabel = isCurrent || isFree ? t('ctaCurrent') : isJoined ? t('ctaJoined') : isBusy ? t('ctaBusy') : t(plan.ctaKey as 'ctaNotify');

          return (
            <div
              key={plan.id}
              style={{
                padding: isPublic ? '1.5rem 1.5rem 1.25rem' : '1.75rem',
                backgroundColor: plan.highlight ? 'var(--l-panel)' : 'var(--l-bg)',
                borderTop: plan.highlight ? '2px solid var(--l-amber)' : '2px solid transparent',
                color: 'var(--l-fg)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 9, letterSpacing: '0.32em', textTransform: 'uppercase' as const, color: plan.highlight ? 'var(--l-amber)' : 'var(--l-accent)', marginBottom: 8 }}>
                {plan.name}
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: '1.8rem' }}>
                  ₩{formatNumber(monthly)}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--l-fg-mid)' }}>/{t(plan.periodKey as 'periodMonth')}</span>
                {soon && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--l-accent)', border: '1px solid var(--l-border-mid)', padding: '1px 6px', marginLeft: 6 }}>{t('planned')}</span>
                )}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: soon && cycle === 'yearly' ? 'var(--l-accent)' : 'var(--l-fg-mid)', letterSpacing: '0.05em', marginBottom: 10, minHeight: 12 }}>
                {cycle === 'yearly' && plan.price > 0
                  ? t('yearlyTotal', { amount: formatNumber(yearlyTotal(plan)), pct })
                  : soon ? t('plannedLabel') : ' '}
              </div>

              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--l-fg-mid)', lineHeight: 1.7, marginBottom: 12, minHeight: 28 }}>
                {t(plan.descKey as 'freeDesc')}
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.25rem 0', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                {plan.features.map((f) => (
                  <li key={f.key + String(f.included)} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 10, lineHeight: 1.55, color: f.included ? 'var(--l-fg)' : 'var(--l-fg-mid)', opacity: f.included ? 1 : 0.6 }}>
                    <span aria-hidden style={{ flexShrink: 0, width: 8, textAlign: 'center' as const }}>{f.included ? '✓' : '—'}</span>
                    <span>{t(f.key as 'featCoaching', f.vars)}</span>
                  </li>
                ))}
              </ul>

              {soon && (
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--l-fg-mid)', lineHeight: 1.6, margin: '0 0 8px' }}>{t('consent')}</p>
              )}
              <button
                type="button"
                onClick={() => !ctaDisabled && soon && void join(plan.id as WaitPlan)}
                disabled={ctaDisabled}
                style={{
                  width: '100%', padding: '11px', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 10, letterSpacing: soon ? '0.08em' : '0.22em', textTransform: 'uppercase' as const,
                  border: `1px ${soon && !isJoined ? 'dashed' : 'solid'} ${plan.highlight && !ctaDisabled ? 'var(--l-amber)' : 'var(--l-border-mid)'}`,
                  backgroundColor: 'transparent',
                  color: 'var(--l-fg)',
                  cursor: ctaDisabled ? 'default' : 'pointer',
                  opacity: ctaDisabled ? 0.55 : 1,
                  transition: 'all 0.18s',
                }}
                onMouseEnter={(e) => { if (!ctaDisabled) e.currentTarget.style.backgroundColor = 'var(--l-faint)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                {ctaLabel}
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
