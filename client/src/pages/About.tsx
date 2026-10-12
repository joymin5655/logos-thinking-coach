import MarketingLayout from '@/components/MarketingLayout';
import { SEMANTIC, SEMANTIC_DARK } from '@/lib/colors';
import { useTheme } from '@/contexts/ThemeContext';
import { useT } from '@/i18n';

// 테마 토큰(--l-*) — 페이지가 라이트/다크를 그대로 따른다.
const FG = 'var(--l-fg)';
const CARD = 'var(--l-panel)';
const LINE = 'var(--l-border)';

export default function About() {
  const t = useT('about');
  // 카드 배경이 테마를 따르므로 강조색도 테마별 팔레트(다크=밝은 톤, 라이트=깊은 톤)
  const sem = useTheme().theme === 'dark' ? SEMANTIC : SEMANTIC_DARK;
  const SCENARIOS = [
    { num: '01', label: t('sc1Label'), title: t('sc1Title'), desc: t('sc1Desc'), color: sem.lose },
    { num: '02', label: t('sc2Label'), title: t('sc2Title'), desc: t('sc2Desc'), color: sem.info },
    { num: '03', label: t('sc3Label'), title: t('sc3Title'), desc: t('sc3Desc'), color: sem.win },
  ];
  const ROADMAP = [
    { q: '2026 Q2', phase: t('rm1Phase'), items: [t('rm1a'), t('rm1b'), t('rm1c')], color: sem.lose },
    { q: '2026 Q3', phase: t('rm2Phase'), items: [t('rm2a'), t('rm2b'), t('rm2c')], color: sem.warning },
    { q: '2026 Q4', phase: t('rm3Phase'), items: [t('rm3a'), t('rm3b'), t('rm3c')], color: sem.draw },
    { q: '2027 Q1', phase: t('rm4Phase'), items: [t('rm4a'), t('rm4b'), t('rm4c')], color: sem.info },
    { q: '2027 Q2+', phase: t('rm5Phase'), items: [t('rm5a'), t('rm5b'), t('rm5c')], color: sem.win },
  ];
  const VALIDATION_NOW = [t('now1'), t('now2'), t('now3'), t('now4')];
  const VALIDATION_NEXT = [t('next1'), t('next2'), t('next3')];
  const VALIDATION_KPI = [
    { label: t('kpi1Label'), target: '60%', note: t('kpi1Note') },
    { label: t('kpi2Label'), target: '40%', note: t('kpi2Note') },
    { label: t('kpi3Label'), target: t('kpi3Target'), note: t('kpi3Note') },
  ];
  const TEAM = [
    { role: t('team1Role'), en: 'Founder · Service Design', focus: t('team1Focus'), tag: t('team1Tag') },
    { role: t('team2Role'), en: 'Product Design', focus: t('team2Focus'), tag: t('team2Tag') },
    { role: t('team3Role'), en: 'Marketing / Growth', focus: t('team3Focus'), tag: t('team3Tag') },
  ];
  const MARKET_STATS = [
    { value: t('m1Value'), label: t('m1Label'), sub: t('m1Sub'), color: sem.draw },
    { value: t('m2Value'), label: t('m2Label'), sub: t('m2Sub'), color: sem.warning },
    { value: t('m3Value'), label: t('m3Label'), sub: t('m3Sub'), color: sem.info },
    { value: t('m4Value'), label: t('m4Label'), sub: t('m4Sub'), color: sem.win },
  ];
  const CITATIONS = [
    { source: t('cite1Source'), headline: t('cite1Headline'), body: t('cite1Body'), color: sem.lose },
    { source: t('cite2Source'), headline: t('cite2Headline'), body: t('cite2Body'), color: sem.info },
    { source: t('cite3Source'), headline: t('cite3Headline'), body: t('cite3Body'), color: sem.warning },
  ];
  return (
    <MarketingLayout>
      <section style={{ backgroundColor: 'var(--l-bg)', color: FG, padding: '5rem 2rem 4rem' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', width: '100%' }}>

          {/* Section number */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '2rem', opacity: 0.6 }}>
            <div style={{ width: 28, height: 1, backgroundColor: FG }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.25em', color: sem.draw }}>002</span>
            <div style={{ flex: 1, height: 1, backgroundColor: FG, opacity: 0.2 }} />
          </div>

          {/* Hero — 한 줄 정의 (GRANT Q1, 58자) */}
          <div style={{ marginBottom: '4rem' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.42em', textTransform: 'uppercase', marginBottom: '1rem', color: sem.draw, fontWeight: 700 }}>
              About LOGOS
            </div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 'clamp(2rem, 3.6vw, 3rem)', letterSpacing: '-0.025em', lineHeight: 1.12, marginBottom: '1.5rem', color: FG }}>
              {t('heroTitle1')}<br />{t('heroTitle2')}
            </h2>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '15px', lineHeight: 1.8, color: FG, opacity: 0.75, maxWidth: '720px', letterSpacing: '0.01em' }}>
              {t('heroBody1')}{' '}
              <strong style={{ color: sem.draw, fontWeight: 700 }}>{t('heroBodyEm')}</strong>{t('heroBody2')}
            </p>
          </div>

          {/* PROBLEM — 3 인용 카드 */}
          <div style={{ marginBottom: '4rem' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.4em', textTransform: 'uppercase', color: FG, opacity: 0.5, marginBottom: '1rem' }}>The Problem · Research</div>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 'clamp(1.4rem, 2.4vw, 1.8rem)', letterSpacing: '-0.02em', marginBottom: '2rem', color: FG }}>
              {t('problemTitle')}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {CITATIONS.map((c) => (
                <div key={c.source} style={{ padding: '1.5rem 1.25rem', backgroundColor: CARD, borderTop: `2px solid ${c.color}` }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: c.color, marginBottom: '0.5rem' }}>{c.source}</div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: '17px', fontWeight: 600, color: FG, marginBottom: '0.5rem', letterSpacing: '-0.01em' }}>{c.headline}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', lineHeight: 1.7, color: FG, opacity: 0.7 }}>{c.body}</div>
                </div>
              ))}
            </div>
          </div>

          {/* SCENARIOS — 3 장면 */}
          <div style={{ marginBottom: '4rem' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.4em', textTransform: 'uppercase', color: FG, opacity: 0.5, marginBottom: '1rem' }}>Three Moments</div>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 'clamp(1.4rem, 2.4vw, 1.8rem)', letterSpacing: '-0.02em', marginBottom: '2rem', color: FG }}>
              {t('scenariosTitle')}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {SCENARIOS.map((s) => (
                <div key={s.num} style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', padding: '1.25rem 1.5rem', backgroundColor: CARD, borderLeft: `3px solid ${s.color}` }}>
                  <div style={{ flexShrink: 0, minWidth: '52px' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '11px', letterSpacing: '0.22em', color: s.color, marginBottom: '4px' }}>{s.num}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: s.color, opacity: 0.7 }}>{s.label}</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: '17px', letterSpacing: '-0.01em', marginBottom: '0.4rem', color: FG }}>{s.title}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', lineHeight: 1.75, color: FG, opacity: 0.7 }}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* MARKET — 4 stats (PITCH 8) */}
          <div style={{ marginBottom: '4rem' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.4em', textTransform: 'uppercase', color: FG, opacity: 0.5, marginBottom: '1rem' }}>Market Opportunity</div>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 'clamp(1.4rem, 2.4vw, 1.8rem)', letterSpacing: '-0.02em', marginBottom: '2rem', color: FG }}>
              {t('marketTitle')}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1px', backgroundColor: LINE }}>
              {MARKET_STATS.map((m) => (
                <div key={m.label} style={{ padding: '1.5rem 1.25rem', backgroundColor: CARD }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.28em', textTransform: 'uppercase', color: FG, opacity: 0.5, marginBottom: '0.75rem' }}>{m.sub}</div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 'clamp(1.6rem, 2.8vw, 2.2rem)', color: m.color, letterSpacing: '-0.02em', lineHeight: 1.05, marginBottom: '0.4rem' }}>{m.value}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: FG, opacity: 0.7, letterSpacing: '0.02em', lineHeight: 1.4 }}>{m.label}</div>
                </div>
              ))}
            </div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', lineHeight: 1.7, color: FG, opacity: 0.55, marginTop: '1rem', maxWidth: '720px' }}>
              {t('marketNote')}
            </p>
          </div>

          {/* 검증 로드맵 */}
          <div style={{ marginBottom: '4rem' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.4em', textTransform: 'uppercase', color: FG, opacity: 0.5, marginBottom: '1rem' }}>Validation Roadmap</div>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 'clamp(1.4rem, 2.4vw, 1.8rem)', letterSpacing: '-0.02em', marginBottom: '2rem', color: FG }}>
              {t('validationTitle')}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              {[
                { tag: t('validationNowTag'), color: sem.win, items: VALIDATION_NOW },
                { tag: t('validationNextTag'), color: sem.info, items: VALIDATION_NEXT },
              ].map((col) => (
                <div key={col.tag} style={{ padding: '1.5rem 1.25rem', backgroundColor: CARD, borderTop: `2px solid ${col.color}` }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '10px', letterSpacing: '0.28em', color: col.color, marginBottom: '0.75rem' }}>{col.tag}</div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {col.items.map((it) => (
                      <li key={it} style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: FG, opacity: 0.75, lineHeight: 1.7, paddingLeft: '12px', position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 0, color: col.color }}>·</span>
                        {it}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1px', backgroundColor: LINE }}>
              {VALIDATION_KPI.map((k) => (
                <div key={k.label} style={{ padding: '1.25rem', backgroundColor: CARD }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.28em', textTransform: 'uppercase', color: FG, opacity: 0.5, marginBottom: '0.6rem' }}>KPI · {k.note}</div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 'clamp(1.6rem, 2.8vw, 2.2rem)', color: sem.draw, letterSpacing: '-0.02em', lineHeight: 1.05, marginBottom: '0.4rem' }}>{k.target}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: FG, opacity: 0.7 }}>{k.label}</div>
                </div>
              ))}
            </div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', lineHeight: 1.7, color: FG, opacity: 0.55, marginTop: '1rem', maxWidth: '720px' }}>
              {t('validationFoot')}
            </p>
          </div>

          {/* ROADMAP — 5 stages (PITCH 12) */}
          <div style={{ marginBottom: '4rem' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.4em', textTransform: 'uppercase', color: FG, opacity: 0.5, marginBottom: '1rem' }}>Roadmap</div>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 'clamp(1.4rem, 2.4vw, 1.8rem)', letterSpacing: '-0.02em', marginBottom: '2rem', color: FG }}>
              {t('roadmapTitle')}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1px', backgroundColor: LINE }}>
              {ROADMAP.map((r) => (
                <div key={r.q} style={{ padding: '1.25rem 1rem', backgroundColor: CARD, borderTop: `2px solid ${r.color}` }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '10px', letterSpacing: '0.22em', color: r.color, marginBottom: '0.4rem' }}>{r.q}</div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: '15px', color: FG, marginBottom: '0.75rem', letterSpacing: '-0.005em' }}>{r.phase}</div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {r.items.map((it) => (
                      <li key={it} style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: FG, opacity: 0.7, lineHeight: 1.55, paddingLeft: '10px', position: 'relative' }}>
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
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.4em', textTransform: 'uppercase', color: FG, opacity: 0.5, marginBottom: '1rem' }}>Team</div>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 'clamp(1.4rem, 2.4vw, 1.8rem)', letterSpacing: '-0.02em', marginBottom: '2rem', color: FG }}>
              {t('teamTitle')}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              {TEAM.map((m, i) => (
                <div key={m.role} style={{ padding: '1.5rem 1.25rem', backgroundColor: CARD, borderLeft: `2px solid ${[sem.draw, sem.info, sem.win][i]}` }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.25em', textTransform: 'uppercase', color: [sem.draw, sem.info, sem.win][i], fontWeight: 700, marginBottom: '0.4rem' }}>{m.en}</div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: '15px', color: FG, marginBottom: '0.5rem', letterSpacing: '-0.01em' }}>{m.role}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: FG, opacity: 0.7, lineHeight: 1.65, marginBottom: '0.4rem' }}>{m.focus}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: FG, opacity: 0.5, letterSpacing: '0.02em' }}>· {m.tag}</div>
                </div>
              ))}
            </div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', lineHeight: 1.7, color: FG, opacity: 0.55, marginTop: '1.25rem', maxWidth: '720px' }}>
              {t('teamNote')}
            </p>
          </div>

          {/* FOUNDER STORY */}
          <div style={{ marginBottom: '2rem', padding: '2rem 1.75rem', backgroundColor: CARD, borderTop: `2px solid ${sem.draw}` }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '10px', letterSpacing: '0.32em', textTransform: 'uppercase', color: sem.draw, marginBottom: '0.75rem' }}>Founder Story</div>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 'clamp(1.3rem, 2.2vw, 1.65rem)', letterSpacing: '-0.02em', marginBottom: '1rem', color: FG }}>
              {t('founderTitle')}
            </h3>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', lineHeight: 1.85, color: FG, opacity: 0.78, maxWidth: '780px' }}>
              {t('founderBody1')} <strong style={{ color: FG, fontWeight: 700 }}>{t('founderEm')}</strong> {t('founderBody2')}
            </p>
          </div>

        </div>
      </section>
    </MarketingLayout>
  );
}
