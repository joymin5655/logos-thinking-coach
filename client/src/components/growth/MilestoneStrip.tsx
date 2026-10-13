/*
 * MilestoneStrip — 루브릭 항목별로 처음 닿은 단계들 + 다음 목표 한 줄.
 * isNew인 것은 NEW 표시와 함께 노출 이벤트를 보내고, 보였다고 localStorage에 적는다(화면의 NEW는 이번 방문 동안 유지).
 */
import { useEffect, useRef } from 'react';
import { T, body, mono } from '@/components/logos-ui';
import { useT } from '@/i18n';
import type { Dim } from '@/lib/recap';
import { markSeen, type Milestone, type NextMilestone } from '@/lib/milestones';
import { localDate, type RecordKind } from '@/lib/store';
import { track } from '@/lib/track';
import { mmdd } from './shared';

const DIM_KEY = { consistency: 'dimConsistency', evidence: 'dimEvidence', defense: 'dimDefense' } as const satisfies Record<Dim, string>;
const SRC_KEY = { session: 'msSrcSession', argue: 'msSrcArgue', arena: 'msSrcArena', diagnostic: 'msSrcDiagnostic' } as const satisfies Record<RecordKind, string>;

const badge = { width: 28, height: 28, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: mono, fontSize: 12, fontWeight: 700 } as const;

export function MilestoneStrip({ milestones, next, limit = 3 }: { milestones: Milestone[]; next: NextMilestone | null; limit?: number }) {
  const t = useT('growth');
  const shown = milestones.slice(0, limit);
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    const fresh = shown.filter((m) => m.isNew);
    if (!fresh.length) return;
    sent.current = true;
    for (const m of fresh) track('milestone_seen', { dim: m.dim, level: m.level });
    markSeen(fresh.map((m) => m.id));
    // 처음 그려진 목록만 본 것으로 친다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rowStyle = { display: 'flex', gap: 12, alignItems: 'center', padding: '12px 14px', borderBottom: `1px solid ${T.border}` } as const;
  const sub = { fontFamily: body, fontSize: 12, color: T.creamDim, overflowWrap: 'anywhere' } as const;

  return (
    <section aria-label={t('msAria')} style={{ display: 'grid', gap: 10 }}>
      <span style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.16em', fontWeight: 700, color: T.cream }}>{t('msLabel')}</span>
      <div style={{ display: 'grid', border: `1px solid ${T.border}` }}>
        {shown.map((m) => {
          const dim = t(DIM_KEY[m.dim]);
          const meta = m.topic
            ? t('msMetaTopic', { date: mmdd(localDate(m.at)), source: t(SRC_KEY[m.kind]), topic: m.topic })
            : t('msMeta', { date: mmdd(localDate(m.at)), source: t(SRC_KEY[m.kind]) });
          return (
            <div key={m.id} style={rowStyle}>
              <span aria-hidden="true" style={m.level === 3 ? { ...badge, backgroundColor: T.cream, color: 'var(--l-on-fg)' } : { ...badge, border: `1px solid ${T.cream}`, color: T.cream }}>L{m.level}</span>
              <div style={{ display: 'grid', gap: 2, minWidth: 0 }}>
                <span style={{ fontFamily: body, fontSize: 14, fontWeight: 500, color: T.cream }}>{t(m.level === 3 ? 'msL3' : 'msL2', { dim })}</span>
                <span style={sub}>{meta}</span>
              </div>
              {m.isNew && <span style={{ marginLeft: 'auto', fontFamily: mono, fontSize: 10, letterSpacing: '0.12em', fontWeight: 700, color: T.amber }}>{t('msNew')}</span>}
            </div>
          );
        })}
        {next && (
          <div style={{ ...rowStyle, borderBottom: 'none' }}>
            <span aria-hidden="true" style={{ ...badge, border: `1px dashed ${T.borderMid}`, color: T.creamDim, fontWeight: 400 }}>L{next.level}</span>
            <div style={{ display: 'grid', gap: 2, minWidth: 0 }}>
              <span style={{ fontFamily: body, fontSize: 14, color: T.creamMid }}>{t('msNext', { dim: t(DIM_KEY[next.dim]), level: next.level })}</span>
              <span style={sub}>{t(next.hintKey)}</span>
            </div>
          </div>
        )}
        {!shown.length && !next && <div style={{ ...rowStyle, borderBottom: 'none', fontFamily: body, fontSize: 13, color: T.creamMid }}>{t('msEmpty')}</div>}
      </div>
    </section>
  );
}
