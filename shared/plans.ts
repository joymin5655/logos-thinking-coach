export type PlanFeature = { text: string; included: boolean };

export type Plan = {
  id: 'free' | 'pro' | 'team';
  name: string;
  price: number;
  period: string;
  description: string;
  features: PlanFeature[];
  current?: boolean;
  highlight?: boolean;
  cta: string;
};

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: '월',
    description: '진입 장벽 없이 시작하세요',
    features: [
      { text: 'Session 1 (논증) — 일 3회', included: true },
      { text: 'Session 2 (코칭) — 일 1회', included: true },
      { text: 'Session 3 (AI 아레나) — 무제한', included: true },
      { text: '기본 논리력 스코어', included: true },
      { text: '분야별 기본 랭킹', included: true },
      { text: '상세 세션 리포트', included: false },
      { text: 'User vs User 아레나', included: false },
    ],
    current: true,
    cta: '현재 플랜',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 9900,
    period: '월',
    description: '핵심 수익원 · 깊이 있는 사고 경험',
    features: [
      { text: '전 세션 무제한', included: true },
      { text: '상세 세션 리포트', included: true },
      { text: '성장 히스토리 분석', included: true },
      { text: 'User vs User 아레나', included: true },
      { text: '고급 랭킹 통계', included: true },
      { text: 'AI 개선 피드백', included: true },
      { text: '팀 기능', included: false },
    ],
    highlight: true,
    cta: 'Pro로 업그레이드',
  },
  {
    id: 'team',
    name: 'Team',
    price: 99000,
    period: '월 (10인)',
    description: '학원·기업·교육기관을 위한 B2B 확장',
    features: [
      { text: 'Pro 기능 전체 포함', included: true },
      { text: '학원·기업 맞춤형 운영', included: true },
      { text: '그룹 세션 관리', included: true },
      { text: '관리자 대시보드', included: true },
      { text: '진도·리포트 일괄 관리', included: true },
      { text: '교육기관 파트너십', included: true },
      { text: '추가 멤버 확장', included: true },
    ],
    cta: '팀 플랜 문의',
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
