/*
 * AbandonSection.tsx — 이탈 지점: 미완료 기록의 단계 분포, 정리만 쓰고 미완료, 열고 첫 답변 전 이탈.
 */
import { formatRate, stageEntries, type AbandonData } from '@/lib/funnel';
import { formatNumber, useLocale, useT } from '@/i18n';
import { Async, DataTable, Section, Stat, grid, useAdminRpc } from './shared';

export default function AbandonSection() {
  const t = useT('funnel');
  const { locale } = useLocale();
  const rpc = useAdminRpc<AbandonData>('admin_abandon');
  const num = (n: number) => formatNumber(n, locale);
  const kindLabel = (k: string) => (k === 'session' ? t('kindSession') : k === 'argue' ? t('kindArgue') : k);

  return (
    <Section title={t('secAbandon')} note={t('abandonNote')}>
      <Async rpc={rpc}>
        {(d) => (
          <>
            <div style={grid}>
              <Stat label={t('incomplete')} value={num(d.incomplete)} />
              <Stat label={t('summaryNoComplete')} value={num(d.summary_no_complete)} />
              <Stat
                label={t('openNoRecord')}
                value={d.opens > 0 ? formatRate(d.open_no_record / d.opens) : '—'}
                sub={`${num(d.open_no_record)} · ${t('openNoRecordSub', { n: num(d.opens) })}`}
              />
            </div>
            <div style={{ marginTop: 14 }}>
              <DataTable
                numericFrom={2}
                head={[t('colKind'), t('colStage'), t('colCount')]}
                rows={stageEntries(d.by_stage).map((e) => [kindLabel(e.kind), e.stage || '—', num(e.count)])}
              />
            </div>
          </>
        )}
      </Async>
    </Section>
  );
}
