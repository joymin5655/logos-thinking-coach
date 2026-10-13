/*
 * WeeklyRecapCard — 이번 주 vs 지난주 한 장 요약. 계산은 lib/recap.ts의 weeklyRecap()이 하고 여기서는 그리기만 한다.
 */
import { Link } from 'wouter';
import { T, body, mono, panelStyle } from '@/components/logos-ui';
import { useT } from '@/i18n';
import type { Dim, WeeklyRecap } from '@/lib/recap';
import { emphasize, mmdd, useTrackOnce } from './shared';

const DIM_KEY = { consistency: 'dimConsistency', evidence: 'dimEvidence', defense: 'dimDefense' } as const satisfies Record<Dim, string>;

const signed = (n: number | null) => (n === null ? null : `${n > 0 ? '+' : ''}${Math.round(n)}`);

export function WeeklyRecapCard({ recap, trendHref = '/dashboard/analytics' }: { recap: WeeklyRecap; trendHref?: string }) {
  const t = useT('growth');
  useTrackOnce('recap_view', { completed: recap.thisWeek.completed, empty: recap.empty });
  const { thisWeek: tw, lastWeek: lw } = recap;
  const none = t('recapNone');

  const cells: { label: string; value: string; last: string }[] = [
    {
      label: t('recapCompleted'),
      value: `${tw.completed}/${tw.started}`,
      last: t('recapLast', { v: lw.started ? `${lw.completed}/${lw.started}` : none }),
    },
    {
      label: t('recapDelta'),
      value: signed(tw.avgDelta) ?? none,
      last: t('recapLast', { v: signed(lw.avgDelta) ?? none }),
    },
    {
      label: t('recapStreak'),
      value: t('recapDays', { n: tw.streak }),
      last: t('recapBest', { n: recap.bestStreak }),
    },
  ];

  const sentence = recap.parts
    .map((p) => t(p.key, { ...p.vars, dim: p.dim ? t(DIM_KEY[p.dim]) : '' }))
    .join(' ');
  const best = recap.bestDimension ? t(DIM_KEY[recap.bestDimension.key]) : '';

  return (
    <section aria-label={t('recapAria')} style={{ ...panelStyle, borderColor: T.borderMid, padding: 18, display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', fontFamily: mono, fontSize: 11 }}>
        <span style={{ letterSpacing: '0.16em', fontWeight: 700, color: T.cream }}>{t('recapRange', { from: mmdd(recap.range.from), to: mmdd(recap.range.to) })}</span>
        <span style={{ color: T.creamDim }}>{t('recapVsLast')}</span>
      </div>

      {!recap.empty && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1, backgroundColor: T.border, border: `1px solid ${T.border}` }}>
          {cells.map((c) => (
            <div key={c.label} style={{ backgroundColor: T.black, padding: '12px 10px', display: 'grid', gap: 4, minWidth: 0 }}>
              <span style={{ fontFamily: body, fontSize: 12, color: T.creamMid }}>{c.label}</span>
              <span style={{ fontFamily: mono, fontSize: 22, fontWeight: 700, color: T.cream, fontVariantNumeric: 'tabular-nums' }}>{c.value}</span>
              <span style={{ fontFamily: body, fontSize: 12, color: T.creamDim }}>{c.last}</span>
            </div>
          ))}
        </div>
      )}

      <p style={{ margin: 0, fontFamily: body, fontSize: 15, lineHeight: 1.6, color: T.cream, overflowWrap: 'anywhere' }}>{emphasize(sentence, best)}</p>

      {!recap.empty && (
        <Link href={trendHref} className="lg-btn" style={{ alignSelf: 'start', minHeight: 44, display: 'inline-flex', alignItems: 'center', fontFamily: body, fontSize: 14, color: T.cream }}>
          {t('recapTrendLink')}
        </Link>
      )}
    </section>
  );
}
