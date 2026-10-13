/*
 * RaterExportSection.tsx — 채점자용 블라인드 export CSV와 해제 키 CSV를 따로 내려받는다.
 * 채점자에게는 export만 보낸다. 해제 키는 보내지 않는다.
 */
import { useState } from 'react';
import { ErrorLine, T, btnGhost } from '@/components/logos-ui';
import { supabase } from '@/lib/supabase';
import { toCSV } from '@/lib/csv';
import { useT } from '@/i18n';
import { Section, desc, download, today } from './shared';

type Row = Record<string, unknown>;
type Which = 'export' | 'key';

// RPC 반환 컬럼 순서와 맞춘다(admin_rater_export, admin_rater_key).
const SPEC = {
  export: { rpc: 'admin_rater_export', cols: ['blind_id', 'form', 'text'], file: 'rater-export' },
  key: { rpc: 'admin_rater_key', cols: ['blind_id', 'user_ref', 'arm', 'phase', 'form', 'score'], file: 'rater-key' },
} as const;

export default function RaterExportSection() {
  const t = useT('funnel');
  const [busy, setBusy] = useState<Which | null>(null);
  const [failed, setFailed] = useState(false);

  const run = async (which: Which) => {
    if (!supabase || busy) return;
    setBusy(which);
    setFailed(false);
    try {
      const spec = SPEC[which];
      const { data, error } = await supabase.rpc(spec.rpc);
      if (error || !Array.isArray(data)) setFailed(true);
      else download(`logos-${spec.file}-${today()}.csv`, toCSV(data as Row[], spec.cols as unknown as string[]));
    } catch {
      setFailed(true);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Section title={t('secRater')} note={t('raterNote')}>
      <p style={{ ...desc, margin: '0 0 12px', color: T.cream }}>{t('raterNotice')}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <button type="button" className="lg-btn" onClick={() => void run('export')} disabled={busy !== null} style={{ ...btnGhost, minHeight: 44, opacity: busy ? 0.5 : 1 }}>
          {busy === 'export' ? t('exporting') : t('raterExport')}
        </button>
        <button type="button" className="lg-btn" onClick={() => void run('key')} disabled={busy !== null} style={{ ...btnGhost, minHeight: 44, opacity: busy ? 0.5 : 1 }}>
          {busy === 'key' ? t('exporting') : t('raterKey')}
        </button>
      </div>
      <p style={desc}>{t('raterKeyWarn')}</p>
      {failed && <div style={{ marginTop: 10 }}><ErrorLine message={t('exportFailed')} /></div>}
    </Section>
  );
}
