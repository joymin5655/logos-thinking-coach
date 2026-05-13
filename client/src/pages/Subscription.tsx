/*
 * Subscription.tsx
 * LOGOS Design: 구독 및 결제 페이지
 * - 플랜 비교
 * - 현재 구독 상태
 * - 결제 진행
 */
import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { toast } from 'sonner';

const PLANS = [
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
    current: false,
    highlight: true,
    cta: 'Pro로 업그레이드',
  },
  {
    id: 'team',
    name: 'Team',
    price: 49000,
    period: '월 (5인)',
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
    current: false,
    cta: '팀 플랜 문의',
  },
];

export default function Subscription() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const handleUpgrade = (planId: string) => {
    if (planId === 'free') return;
    if (planId === 'team') {
      toast('팀 플랜 문의는 준비 중입니다.');
      return;
    }
    toast('결제 기능은 준비 중입니다.');
  };

  return (
    <DashboardLayout title="구독" titleEn="Subscription">
      {/* Current Status */}
      <div
        className="p-6 mb-10 flex items-center justify-between border"
        style={{ borderColor: 'rgba(44,44,30,0.12)', backgroundColor: 'rgba(232,224,208,0.5)' }}
      >
        <div>
          <div
            className="text-[0.6rem] tracking-[0.3em] uppercase opacity-40 mb-1"
            style={{ fontFamily: 'Pretendard Variable, sans-serif', color: '#2C2C1E' }}
          >
            Current Plan
          </div>
          <div className="flex items-center gap-3">
            <span
              className="text-xl font-bold"
              style={{ fontFamily: "'Libre Baskerville', Georgia, serif", color: '#2C2C1E' }}
            >
              Free Plan
            </span>
            <span
              className="text-[0.6rem] tracking-[0.15em] px-2 py-1"
              style={{
                fontFamily: 'Pretendard Variable, sans-serif',
                backgroundColor: 'rgba(44,44,30,0.08)',
                color: 'rgba(44,44,30,0.6)',
              }}
            >
              활성
            </span>
          </div>
          <p
            className="text-xs opacity-50 mt-1"
            style={{ fontFamily: 'Pretendard Variable, sans-serif', color: '#2C2C1E' }}
          >
            오늘 남은 세션: 2회 / 3회
          </p>
        </div>
        <div className="text-right">
          <div
            className="text-xs opacity-40 mb-1"
            style={{ fontFamily: 'Pretendard Variable, sans-serif', color: '#2C2C1E' }}
          >
            다음 갱신일
          </div>
          <div
            className="text-sm font-semibold"
            style={{ fontFamily: 'Pretendard Variable, sans-serif', color: '#2C2C1E' }}
          >
            매일 자정 초기화
          </div>
        </div>
      </div>

      {/* Billing Toggle */}
      <div className="flex items-center gap-0 mb-8">
        {(['monthly', 'yearly'] as const).map((cycle) => (
          <button
            key={cycle}
            onClick={() => setBillingCycle(cycle)}
            className="px-5 py-2 text-xs tracking-[0.2em] uppercase transition-all duration-200"
            style={{
              fontFamily: 'Pretendard Variable, sans-serif',
              backgroundColor: billingCycle === cycle ? '#2C2C1E' : 'transparent',
              color: billingCycle === cycle ? '#E8E0D0' : 'rgba(44,44,30,0.5)',
              border: '1px solid rgba(44,44,30,0.2)',
            }}
          >
            {cycle === 'monthly' ? '월간 결제' : '연간 결제 (20% 할인)'}
          </button>
        ))}
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[rgba(44,44,30,0.1)] mb-10">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className="p-7 flex flex-col"
            style={{
              backgroundColor: plan.highlight ? '#2C2C1E' : '#EFEAD8',
              color: plan.highlight ? '#E8E0D0' : '#2C2C1E',
            }}
          >
            {/* Plan Header */}
            <div className="mb-6">
              <div
                className="text-[0.6rem] tracking-[0.3em] uppercase mb-2"
                style={{
                  fontFamily: 'Pretendard Variable, sans-serif',
                  opacity: 0.5,
                }}
              >
                {plan.name}
              </div>
              <div className="flex items-baseline gap-1 mb-2">
                <span
                  className="text-4xl font-bold"
                  style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}
                >
                  {plan.price === 0 ? '무료' : `₩${plan.price.toLocaleString()}`}
                </span>
                {plan.price > 0 && (
                  <span className="text-xs opacity-50">/{plan.period}</span>
                )}
              </div>
              {billingCycle === 'yearly' && plan.price > 0 && (
                <div
                  className="text-xs"
                  style={{ color: plan.highlight ? '#EF9F27' : '#1D9E75' }}
                >
                  연 {Math.floor(plan.price * 12 * 0.8).toLocaleString()}원 (20% 절약)
                </div>
              )}
              <p
                className="text-xs mt-2 opacity-60"
                style={{ fontFamily: 'Pretendard Variable, sans-serif' }}
              >
                {plan.description}
              </p>
            </div>

            {/* Features */}
            <ul className="space-y-3 flex-1 mb-8">
              {plan.features.map((feature) => (
                <li key={feature.text} className="flex items-center gap-2.5">
                  <span
                    style={{
                      color: feature.included
                        ? (plan.highlight ? '#EF9F27' : '#1D9E75')
                        : 'rgba(44,44,30,0.2)',
                    }}
                  >
                    {feature.included ? '✓' : '—'}
                  </span>
                  <span
                    className="text-xs"
                    style={{
                      fontFamily: 'Pretendard Variable, sans-serif',
                      opacity: feature.included ? 0.8 : 0.3,
                    }}
                  >
                    {feature.text}
                  </span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <button
              onClick={() => handleUpgrade(plan.id)}
              disabled={plan.current}
              className="w-full py-3 text-xs tracking-[0.2em] uppercase font-semibold border transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                fontFamily: 'Pretendard Variable, sans-serif',
                borderColor: plan.highlight ? '#EF9F27' : 'rgba(44,44,30,0.3)',
                backgroundColor: plan.highlight ? '#EF9F27' : 'transparent',
                color: plan.highlight ? '#2C2C1E' : (plan.highlight ? '#E8E0D0' : '#2C2C1E'),
              }}
            >
              {plan.current ? '현재 플랜' : plan.cta}
            </button>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div>
        <div
          className="text-[0.6rem] tracking-[0.3em] uppercase opacity-40 mb-6"
          style={{ fontFamily: 'Pretendard Variable, sans-serif', color: '#2C2C1E' }}
        >
          FAQ
        </div>
        <div className="space-y-0">
          {[
            {
              q: '언제든지 해지할 수 있나요?',
              a: '네, 언제든지 해지할 수 있습니다. 해지 후에도 결제 기간이 끝날 때까지 Pro 기능을 사용할 수 있습니다.',
            },
            {
              q: '무료 세션은 매일 초기화되나요?',
              a: '네, 매일 자정에 3회 무료 세션이 초기화됩니다.',
            },
            {
              q: 'Team 플랜은 몇 명까지 사용할 수 있나요?',
              a: '기본 5인 플랜이며, 추가 멤버는 1인당 월 9,000원으로 확장 가능합니다.',
            },
          ].map((item, i) => (
            <div
              key={i}
              className="py-5 border-t"
              style={{ borderColor: 'rgba(44,44,30,0.12)' }}
            >
              <div
                className="text-sm font-semibold mb-2"
                style={{ fontFamily: 'Pretendard Variable, sans-serif', color: '#2C2C1E', fontWeight: 600 }}
              >
                {item.q}
              </div>
              <p
                className="text-xs opacity-60 leading-relaxed"
                style={{ fontFamily: 'Pretendard Variable, sans-serif', color: '#2C2C1E', lineHeight: 1.75 }}
              >
                {item.a}
              </p>
            </div>
          ))}
          <div className="border-t" style={{ borderColor: 'rgba(44,44,30,0.12)' }} />
        </div>
      </div>
    </DashboardLayout>
  );
}
