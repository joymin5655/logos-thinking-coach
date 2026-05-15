/*
 * PlanCards.tsx — Free / Pro / Team 플랜 그리드 (공유 컴포넌트)
 *
 * 사용처:
 *   - /pricing (public, MarketingLayout) — variant="public"
 *   - /dashboard/subscription (auth, DashboardLayout) — variant="dashboard"
 *
 * 책임:
 *   - 빌링 사이클(월/연) 토글 + 연 20% 할인 가격 갱신
 *   - 모든 기능 ✓/— 일관 표시 (단일 진실 소스: shared/plans.ts)
 *   - CTA 클릭은 부모에게 위임
 */
import { useState } from 'react';
import { PLANS, YEARLY_DISCOUNT, monthlyEquivalent, yearlyTotal, type Plan, type BillingCycle } from '@shared/plans';
import { SEMANTIC, SEMANTIC_DARK } from '@/lib/colors';

const CREAM       = '#F0EBE0';
const CREAM_MID   = 'rgba(240,235,224,0.55)';
const CREAM_FAINT = 'rgba(240,235,224,0.06)';
const BLACK       = '#0A0A0A';

type Variant = 'public' | 'dashboard';

type Props = {
  variant: Variant;
  /** dashboard variant: 현재 사용자 플랜 ID (해당 카드 CTA 비활성) */
  currentPlanId?: Plan['id'];
  /** CTA 클릭 핸들러 */
  onCtaClick: (plan: Plan) => void;
};

export default function PlanCards({ variant, currentPlanId, onCtaClick }: Props) {
  const [cycle, setCycle] = useState<BillingCycle>('monthly');

  // 톤 — public은 라이트 배경(CREAM)이므로 다크 텍스트, dashboard는 다크 배경
  const isPublic = variant === 'public';
  // ACCENT는 BG 톤에 따라 light/dark variant 자동 선택
  const ACCENT   = isPublic ? SEMANTIC_DARK.draw : SEMANTIC.draw;
  const HL_GOLD  = isPublic ? SEMANTIC_DARK.insight : SEMANTIC.insight;
  const fg       = isPublic ? BLACK : CREAM;
  const fgMid    = isPublic ? 'rgba(10,10,10,0.55)' : CREAM_MID;
  const fgDim    = isPublic ? 'rgba(10,10,10,0.18)' : 'rgba(240,235,224,0.18)';
  const fgFaint  = isPublic ? 'rgba(10,10,10,0.05)' : CREAM_FAINT;
  const cardBg   = isPublic ? CREAM : '#0A0A0A';
  const sepBg    = isPublic ? 'rgba(10,10,10,0.12)' : 'rgba(240,235,224,0.18)';

  return (
    <>
      {/* Billing Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 14 }}>
        {(['monthly', 'yearly'] as BillingCycle[]).map((c) => {
          const active = cycle === c;
          return (
            <button
              key={c}
              onClick={() => setCycle(c)}
              style={{
                fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.22em', textTransform: 'uppercase' as const,
                padding: '7px 14px',
                backgroundColor: active ? fg : 'transparent',
                color: active ? cardBg : fgMid,
                border: `1px solid ${fgDim}`,
                cursor: 'pointer', transition: 'all 0.18s',
              }}
            >
              {c === 'monthly' ? '월간 결제' : `연간 결제 · ${Math.round(YEARLY_DISCOUNT * 100)}% 할인`}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', backgroundColor: sepBg }}>
        {PLANS.map((plan) => {
          const monthly = monthlyEquivalent(plan, cycle);
          const isHighlight = plan.highlight;
          const isCurrent = currentPlanId === plan.id;
          const bg = isHighlight ? BLACK : cardBg;
          const txt = isHighlight ? CREAM : fg;
          const txtMid = isHighlight ? CREAM_MID : fgMid;

          const ctaDisabled = isCurrent;
          const ctaLabel = isCurrent ? '현재 플랜' : plan.cta;
          const ctaBg = isHighlight ? 'transparent' : 'transparent';
          const ctaBorder = isHighlight ? SEMANTIC.draw : (isPublic ? 'rgba(10,10,10,0.25)' : 'rgba(240,235,224,0.25)');

          return (
            <div key={plan.id} style={{ padding: variant === 'public' ? '1.5rem 1.5rem 1.25rem' : '1.75rem', backgroundColor: bg, color: txt, display: 'flex', flexDirection: 'column' }}>
              {/* Plan name */}
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 7, letterSpacing: '0.32em', textTransform: 'uppercase' as const, color: isHighlight ? HL_GOLD : ACCENT, marginBottom: 8 }}>
                {plan.name}
              </div>

              {/* Price */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: '1.8rem', color: txt }}>
                  {monthly === 0 ? '₩0' : `₩${monthly.toLocaleString()}`}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: txtMid }}>
                  /{plan.period.split(' ')[0]}
                </span>
              </div>
              {cycle === 'yearly' && plan.price > 0 ? (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: ACCENT, letterSpacing: '0.05em', marginBottom: 10 }}>
                  연 ₩{yearlyTotal(plan).toLocaleString()} · {Math.round(YEARLY_DISCOUNT * 100)}% 절약
                </div>
              ) : (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: txtMid, opacity: 0.7, marginBottom: 10 }}>
                  {plan.period.includes('(') ? plan.period : ` `}
                </div>
              )}

              {/* Description */}
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: txtMid, lineHeight: 1.7, marginBottom: 12, minHeight: 28 }}>
                {plan.description}
              </div>

              {/* Features — 모든 항목 (included/excluded) */}
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.25rem 0', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                {plan.features.map((f) => (
                  <li key={f.text} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 9, lineHeight: 1.55, color: f.included ? txt : txtMid, opacity: f.included ? 1 : 0.55 }}>
                    <span style={{ flexShrink: 0, width: 8, textAlign: 'center' as const, color: f.included ? (isHighlight ? CREAM : (isPublic ? BLACK : CREAM)) : txtMid }}>
                      {f.included ? '✓' : '—'}
                    </span>
                    <span>{f.text}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                onClick={() => !ctaDisabled && onCtaClick(plan)}
                disabled={ctaDisabled}
                style={{
                  width: '100%', padding: '11px', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase' as const,
                  border: `1px solid ${ctaBorder}`,
                  backgroundColor: ctaBg,
                  color: isHighlight ? CREAM : txt,
                  cursor: ctaDisabled ? 'default' : 'pointer',
                  opacity: ctaDisabled ? 0.45 : 1,
                  transition: 'all 0.18s',
                }}
                onMouseEnter={(e) => {
                  if (ctaDisabled) return;
                  if (isHighlight) {
                    e.currentTarget.style.backgroundColor = CREAM;
                    e.currentTarget.style.color = BLACK;
                  } else if (isPublic) {
                    e.currentTarget.style.backgroundColor = 'rgba(10,10,10,0.06)';
                  } else {
                    e.currentTarget.style.backgroundColor = 'rgba(240,235,224,0.08)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = ctaBg;
                  e.currentTarget.style.color = isHighlight ? CREAM : txt;
                }}
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
