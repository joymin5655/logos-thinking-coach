// 요금제 정의. 문구는 i18n(pricing 네임스페이스)의 키로만 갖고, 화면이 useT('pricing')으로 풀어 쓴다.
// Free의 이용 한도는 shared/quotas.ts에서 가져와 서버 한도와 항상 같다.
import { QUOTAS } from './quotas';

export type PlanFeature = {
  /** pricing 사전의 키 */
  key: string;
  vars?: Record<string, string | number>;
  included: boolean;
};

export type Plan = {
  id: 'free' | 'pro' | 'team';
  name: string;
  price: number;
  /** pricing 사전의 키 (월 · 월 10인) */
  periodKey: string;
  descKey: string;
  features: PlanFeature[];
  highlight?: boolean;
  /** 결제 미지원(Hobby 플랜) — 가격은 예정가이고 CTA는 사전 알림 */
  comingSoon?: boolean;
  ctaKey: string;
};

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    periodKey: 'periodMonth',
    descKey: 'freeDesc',
    features: [
      { key: 'featCoaching', vars: { n: QUOTAS.session.perDay }, included: true },
      { key: 'featArgue', vars: { n: QUOTAS.argue.perDay }, included: true },
      { key: 'featArena', vars: { n: QUOTAS.arena.perDay }, included: true },
      { key: 'featDiagnostic', included: true },
      { key: 'featReport', included: true },
      { key: 'featSync', included: true },
      { key: 'featPvp', included: false },
    ],
    ctaKey: 'ctaCurrent',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 9900,
    periodKey: 'periodMonth',
    descKey: 'proDesc',
    features: [
      { key: 'featMoreQuota', included: true },
      { key: 'featPvp', included: true },
      { key: 'featGrowth', included: true },
      { key: 'featFeedback', included: true },
      { key: 'featTeam', included: false },
    ],
    highlight: true,
    comingSoon: true,
    ctaKey: 'ctaNotify',
  },
  {
    id: 'team',
    name: 'Team',
    price: 99000,
    periodKey: 'periodMonthTeam',
    descKey: 'teamDesc',
    features: [
      { key: 'featProAll', included: true },
      { key: 'featGroup', included: true },
      { key: 'featAdmin', included: true },
      { key: 'featProgress', included: true },
    ],
    comingSoon: true,
    ctaKey: 'ctaNotify',
  },
];

export const YEARLY_DISCOUNT = 0.2; // 20% off when paying annually

export type BillingCycle = 'monthly' | 'yearly';

export function formatPrice(plan: Plan): string {
  return plan.price === 0 ? '₩0' : `₩${plan.price.toLocaleString()}`;
}

/** 빌링 사이클 적용 가격 — yearly는 월 단가 (20% 할인 후) */
export function monthlyEquivalent(plan: Plan, cycle: BillingCycle): number {
  if (plan.price === 0) return 0;
  return cycle === 'yearly' ? Math.floor(plan.price * (1 - YEARLY_DISCOUNT)) : plan.price;
}

/** 연간 총액 (yearly cycle 기준) */
export function yearlyTotal(plan: Plan): number {
  if (plan.price === 0) return 0;
  return Math.floor(plan.price * 12 * (1 - YEARLY_DISCOUNT));
}
