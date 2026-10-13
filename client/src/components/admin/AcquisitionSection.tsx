/*
 * AcquisitionSection.tsx — 유입원별 가입·온보딩·기록 완료, 유입 도메인 상위 20.
 */
import { useState } from 'react';
import { DEFAULT_PERIOD, type AcquisitionData, type Period } from '@/lib/funnel';
import { formatNumber, useLocale, useT } from '@/i18n';
import { Async, DataTable, PeriodPicker, Section, desc, useAdminRpc } from './shared';

export default function AcquisitionSection() {
  const t = useT('funnel');
  const { locale } = useLocale();
  const [days, setDays] = useState<Period>(DEFAULT_PERIOD);
  const rpc = useAdminRpc<AcquisitionData>('admin_acquisition', { p_days: days });
  const num = (n: number) => formatNumber(n, locale);

  return (
    <Section title={t('secAcq')}>
      <PeriodPicker value={days} onChange={setDays} />
      <Async rpc={rpc}>
        {(d) => (
          <>
            <p style={{ ...desc, margin: '0 0 10px' }}>{t('acqNote', { n: num(d.signups) })}</p>
            {d.by_source.length === 0 ? (
              <p style={desc}>{t('empty')}</p>
            ) : (
              <DataTable
                head={[t('colSource'), t('colSignups'), t('colOnboarded'), t('colCompleted')]}
                rows={d.by_source.map((r) => [r.source, num(r.signups), num(r.onboarded), num(r.completed_any)])}
              />
            )}
            {d.by_ref_host.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <p style={{ ...desc, margin: '0 0 8px' }}>{t('refHosts')}</p>
                <DataTable head={[t('colRefHost'), t('colSignups')]} rows={d.by_ref_host.map((r) => [r.ref_host, num(r.signups)])} />
              </div>
            )}
          </>
        )}
      </Async>
    </Section>
  );
}
