import MarketingLayout from '@/components/MarketingLayout';
import { SEMANTIC_DARK } from '@/lib/colors';

const BLACK = '#0A0A0A';

const STEPS = [
  { num: '01', title: '소크라테스 문답', desc: '질문을 통해 당신은 논리의 빈틈을 스스로 발견합니다.',         color: SEMANTIC_DARK.lose },
  { num: '02', title: '논리력 스코어링', desc: '세션 후 자신의 논리적 일관성과 근거를 수치로 확인합니다.', color: SEMANTIC_DARK.info },
  { num: '03', title: '성장 추적',     desc: '매 세션의 변화를 통해 사고력의 성장을 스스로 확인합니다.', color: SEMANTIC_DARK.win  },
];

export default function About() {
  return (
    <MarketingLayout singleViewport>
      <section
        style={{
          backgroundColor: '#F0EBE0',
          color: BLACK,
          padding: '4rem 2rem 2rem',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '2rem', opacity: 0.4 }}>
            <div style={{ width: 28, height: 1, backgroundColor: BLACK }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: '11px', letterSpacing: '0.25em', color: SEMANTIC_DARK.draw }}>002</span>
            <div style={{ flex: 1, height: 1, backgroundColor: BLACK, opacity: 0.2 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: '11px', letterSpacing: '0.42em', textTransform: 'uppercase', marginBottom: '1rem', color: SEMANTIC_DARK.draw }}>About LOGOS</div>
              <h2 style={{ fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: 'clamp(1.8rem, 3.4vw, 2.8rem)', letterSpacing: '-0.025em', lineHeight: 1.12, marginBottom: '1.5rem', color: BLACK }}>
                소크라테스가<br />AI가 되다
              </h2>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: '14px', lineHeight: 1.85, opacity: 0.65, maxWidth: '420px', color: BLACK, letterSpacing: '0.02em' }}>
                2,400년 전 아테네의 소크라테스 문답법을 현대 AI로 다시 만났습니다.
                질문을 따라가다 보면, 당신은 자신의 논리에서 빈틈을 발견하고 스스로 더 깊이 사고합니다.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {STEPS.map((item) => (
                <div key={item.num} style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', paddingBottom: '1rem', borderBottom: `2px solid ${item.color}33` }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: '11px', letterSpacing: '0.22em', paddingTop: '4px', minWidth: '24px', color: item.color }}>{item.num}</span>
                  <div>
                    <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: '14px', letterSpacing: '0.08em', marginBottom: '0.35rem', color: item.color, textTransform: 'uppercase' }}>{item.title}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: '13px', opacity: 0.7, lineHeight: 1.6, color: BLACK }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
