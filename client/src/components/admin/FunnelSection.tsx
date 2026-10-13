/*
 * FunnelSection.tsx — 방문 퍼널 6단계, 북극성(세션 완주율·정리 직접 작성), D7(기록 기반 확정), 방문 D1/D7, 비회원 진단 점수 분포.
 */
import { useState } from 'react';
import { T, mono, sans } from '@/components/logos-ui';
import { DEFAULT_PERIOD, FUNNEL_STEPS, barPercent, formatRate, scoreBuckets, stepConversions, type FunnelData, type NorthStar, type Period } from '@/lib/funnel';
import { formatNumber, useLocale, useT } from '@/i18n';
import { Async, Bar, PeriodPicker, Section, Stat, card, desc, grid, small, useAdminRpc } from './shared';

const STEP_KEY = {
  landing_view: 'step_landing_view',
  diagnostic_start: 'step_diagnostic_start',
  diagnostic_done: 'step_diagnostic_done',
  signup: 'step_signup',
  session_start: 'step_session_start',
  session_complete: 'step_session_complete',
} as const;

export default function FunnelSection() {
  const t = useT('funnel');
  const { locale } = useLocale();
  const [days, setDays] = useState<Period>(DEFAULT_PERIOD);
  const rpc = useAdminRpc<FunnelData>('admin_funnel', { p_days: days });
  const num = (n: number) => formatNumber(n, locale);

  const northStar = (label: string, n: NorthStar) => (
    <Stat label={label} value={formatRate(n.rate)} sub={t('northSub', { started: num(n.started), summarized: num(n.summarized) })} />
  );

  return (
    <>
      <PeriodPicker value={days} onChange={setDays} />
      <Async rpc={rpc}>
        {(d) => {
          const known = new Set<string>(FUNNEL_STEPS);
          const conv = stepConversions(d.steps.filter((s) => known.has(s.name)));
          const max = Math.max(0, ...conv.map((c) => c.persons));
          const buckets = scoreBuckets(d.guest_scores);
          const bucketMax = Math.max(0, ...buckets.map((b) => b.count));
          return (
            <>
              <Section title={t('secFunnel')} note={t('funnelNote')}>
                <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
                  {conv.map((c, i) => (
                    <li key={c.name} style={card}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                        <span style={{ fontFamily: sans, fontSize: 13, color: T.cream }}>{i + 1}. {t(STEP_KEY[c.name as keyof typeof STEP_KEY])}</span>
                        <span style={{ fontFamily: mono, fontSize: 13, color: T.cream, fontVariantNumeric: 'tabular-nums' }}>{t('people', { n: num(c.persons) })}</span>
                      </div>
                      <Bar width={barPercent(c.persons, max)} />
                      <div style={{ ...small, marginTop: 8, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                        {c.fromPrev != null || c.dropped != null ? (
                          <span>{t('fromPrev', { rate: formatRate(c.fromPrev) })}{c.dropped != null ? ` · ${t('dropped', { n: num(c.dropped) })}` : ''}</span>
                        ) : null}
                        {i > 0 && <span>{t('fromLanding', { rate: formatRate(c.fromLanding) })}</span>}
                      </div>
                    </li>
                  ))}
                </ol>
              </Section>

              <Section title={t('secNorthStar')} note={t('northStarNote')}>
                <div style={grid}>
                  {northStar(t('northSession'), d.north_star.session)}
                  {northStar(t('northArgue'), d.north_star.argue)}
                </div>
              </Section>

              <Section title={t('secD7')} note={t('d7Note')}>
                <div style={grid}>
                  <Stat emphasis label="D7" value={formatRate(d.d7_session.rate)} sub={t('d7Sub', { eligible: num(d.d7_session.eligible), returned: num(d.d7_session.returned) })} />
                </div>
                <p style={{ ...desc, margin: '14px 0 8px' }}>{t('secVisit')} — {t('visitNote')}</p>
                <div style={grid}>
                  <Stat label={t('visitD1')} value={formatRate(d.d1.rate)} sub={t('d7Sub', { eligible: num(d.d1.eligible), returned: num(d.d1.returned) })} />
                  <Stat label={t('visitD7')} value={formatRate(d.d7.rate)} sub={t('d7Sub', { eligible: num(d.d7.eligible), returned: num(d.d7.returned) })} />
                </div>
              </Section>

              <Section title={t('secGuest')} note={t('guestNote', { n: num(d.guest_scores.n) })}>
                <div style={{ ...card, display: 'grid', gap: 8 }}>
                  {buckets.map((b) => (
                    <div key={b.bucket} style={{ display: 'grid', gridTemplateColumns: '64px 1fr 48px', gap: 10, alignItems: 'center' }}>
                      <span style={small}>{b.bucket}</span>
                      <Bar width={barPercent(b.count, bucketMax)} />
                      <span style={{ ...small, textAlign: 'right' }}>{num(b.count)}</span>
                    </div>
                  ))}
                </div>
              </Section>
            </>
          );
        }}
      </Async>
    </>
  );
}
