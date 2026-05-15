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
    description: '생각을 시작하는 첫 걸음',
    features: [
      { text: '일 3회 씽킹 세션', included: true },
      { text: '기본 논리력 스코어', included: true },
      { text: '세션 기록 7일 보관', included: true },
      { text: '무제한 세션', included: false },
      { text: '상세 논리력 분석', included: false },
      { text: '성장 추이 그래프', included: false },
      { text: '개선 피드백', included: false },
    ],
    current: true,
    cta: '현재 플랜',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 9900,
    period: '월',
    description: '깊이 있는 사고를 위한 완전한 경험',
    features: [
      { text: '무제한 씽킹 세션', included: true },
      { text: '상세 논리력 분석', included: true },
      { text: '무제한 세션 기록', included: true },
      { text: '성장 추이 그래프', included: true },
      { text: 'AI 개선 피드백', included: true },
      { text: '4가지 AI 페르소나', included: true },
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
    description: '조직의 집단 사고력을 높이세요',
    features: [
      { text: 'Pro 기능 전체 포함', included: true },
      { text: '팀 논리력 비교', included: true },
      { text: '관리자 대시보드', included: true },
      { text: '맞춤 세션 설계', included: true },
      { text: '전담 지원', included: true },
      { text: '사용량 리포트', included: true },
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
