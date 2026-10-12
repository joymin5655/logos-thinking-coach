import { toast } from 'sonner';
import { NOTIFY_TOAST } from '@shared/plans';
import MarketingLayout from '@/components/MarketingLayout';
import PlanCards from '@/components/PlanCards';
import { SEMANTIC_DARK } from '@/lib/colors';

const BLACK = '#0A0A0A';
const CREAM = '#F0EBE0';

export default function Pricing() {
  return (
    <MarketingLayout singleViewport>
      <section
        style={{
          backgroundColor: CREAM,
          color: BLACK,
          padding: '3.5rem 2rem 2rem',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          boxSizing: 'border-box',
          overflowY: 'auto',
        }}
      >
        <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.5rem', opacity: 0.35 }}>
            <div style={{ width: 28, height: 1, backgroundColor: BLACK }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: '11px', letterSpacing: '0.25em', color: SEMANTIC_DARK.draw }}>004</span>
            <div style={{ flex: 1, height: 1, backgroundColor: BLACK, opacity: 0.15 }} />
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: '11px', letterSpacing: '0.42em', textTransform: 'uppercase', marginBottom: '0.5rem', color: SEMANTIC_DARK.draw }}>Subscription</div>
          <h2 style={{ fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: 'clamp(1.5rem, 2.8vw, 2.2rem)', letterSpacing: '-0.02em', marginBottom: '1.5rem', color: BLACK }}>
            생각의 깊이에 투자하세요
          </h2>

          <PlanCards
            variant="public"
            onCtaClick={(plan) => { if (plan.comingSoon) toast(NOTIFY_TOAST); }}
          />
        </div>
      </section>
    </MarketingLayout>
  );
}
