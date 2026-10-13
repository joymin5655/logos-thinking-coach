/*
 * ArmsSection.tsx — 파일럿 A/B군 지표 표(동의한 참가자 기준)와 B군 오염 수.
 */
import { T } from '@/components/logos-ui';
import { formatRate, type ArmStats, type ArmsData } from '@/lib/funnel';
import { formatNumber, useLocale, useT } from '@/i18n';
import { Async, DataTable, Section, desc, useAdminRpc } from './shared';

export default function ArmsSection() {
  const t = useT('funnel');
  const { locale } = useLocale();
  const rpc = useAdminRpc<ArmsData>('admin_arms');
  const num = (n: number) => formatNumber(n, locale);
  const dec = (n: number | null | undefined, signed = false) =>
    n == null ? '—' : `${signed && n > 0 ? '+' : ''}${n.toLocaleString(locale === 'ko' ? 'ko-KR' : 'en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;

  const rows = (a?: ArmStats, b?: ArmStats): { label: string; cells: [string, string]; warn?: boolean }[] => {
    const both = (f: (s: ArmStats) => string): [string, string] => [a ? f(a) : '—', b ? f(b) : '—'];
    return [
      { label: t('mN'), cells: both((s) => num(s.n)) },
      { label: t('mConsented'), cells: both((s) => num(s.consented)) },
      { label: t('mStarted'), cells: both((s) => num(s.started)) },
      { label: t('mCompleted'), cells: both((s) => num(s.completed)) },
      { label: t('mCompletion'), cells: both((s) => formatRate(s.completion_rate)) },
      { label: t('mDelta'), cells: both((s) => (s.n_delta ? `${dec(s.avg_delta, true)} (n=${num(s.n_delta)})` : '—')) },
      { label: t('mSurveyDiff'), cells: both((s) => (s.n_survey ? `${dec(s.survey_diff)} (n=${num(s.n_survey)})` : '—')) },
      { label: t('mSurveySelf'), cells: both((s) => (s.n_survey ? `${dec(s.survey_self)} (n=${num(s.n_survey)})` : '—')) },
      { label: t('mRediag'), cells: both((s) => (s.rediagnostic.n ? `${dec(s.rediagnostic.avg_change, true)} (n=${num(s.rediagnostic.n)})` : '—')) },
      { label: t('mD7'), cells: both((s) => `${formatRate(s.d7.rate)} (${num(s.d7.returned)}/${num(s.d7.eligible)})`) },
      { label: t('mContaminated'), cells: ['—', b ? num(b.contaminated) : '—'], warn: (b?.contaminated ?? 0) > 0 },
    ];
  };

  return (
    <Section title={t('secArms')} note={t('armsNote')}>
      <Async rpc={rpc}>
        {(d) =>
          !d.A && !d.B ? (
            <p style={desc}>{t('armsEmpty')}</p>
          ) : (
            <>
              <DataTable
                head={[t('colMetric'), t('armA'), t('armB')]}
                rows={rows(d.A, d.B).map((r) => [
                  r.warn ? <span style={{ color: T.error }}>{r.label}</span> : r.label,
                  r.cells[0],
                  r.warn ? <span style={{ color: T.error }}>{r.cells[1]}</span> : r.cells[1],
                ])}
              />
              <p style={desc}>{t('contaminatedNote')}</p>
            </>
          )
        }
      </Async>
    </Section>
  );
}
