/*
 * Subscription.tsx
 * LOGOS Design: 구독 및 결제 페이지
 * - 현재 구독 상태
 * - 플랜 카드 (PlanCards 공유 컴포넌트)
 * - FAQ
 */
import DashboardLayout from '@/components/DashboardLayout';
import PlanCards from '@/components/PlanCards';
import { toast } from 'sonner';
import { BETA_NOTE, NOTIFY_TOAST, type Plan } from '@shared/plans';

const CREAM       = '#F0EBE0';
const CREAM_MID   = 'rgba(240,235,224,0.55)';
const CREAM_DIM   = 'rgba(240,235,224,0.12)';
const CREAM_FAINT = 'rgba(240,235,224,0.06)';

export default function Subscription() {
  const handleUpgrade = (plan: Plan) => {
    if (plan.comingSoon) toast(NOTIFY_TOAST);
  };

  return (
    <DashboardLayout title="구독" titleEn="Subscription">
      {/* Current Status */}
      <div className="p-6 mb-8 flex flex-wrap gap-4 items-center justify-between" style={{ border: `1px solid ${CREAM_DIM}`, backgroundColor: CREAM_FAINT }}>
        <div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: CREAM_MID, marginBottom: '6px' }}>Current Plan</div>
          <div className="flex items-center gap-3">
            <span style={{ fontFamily: "var(--font-serif)", fontSize: '26px', fontWeight: 600, color: CREAM }}>Free Plan</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: '9px', letterSpacing: '0.15em', padding: '3px 8px', backgroundColor: CREAM_FAINT, color: CREAM_MID }}>활성</span>
          </div>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: '11px', color: CREAM_MID, marginTop: '5px' }}>{BETA_NOTE}</p>
        </div>
        <div className="text-right">
          <div style={{ fontFamily: "var(--font-mono)", fontSize: '10px', color: CREAM_MID, marginBottom: '4px' }}>결제</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: '12px', fontWeight: 700, color: CREAM }}>출시 예정</div>
        </div>
      </div>

      {/* Unified Plan Cards */}
      <div className="mb-10">
        <PlanCards
          variant="dashboard"
          currentPlanId="free"
          onCtaClick={handleUpgrade}
        />
      </div>

      {/* FAQ */}
      <div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: CREAM_MID, marginBottom: '20px' }}>FAQ</div>
        <div>
          {[
            { q: '지금 결제해야 하나요?', a: '아니요. 베타 기간에는 모든 기능을 무료로 쓸 수 있고, 결제 기능은 아직 열리지 않았어요. 위 가격은 출시 시 예정 가격입니다.' },
            { q: '출시 알림은 어떻게 받나요?', a: '아직 알림 신청 기능은 열리지 않았어요. 지금은 버튼을 누르면 안내 문구만 보여 줍니다.' },
            { q: 'Team 플랜은 몇 명까지 사용할 수 있나요?', a: '기본 10인 플랜이며, 추가 멤버 확장 옵션이 제공됩니다.' },
            { q: '연간 결제 할인은 어떻게 적용되나요?', a: '연간 결제 선택 시 정가 대비 20% 할인된 가격으로 청구됩니다. 중도 해지 시 잔여 기간 환불 정책이 적용됩니다.' },
          ].map((item, i) => (
            <div key={i} className="py-5" style={{ borderTop: `1px solid ${CREAM_DIM}` }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: '13px', fontWeight: 700, color: CREAM, marginBottom: '8px' }}>{item.q}</div>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: '11px', color: CREAM_MID, lineHeight: 1.8 }}>{item.a}</p>
            </div>
          ))}
          <div style={{ borderTop: `1px solid ${CREAM_DIM}` }} />
        </div>
      </div>
    </DashboardLayout>
  );
}
