/*
 * SessionHistory.tsx — 세션 기록 (이 기기에 저장된 실제 기록)
 */
import { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import DashboardLayout from '@/components/DashboardLayout';
import { T, mono, serif, Label, btnPrimary, btnGhost, panelStyle, FocusStyle, DeltaRow, Quote, RubricBars, ReportBlocks, sans } from '@/components/logos-ui';
import { sessionDelta, useStore, type SessionRecord } from '@/lib/store';

type Filter = 'all' | 'session' | 'argue';
const FILTERS: { v: Filter; label: string }[] = [
  { v: 'all', label: '전체' },
  { v: 'session', label: '코칭' },
  { v: 'argue', label: '오늘의 논증' },
];
const fmt = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

function Detail({ s }: { s: SessionRecord }) {
  const [showLog, setShowLog] = useState(false);
  return (
    <div style={{ display: 'grid', gap: 18, padding: '4px 0 20px' }}>
      {s.scoreBefore && s.scoreAfter ? (
        <>
          <DeltaRow before={s.scoreBefore.total} after={s.scoreAfter.total} />
          <RubricBars before={s.scoreBefore} after={s.scoreAfter} />
          <p style={{ margin: 0, fontFamily: sans, fontSize: 12, color: T.creamMid, lineHeight: 1.7 }}>AI 추정치 · {s.scoreAfter.rationale}</p>
        </>
      ) : (
        <p style={{ margin: 0, fontSize: 13, color: T.creamMid }}>아직 점수가 없어요. 끝까지 마치면 처음과 마지막을 비교해 보여 드려요.</p>
      )}
      {s.firstClaim && <Quote>처음: "{s.firstClaim}"</Quote>}
      {s.finalSummary && <Quote after>마지막: "{s.finalSummary}"</Quote>}
      {s.report && <ReportBlocks report={s.report} />}
      {s.survey && (
        <p style={{ margin: 0, fontFamily: mono, fontSize: 11, color: T.creamMid }}>
          설문 · 일반 AI와의 차이 {s.survey.differentFromAI}/5 · 스스로 낸 결론 {s.survey.selfAuthored}/5
        </p>
      )}
      <div>
        <button type="button" className="lg-btn" style={{ ...btnGhost, padding: '6px 12px', fontSize: 10 }} onClick={() => setShowLog((v) => !v)} aria-expanded={showLog}>
          {showLog ? '대화 접기' : `대화 전체 보기 (${s.turns.length})`}
        </button>
        {showLog && (
          <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
            {s.turns.map((t, i) => (
              <p key={i} style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: t.role === 'assistant' ? T.cream : T.creamMid, fontFamily: t.role === 'assistant' ? serif : mono, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                <span style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.2em', color: T.creamDim, marginRight: 8 }}>{t.role === 'assistant' ? 'LOGOS' : 'YOU'}</span>
                {t.content}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SessionHistory() {
  const [, navigate] = useLocation();
  const store = useStore();
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const list = useMemo(
    () =>
      [...store.sessions]
        .reverse()
        .filter((s) => (filter === 'all' || s.kind === filter) && (!q || s.topic.includes(q) || (s.finalSummary ?? '').includes(q) || (s.firstClaim ?? '').includes(q))),
    [store.sessions, filter, q],
  );

  return (
    <DashboardLayout title="세션 기록" titleEn="Session History">
      <FocusStyle />
      <div style={{ display: 'grid', gap: 16, maxWidth: 860 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', alignItems: 'center' }}>
          <div role="group" aria-label="종류" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {FILTERS.map((f) => (
              <button key={f.v} type="button" className="lg-btn" aria-pressed={filter === f.v} onClick={() => setFilter(f.v)}
                style={{ ...btnGhost, padding: '6px 12px', fontSize: 10, textTransform: 'none', backgroundColor: filter === f.v ? T.cream : 'transparent', color: filter === f.v ? T.black : T.cream }}>
                {f.label}
              </button>
            ))}
          </div>
          <label style={{ display: 'contents' }}>
            <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>기록 검색</span>
            <input className="lg-field" value={q} onChange={(e) => setQ(e.target.value)} placeholder="주제·내용 검색"
              style={{ fontFamily: mono, fontSize: 12, color: T.cream, backgroundColor: T.black, border: `1px solid ${T.border}`, padding: '8px 12px', minWidth: 0, flex: '1 1 160px', maxWidth: 260 }} />
          </label>
        </div>

        {store.sessions.length === 0 ? (
          <div style={{ ...panelStyle, display: 'grid', gap: 12 }}>
            <p style={{ margin: 0, fontFamily: serif, fontSize: 18, color: T.cream }}>아직 기록이 없어요.</p>
            <p style={{ margin: 0, fontSize: 13, color: T.creamMid, lineHeight: 1.7 }}>세션이나 오늘의 논증을 시작하면 여기에 쌓여요. 기록은 이 기기에만 저장됩니다.</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="lg-btn" style={btnPrimary} onClick={() => navigate('/dashboard/session')}>코칭 세션</button>
              <button type="button" className="lg-btn" style={btnGhost} onClick={() => navigate('/dashboard/argue')}>오늘의 논증</button>
            </div>
          </div>
        ) : list.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: T.creamMid }}>조건에 맞는 기록이 없어요.</p>
        ) : (
          <div>
            {list.map((s) => {
              const d = sessionDelta(s);
              const isOpen = open === s.id;
              return (
                <div key={s.id} style={{ borderTop: `1px solid ${T.border}` }}>
                  <button type="button" className="lg-btn" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : s.id)}
                    style={{ width: '100%', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', textAlign: 'left', padding: '16px 0', background: 'none', border: 'none', color: T.cream, cursor: 'pointer' }}>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontFamily: mono, fontSize: 13, fontWeight: 700, marginBottom: 3, overflowWrap: 'anywhere' }}>{s.topic}</span>
                      <span style={{ fontFamily: mono, fontSize: 10, color: T.creamMid }}>
                        {fmt(s.startedAt)} · {s.kind === 'argue' ? '오늘의 논증' : '코칭'} · {s.completedAt ? '완주' : `진행 중 (${s.stageReached} 단계)`}
                      </span>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexShrink: 0 }}>
                      {d !== null && <span style={{ fontFamily: mono, fontSize: 12, color: d > 0 ? T.amber : T.creamMid }}>{d > 0 ? `+${d}` : d}</span>}
                      {s.scoreAfter && <span style={{ fontFamily: serif, fontSize: 24 }}>{s.scoreAfter.total}</span>}
                    </span>
                  </button>
                  {isOpen && <Detail s={s} />}
                </div>
              );
            })}
            <div style={{ borderTop: `1px solid ${T.border}` }} />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
