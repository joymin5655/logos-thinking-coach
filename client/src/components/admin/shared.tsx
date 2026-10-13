/*
 * shared.tsx — 관리자 KPI 섹션 공용 조각(스타일, 섹션 틀, RPC 훅, 표, 기간 선택, CSV 다운로드).
 * 스타일은 Admin.tsx와 같은 토큰을 쓴다.
 */
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ErrorLine, Label, T, btnGhost, mono, sans } from '@/components/logos-ui';
import { supabase } from '@/lib/supabase';
import { PERIODS, type Period } from '@/lib/funnel';
import { toISODate } from '@/lib/store';
import { useT } from '@/i18n';

export const card: CSSProperties = { border: `1px solid ${T.border}`, backgroundColor: T.panel, padding: '14px 16px' };
export const grid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 };
export const big: CSSProperties = { fontFamily: mono, fontSize: 24, color: T.cream, fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 };
export const desc: CSSProperties = { fontFamily: sans, fontSize: 12, color: T.creamMid, lineHeight: 1.6, margin: '6px 0 0' };
export const small: CSSProperties = { fontFamily: mono, fontSize: 11, color: T.creamMid, fontVariantNumeric: 'tabular-nums' };

// 파일명 날짜는 사용자 현지 날짜로
export const today = () => toISODate(new Date());

export function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <Label style={{ marginBottom: 6 }}>{title}</Label>
      {note && <p style={{ ...desc, margin: '0 0 10px' }}>{note}</p>}
      {children}
    </section>
  );
}

export function Stat({ label, value, sub, emphasis }: { label: string; value: string; sub?: string; emphasis?: boolean }) {
  return (
    <div style={emphasis ? { ...card, borderColor: T.amber } : card}>
      <div style={{ ...small, marginBottom: 6 }}>{label}</div>
      <div style={big}>{value}</div>
      {sub && <div style={{ ...small, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

type Rpc<D> = { data: D | null; busy: boolean; failed: boolean; reload: () => void };

/** admin_* RPC 한 건을 불러온다. 인자가 바뀌면 다시 부르고, 늦게 온 이전 응답은 버린다. */
export function useAdminRpc<D>(fn: string, args?: Record<string, unknown>): Rpc<D> {
  const [data, setData] = useState<D | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const seq = useRef(0);
  const argKey = JSON.stringify(args ?? {});

  const load = useCallback(async () => {
    const id = ++seq.current;
    if (!supabase) {
      setFailed(true);
      return;
    }
    setBusy(true);
    setFailed(false);
    try {
      const { data: d, error } = await supabase.rpc(fn, JSON.parse(argKey) as Record<string, unknown>);
      if (id !== seq.current) return;
      if (error || d == null) setFailed(true);
      else setData(d as D);
    } catch {
      if (id === seq.current) setFailed(true);
    } finally {
      if (id === seq.current) setBusy(false);
    }
  }, [fn, argKey]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, busy, failed, reload: () => void load() };
}

/** 불러오는 중·오류를 처리하고, 데이터가 있으면 children에 넘긴다. 다시 불러오는 동안은 이전 값을 흐리게 둔다. */
export function Async<D>({ rpc, children }: { rpc: Rpc<D>; children: (d: D) => ReactNode }) {
  const t = useT('funnel');
  if (rpc.failed) return <ErrorLine message={t('error')} onRetry={rpc.reload} retryLabel={t('retry')} />;
  if (!rpc.data) return <p style={desc} role="status">{t('loading')}</p>;
  return <div style={{ opacity: rpc.busy ? 0.55 : 1, transition: 'opacity 120ms' }}>{children(rpc.data)}</div>;
}

export function PeriodPicker({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const t = useT('funnel');
  return (
    <div role="group" aria-label={t('periodLabel')} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 12 }}>
      <span style={small}>{t('periodLabel')}</span>
      {PERIODS.map((p) => (
        <button
          key={p}
          type="button"
          className="lg-btn"
          aria-pressed={value === p}
          onClick={() => onChange(p)}
          style={{ ...btnGhost, padding: '6px 14px', fontSize: 10, minHeight: 44, ...(value === p ? { borderColor: T.amber, color: T.amber } : null) }}
        >
          {t('periodDays', { n: p })}
        </button>
      ))}
    </div>
  );
}

const th: CSSProperties = { ...small, textAlign: 'left', fontWeight: 400, padding: '8px 12px', borderBottom: `1px solid ${T.borderMid}`, whiteSpace: 'nowrap' };
const td: CSSProperties = { fontFamily: sans, fontSize: 13, color: T.cream, padding: '8px 12px', borderBottom: `1px solid ${T.border}`, fontVariantNumeric: 'tabular-nums' };

/** 단순 표. numericFrom번째 열부터 오른쪽 정렬. 좁은 화면에서는 가로 스크롤. */
export function DataTable({ head, rows, numericFrom = 1 }: { head: string[]; rows: ReactNode[][]; numericFrom?: number }) {
  const align = (i: number): CSSProperties => (i >= numericFrom ? { textAlign: 'right' } : {});
  return (
    <div style={{ overflowX: 'auto', border: `1px solid ${T.border}`, backgroundColor: T.panel }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>{head.map((h, i) => <th key={i} scope="col" style={{ ...th, ...align(i) }}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri}>{r.map((c, ci) => <td key={ci} style={{ ...td, ...align(ci) }}>{c}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** 가로 막대 한 줄. width는 0~100. */
export function Bar({ width }: { width: number }) {
  return (
    <div aria-hidden style={{ height: 10, backgroundColor: T.faint }}>
      <div style={{ width: `${width}%`, height: '100%', backgroundColor: T.accent }} />
    </div>
  );
}
