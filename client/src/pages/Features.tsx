import MarketingLayout from '@/components/MarketingLayout';
import { SEMANTIC } from '@/lib/colors';

const CREAM = '#F0EBE0';
const CREAM_DIM = 'rgba(240,235,224,0.25)';

const FEATURES = [
  { icon: '◎', title: '소크라테스 코칭',   desc: '반박 질문과 전제 도전을 통해, 당신은 자신의 논리를 스스로 단련합니다.',     color: SEMANTIC.draw },
  { icon: '◈', title: '실시간 논리 분석', desc: '대화 중 논리적 빈틈을 그 자리에서 발견하고, 스스로 메워 갑니다.',         color: SEMANTIC.info },
  { icon: '◉', title: '성장 대시보드',   desc: '논리력 스코어와 성장 그래프로 자신의 사고력 변화를 한눈에 확인합니다.', color: SEMANTIC.win  },
];

export default function Features() {
  return (
    <MarketingLayout singleViewport>
      <section
        style={{
          backgroundColor: '#0F0F0F',
          color: CREAM,
          padding: '4rem 2rem 2rem',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '2rem', opacity: 0.35 }}>
            <div style={{ width: 28, height: 1, backgroundColor: CREAM }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: '11px', letterSpacing: '0.25em', color: SEMANTIC.draw }}>003</span>
            <div style={{ flex: 1, height: 1, backgroundColor: CREAM, opacity: 0.15 }} />
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: '11px', letterSpacing: '0.42em', textTransform: 'uppercase', opacity: 0.32, marginBottom: '1rem', color: CREAM }}>Features</div>
          <h2 style={{ fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: 'clamp(1.8rem, 3.4vw, 2.8rem)', letterSpacing: '-0.02em', marginBottom: '1rem', maxWidth: '520px', color: CREAM }}>
            논리의 빈틈을<br />스스로 발견하다
          </h2>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', letterSpacing: '0.18em', textTransform: 'uppercase', color: SEMANTIC.draw, fontWeight: 700, marginBottom: '2.5rem' }}>
            · 3 sessions, one rule — AI는 질문만 합니다 ·
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', backgroundColor: CREAM_DIM }}>
            {FEATURES.map((f) => (
              <div key={f.title} style={{ padding: '2rem 1.75rem', backgroundColor: '#0F0F0F', borderTop: `2px solid ${f.color}` }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: '28px', marginBottom: '1rem', color: f.color }}>{f.icon}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: '13px', letterSpacing: '0.12em', marginBottom: '0.5rem', color: f.color, textTransform: 'uppercase' }}>{f.title}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: '13px', opacity: 0.55, lineHeight: 1.65, color: CREAM }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
