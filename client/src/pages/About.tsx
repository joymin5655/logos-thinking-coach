import MarketingLayout from '@/components/MarketingLayout';
import { SEMANTIC_DARK } from '@/lib/colors';

const BLACK = '#0A0A0A';
const CREAM_BG = '#F0EBE0';

// 3 시나리오 (GRANT Q3) — 사용자가 무너지는 구체적 장면들
const SCENARIOS = [
  {
    num: '01',
    label: '방어',
    title: '아이디어를 방어해야 하는 순간',
    desc: 'AI로 기획안을 다듬고 논리를 보완했지만, 반박 질문이 들어오는 순간 말이 막힙니다. AI가 구성한 논리는 지킬 수 없습니다.',
    color: SEMANTIC_DARK.lose,
  },
  {
    num: '02',
    label: '결정',
    title: '중요한 결정 앞에 서는 순간',
    desc: 'AI에게 물어봤고 답이 나왔지만, 막상 그 이유를 설명하려 하면 말이 엉킵니다. 내 논리가 아니기 때문입니다.',
    color: SEMANTIC_DARK.info,
  },
  {
    num: '03',
    label: '계단',
    title: '집으로 돌아오는 길',
    desc: '대화가 끝나고서야 완벽한 반박이 떠오릅니다. L\'esprit de l\'escalier — 계단의 철학. 논리가 없었던 것이 아니라, 압박 속에서 꺼낼 수 없었던 것입니다.',
    color: SEMANTIC_DARK.win,
  },
];

// Roadmap 5단계 (PITCH 12)
const ROADMAP = [
  { q: '2026 Q2', phase: '기반 정비',     items: ['프롬프트 설계', 'Recovery Logic', '프로토타입'],                         color: SEMANTIC_DARK.lose },
  { q: '2026 Q3', phase: 'MVP 출시',     items: ['3개 세션 론칭', '초기 100명',     '완주율 측정'],                        color: SEMANTIC_DARK.warning },
  { q: '2026 Q4', phase: '검증',         items: ['완주율 60%+',  '리텐션 40%+',    '유료 전환 실험'],                     color: SEMANTIC_DARK.draw },
  { q: '2027 Q1', phase: '성장',         items: ['유저 1,000명', 'User vs User',   'MRR 확인'],                            color: SEMANTIC_DARK.info },
  { q: '2027 Q2+', phase: '확장',        items: ['모바일 앱',    'B2B Team',       '투자 유치 준비'],                      color: SEMANTIC_DARK.win },
];

// 검증 로드맵 — 지금 / 다음 / KPI
const VALIDATION_NOW = [
  '세션 내 Before/After: 처음 주장과 최종 정리를 같은 루브릭으로 따로 채점',
  '3분 사고력 진단과 4주 뒤 재진단',
  '세션 후 2문항 설문(일반 AI와의 차이, 스스로 낸 결론이라는 느낌)',
  '파일럿용 기록 내보내기(JSON)',
];
const VALIDATION_NEXT = [
  '파일럿 A/B: LOGOS vs 일반 챗봇',
  '참가자 40~60명, 4~8주',
  '블라인드 인간 채점으로 AI 채점을 보정',
];
const VALIDATION_KPI = [
  { label: '세션 완주율', target: '60%', note: '1차 목표' },
  { label: 'D7 재방문', target: '40%', note: '가입 7일 뒤' },
  { label: '세션 내 평균 상승', target: '+10점', note: '처음 주장 → 최종 정리' },
];

// Team 3인 (PITCH 13)
const TEAM = [
  { role: '대표 / 서비스 기획', en: 'Founder · Service Design',   focus: '에듀테크 비즈니스 설계', tag: 'Recovery Logic 설계 주도' },
  { role: '프로덕트 기획',       en: 'Product Design',              focus: 'UX 및 사용자 경험 설계', tag: '세션 플로우 구조화' },
  { role: '마케팅 기획',         en: 'Marketing / Growth',          focus: '커뮤니티 빌딩·그로스',   tag: '베타 유저 확보 전략' },
];

// Market 4 stats (PITCH 8)
const MARKET_STATS = [
  { value: '404조원',   label: '글로벌 에듀테크 시장',    sub: '2025년 규모',           color: SEMANTIC_DARK.draw },
  { value: '연 45% ↑',  label: 'AI 교육 시장 성장률',     sub: '2030년 전망',           color: SEMANTIC_DARK.warning },
  { value: '29.2조원',  label: '국내 사교육 시장',        sub: '2024년 규모',           color: SEMANTIC_DARK.info },
  { value: '#1',        label: '분석적 사고',             sub: 'WEF 핵심 역량',          color: SEMANTIC_DARK.win },
];

// Problem — 3 인용 (PITCH 3 / GRANT Q2)
const CITATIONS = [
  {
    source: 'MIT Media Lab 2025',
    headline: 'Cognitive Debt',
    body: 'LLM 반복 사용 그룹의 뇌 연결성과 언어 능력 저하가 실증됐습니다. 연구팀은 이를 "인지 부채(Cognitive Debt)"라 명명했습니다.',
    color: SEMANTIC_DARK.lose,
  },
  {
    source: 'Microsoft Research · CHI 2025',
    headline: '신뢰가 사고를 줄인다',
    body: 'AI에 대한 신뢰가 높을수록 비판적 사고 노력이 유의미하게 감소함이 관찰됐습니다. AI 의존이 사고 훈련 기회를 체계적으로 차단합니다.',
    color: SEMANTIC_DARK.info,
  },
  {
    source: '신경과학 · 편도체 하이재킹',
    headline: '의지의 문제가 아닙니다',
    body: '압박 상황에서 편도체가 전전두엽의 논리 회로를 억제합니다. 논리가 사라지는 것이 아니라 꺼지는 것입니다. AI 의존은 이 압박 역치를 더 낮춥니다.',
    color: SEMANTIC_DARK.warning,
  },
];

export default function About() {
  return (
    <MarketingLayout>
      <section style={{ backgroundColor: CREAM_BG, color: BLACK, padding: '5rem 2rem 4rem' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', width: '100%' }}>

          {/* Section number */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '2rem', opacity: 0.6 }}>
            <div style={{ width: 28, height: 1, backgroundColor: BLACK }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.25em', color: SEMANTIC_DARK.draw }}>002</span>
            <div style={{ flex: 1, height: 1, backgroundColor: BLACK, opacity: 0.2 }} />
          </div>

          {/* Hero — 한 줄 정의 (GRANT Q1, 58자) */}
          <div style={{ marginBottom: '4rem' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.42em', textTransform: 'uppercase', marginBottom: '1rem', color: SEMANTIC_DARK.draw, fontWeight: 700 }}>
              About LOGOS
            </div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 'clamp(2rem, 3.6vw, 3rem)', letterSpacing: '-0.025em', lineHeight: 1.12, marginBottom: '1.5rem', color: BLACK }}>
              소크라테스가<br />AI가 되다
            </h2>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '15px', lineHeight: 1.8, color: BLACK, opacity: 0.75, maxWidth: '720px', letterSpacing: '0.01em' }}>
              면접·발표에서 말문이 막히는 건 의지 문제가 아닙니다. LOGOS가 소크라테스 반문으로
              <strong style={{ color: SEMANTIC_DARK.draw, fontWeight: 700 }}> 압박 속에서도 꺼낼 수 있는 논리</strong>를 훈련합니다.
            </p>
          </div>

          {/* PROBLEM — 3 인용 카드 */}
          <div style={{ marginBottom: '4rem' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.4em', textTransform: 'uppercase', color: BLACK, opacity: 0.5, marginBottom: '1rem' }}>The Problem · Research</div>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 'clamp(1.4rem, 2.4vw, 1.8rem)', letterSpacing: '-0.02em', marginBottom: '2rem', color: BLACK }}>
              AI를 쓸수록 생각하는 능력이 줄어듭니다
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {CITATIONS.map((c) => (
                <div key={c.source} style={{ padding: '1.5rem 1.25rem', backgroundColor: '#ffffff80', borderTop: `2px solid ${c.color}` }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: c.color, marginBottom: '0.5rem' }}>{c.source}</div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: '17px', fontWeight: 600, color: BLACK, marginBottom: '0.5rem', letterSpacing: '-0.01em' }}>{c.headline}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', lineHeight: 1.7, color: BLACK, opacity: 0.7 }}>{c.body}</div>
                </div>
              ))}
            </div>
          </div>

          {/* SCENARIOS — 3 장면 */}
          <div style={{ marginBottom: '4rem' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.4em', textTransform: 'uppercase', color: BLACK, opacity: 0.5, marginBottom: '1rem' }}>Three Moments</div>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 'clamp(1.4rem, 2.4vw, 1.8rem)', letterSpacing: '-0.02em', marginBottom: '2rem', color: BLACK }}>
              사용자가 무너지는 세 가지 장면
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {SCENARIOS.map((s) => (
                <div key={s.num} style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', padding: '1.25rem 1.5rem', backgroundColor: '#ffffff60', borderLeft: `3px solid ${s.color}` }}>
                  <div style={{ flexShrink: 0, minWidth: '52px' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '11px', letterSpacing: '0.22em', color: s.color, marginBottom: '4px' }}>{s.num}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: s.color, opacity: 0.7 }}>{s.label}</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: '17px', letterSpacing: '-0.01em', marginBottom: '0.4rem', color: BLACK }}>{s.title}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', lineHeight: 1.75, color: BLACK, opacity: 0.7 }}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* MARKET — 4 stats (PITCH 8) */}
          <div style={{ marginBottom: '4rem' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.4em', textTransform: 'uppercase', color: BLACK, opacity: 0.5, marginBottom: '1rem' }}>Market Opportunity</div>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 'clamp(1.4rem, 2.4vw, 1.8rem)', letterSpacing: '-0.02em', marginBottom: '2rem', color: BLACK }}>
              구조적으로 커지는 수요
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1px', backgroundColor: 'rgba(10,10,10,0.15)' }}>
              {MARKET_STATS.map((m) => (
                <div key={m.label} style={{ padding: '1.5rem 1.25rem', backgroundColor: '#ffffff70' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.28em', textTransform: 'uppercase', color: BLACK, opacity: 0.5, marginBottom: '0.75rem' }}>{m.sub}</div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 'clamp(1.6rem, 2.8vw, 2.2rem)', color: m.color, letterSpacing: '-0.02em', lineHeight: 1.05, marginBottom: '0.4rem' }}>{m.value}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: BLACK, opacity: 0.7, letterSpacing: '0.02em', lineHeight: 1.4 }}>{m.label}</div>
                </div>
              ))}
            </div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', lineHeight: 1.7, color: BLACK, opacity: 0.55, marginTop: '1rem', maxWidth: '720px' }}>
              국내에 B2C 대상 소크라테스형 AI 서비스는 현재 전무합니다. LOGOS가 선점할 수 있는 완전한 공백 시장입니다.
            </p>
          </div>

          {/* 검증 로드맵 */}
          <div style={{ marginBottom: '4rem' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.4em', textTransform: 'uppercase', color: BLACK, opacity: 0.5, marginBottom: '1rem' }}>Validation Roadmap</div>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 'clamp(1.4rem, 2.4vw, 1.8rem)', letterSpacing: '-0.02em', marginBottom: '2rem', color: BLACK }}>
              검증 로드맵: 실제로 생각이 나아지는지 확인합니다
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              {[
                { tag: '지금', color: SEMANTIC_DARK.win, items: VALIDATION_NOW },
                { tag: '다음', color: SEMANTIC_DARK.info, items: VALIDATION_NEXT },
              ].map((col) => (
                <div key={col.tag} style={{ padding: '1.5rem 1.25rem', backgroundColor: '#ffffff70', borderTop: `2px solid ${col.color}` }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '10px', letterSpacing: '0.28em', color: col.color, marginBottom: '0.75rem' }}>{col.tag}</div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {col.items.map((it) => (
                      <li key={it} style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: BLACK, opacity: 0.75, lineHeight: 1.7, paddingLeft: '12px', position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 0, color: col.color }}>·</span>
                        {it}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1px', backgroundColor: 'rgba(10,10,10,0.15)' }}>
              {VALIDATION_KPI.map((k) => (
                <div key={k.label} style={{ padding: '1.25rem', backgroundColor: '#ffffff70' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.28em', textTransform: 'uppercase', color: BLACK, opacity: 0.5, marginBottom: '0.6rem' }}>KPI · {k.note}</div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 'clamp(1.6rem, 2.8vw, 2.2rem)', color: SEMANTIC_DARK.draw, letterSpacing: '-0.02em', lineHeight: 1.05, marginBottom: '0.4rem' }}>{k.target}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: BLACK, opacity: 0.7 }}>{k.label}</div>
                </div>
              ))}
            </div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', lineHeight: 1.7, color: BLACK, opacity: 0.55, marginTop: '1rem', maxWidth: '720px' }}>
              지금 보이는 점수는 AI 추정치입니다. 파일럿에서 사람 채점과 비교해 보정하기 전까지 효과의 증거로 쓰지 않습니다.
            </p>
          </div>

          {/* ROADMAP — 5 stages (PITCH 12) */}
          <div style={{ marginBottom: '4rem' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.4em', textTransform: 'uppercase', color: BLACK, opacity: 0.5, marginBottom: '1rem' }}>Roadmap</div>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 'clamp(1.4rem, 2.4vw, 1.8rem)', letterSpacing: '-0.02em', marginBottom: '2rem', color: BLACK }}>
              2026 Q2부터 단계적 검증으로 확장합니다
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1px', backgroundColor: 'rgba(10,10,10,0.15)' }}>
              {ROADMAP.map((r) => (
                <div key={r.q} style={{ padding: '1.25rem 1rem', backgroundColor: '#ffffff70', borderTop: `2px solid ${r.color}` }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '10px', letterSpacing: '0.22em', color: r.color, marginBottom: '0.4rem' }}>{r.q}</div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: '15px', color: BLACK, marginBottom: '0.75rem', letterSpacing: '-0.005em' }}>{r.phase}</div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {r.items.map((it) => (
                      <li key={it} style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: BLACK, opacity: 0.7, lineHeight: 1.55, paddingLeft: '10px', position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 0, color: r.color }}>·</span>
                        {it}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* TEAM — 3인 (PITCH 13) */}
          <div style={{ marginBottom: '4rem' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.4em', textTransform: 'uppercase', color: BLACK, opacity: 0.5, marginBottom: '1rem' }}>Team</div>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 'clamp(1.4rem, 2.4vw, 1.8rem)', letterSpacing: '-0.02em', marginBottom: '2rem', color: BLACK }}>
              왜 지금, 왜 이 팀인가
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              {TEAM.map((m, i) => (
                <div key={m.role} style={{ padding: '1.5rem 1.25rem', backgroundColor: '#ffffff70', borderLeft: `2px solid ${[SEMANTIC_DARK.draw, SEMANTIC_DARK.info, SEMANTIC_DARK.win][i]}` }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.25em', textTransform: 'uppercase', color: [SEMANTIC_DARK.draw, SEMANTIC_DARK.info, SEMANTIC_DARK.win][i], fontWeight: 700, marginBottom: '0.4rem' }}>{m.en}</div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: '15px', color: BLACK, marginBottom: '0.5rem', letterSpacing: '-0.01em' }}>{m.role}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: BLACK, opacity: 0.7, lineHeight: 1.65, marginBottom: '0.4rem' }}>{m.focus}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: BLACK, opacity: 0.5, letterSpacing: '0.02em' }}>· {m.tag}</div>
                </div>
              ))}
            </div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', lineHeight: 1.7, color: BLACK, opacity: 0.55, marginTop: '1.25rem', maxWidth: '720px' }}>
              현재 진행 중: Recovery Logic 핵심 알고리즘 설계 완료 · 소크라테스 프롬프트 프레임워크 초안 완성.
            </p>
          </div>

          {/* FOUNDER STORY */}
          <div style={{ marginBottom: '2rem', padding: '2rem 1.75rem', backgroundColor: '#ffffff70', borderTop: `2px solid ${SEMANTIC_DARK.draw}` }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '10px', letterSpacing: '0.32em', textTransform: 'uppercase', color: SEMANTIC_DARK.draw, marginBottom: '0.75rem' }}>Founder Story</div>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 'clamp(1.3rem, 2.2vw, 1.65rem)', letterSpacing: '-0.02em', marginBottom: '1rem', color: BLACK }}>
              사용하기만 해도 사고력이 성장하는 시스템
            </h3>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', lineHeight: 1.85, color: BLACK, opacity: 0.78, maxWidth: '780px' }}>
              의공학을 공부하며 배운 원칙이 있습니다. <strong style={{ color: BLACK, fontWeight: 700 }}>잘 만들어진 시스템은 사용자에게 올바른 사용법을 요구하지 않는다.</strong> 좋은 의료기기가 환자에게 원리를 이해하도록 요구하지 않는 것처럼, 사용자의 의지에 기대는 설계는 좋은 설계가 아닙니다.
              그런데 AI 서비스에는 이 원칙이 없었습니다. 사용하기만 해도 사고력이 성장하는 시스템 — 그것이 LOGOS의 출발점입니다.
            </p>
          </div>

        </div>
      </section>
    </MarketingLayout>
  );
}
