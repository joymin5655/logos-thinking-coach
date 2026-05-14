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

const CREAM       = '#F0EBE0';
const CREAM_MID   = 'rgba(240,235,224,0.55)';
const CREAM_DIM   = 'rgba(240,235,224,0.12)';
const CREAM_FAINT = 'rgba(240,235,224,0.06)';
const BLACK       = '#0A0A0A';

export default function Subscription() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const handleUpgrade = (planId: string) => {
    if (planId === 'free') return;
    if (planId === 'team') { toast('팀 플랜 문의는 준비 중입니다.'); return; }
    toast('결제 기능은 준비 중입니다.');
  };

  return (
    <DashboardLayout title="구독" titleEn="Subscription">
      {/* Current Status */}
      <div className="p-6 mb-10 flex items-center justify-between" style={{ border: `1px solid ${CREAM_DIM}`, backgroundColor: CREAM_FAINT }}>
        <div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '6px', letterSpacing: '0.3em', textTransform: 'uppercase', color: CREAM_MID, marginBottom: '6px' }}>Current Plan</div>
          <div className="flex items-center gap-3">
            <span style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '20px', fontWeight: 600, color: CREAM }}>Free Plan</span>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '6px', letterSpacing: '0.15em', padding: '3px 8px', backgroundColor: CREAM_FAINT, color: CREAM_MID }}>활성</span>
          </div>
          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', color: CREAM_MID, marginTop: '5px' }}>오늘 남은 세션: 2회 / 3회</p>
        </div>
        <div className="text-right">
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '7px', color: CREAM_MID, marginBottom: '4px' }}>다음 갱신일</div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '9px', fontWeight: 700, color: CREAM }}>매일 자정 초기화</div>
        </div>
      </div>

      {/* Billing Toggle */}
      <div className="flex items-center gap-0 mb-8">
        {(['monthly', 'yearly'] as const).map((cycle) => (
          <button key={cycle} onClick={() => setBillingCycle(cycle)}
            style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '7px 18px', backgroundColor: billingCycle === cycle ? CREAM : 'transparent', color: billingCycle === cycle ? BLACK : CREAM_MID, border: `1px solid ${CREAM_DIM}`, cursor: 'pointer', transition: 'all 0.18s' }}
          >
            {cycle === 'monthly' ? '월간 결제' : '연간 결제 (20% 할인)'}
          </button>
        ))}
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-px mb-10" style={{ backgroundColor: CREAM_DIM }}>
        {PLANS.map((plan) => (
          <div key={plan.id} className="p-7 flex flex-col"
            style={{ backgroundColor: plan.highlight ? 'rgba(240,235,224,0.1)' : '#0A0A0A', color: CREAM }}
          >
            <div className="mb-6">
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '6px', letterSpacing: '0.3em', textTransform: 'uppercase', color: CREAM_MID, marginBottom: '8px' }}>{plan.name}</div>
              <div className="flex items-baseline gap-1 mb-2">
                <span style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: '34px', fontWeight: 600, color: CREAM }}>
                  {plan.price === 0 ? '무료' : `₩${plan.price.toLocaleString()}`}
                </span>
                {plan.price > 0 && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', color: CREAM_MID }}>/{plan.period}</span>}
              </div>
              {billingCycle === 'yearly' && plan.price > 0 && (
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', color: CREAM_MID }}>연 {Math.floor(plan.price * 12 * 0.8).toLocaleString()}월 (20% 절약)</div>
              )}
              <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', color: CREAM_MID, marginTop: '8px', lineHeight: 1.7 }}>{plan.description}</p>
            </div>
            <ul className="space-y-3 flex-1 mb-8">
              {plan.features.map((feature) => (
                <li key={feature.text} className="flex items-center gap-2.5">
                  <span style={{ color: feature.included ? CREAM : CREAM_DIM, flexShrink: 0 }}>{feature.included ? '✓' : '—'}</span>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', color: feature.included ? CREAM_MID : 'rgba(240,235,224,0.2)' }}>{feature.text}</span>
                </li>
              ))}
            </ul>
            <button onClick={() => handleUpgrade(plan.id)} disabled={plan.current}
              className="w-full py-3 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, border: `1px solid ${plan.highlight ? CREAM : CREAM_DIM}`, backgroundColor: plan.highlight ? CREAM : 'transparent', color: plan.highlight ? BLACK : CREAM_MID, cursor: plan.current ? 'default' : 'pointer' }}
            >
              {plan.current ? '현재 플랜' : plan.cta}
            </button>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '6px', letterSpacing: '0.3em', textTransform: 'uppercase', color: CREAM_MID, marginBottom: '20px' }}>FAQ</div>
        <div>
          {[
            { q: '언제든지 해지할 수 있나요?', a: '네, 언제든지 해지할 수 있습니다. 해지 후에도 결제 기간이 끝날 때까지 Pro 기능을 사용할 수 있습니다.' },
            { q: '무료 세션은 매일 초기화되나요?', a: '네, 매일 자정에 3회 무료 세션이 초기화됩니다.' },
            { q: 'Team 플랜은 몇 명까지 사용할 수 있나요?', a: '기본 5인 플랜이며, 추가 멤버는 1인당 월 9,000원으로 확장 가능합니다.' },
          ].map((item, i) => (
            <div key={i} className="py-5" style={{ borderTop: `1px solid ${CREAM_DIM}` }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '10px', fontWeight: 700, color: CREAM, marginBottom: '8px' }}>{item.q}</div>
              <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '8px', color: CREAM_MID, lineHeight: 1.8 }}>{item.a}</p>
            </div>
          ))}
          <div style={{ borderTop: `1px solid ${CREAM_DIM}` }} />
        </div>
      </div>
    </DashboardLayout>
  );
}
