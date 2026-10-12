/*
 * Argue.tsx — Session 1 · 오늘의 논증
 *
 * 흐름: 입장 선택 → 이유 1~3문장(= 처음 주장) → 반문 3라운드(AI 질문, 가장 약한 고리) → 최종 정리 직접 작성
 *       → 처음/최종 채점 → Before/After + 연속 기록
 * 반문과 점수는 모두 서버 응답이다. 스코어는 완료 후에만 보인다.
 */
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import DashboardLayout from '@/components/DashboardLayout';
import {
  T, mono, serif, Label, btnPrimary, btnGhost, btnDisabled, textareaStyle, panelStyle, FocusStyle,
  TypingDots, ErrorLine, CharCount, RubricBars, DeltaRow, Quote, sans } from '@/components/logos-ui';
import { coach, errorMessage, type Position } from '@/lib/api';
import { todaysTopic } from '@/lib/topics';
import { computeStreak, newId, recordActivity, toISODate, upsertSession, loadStore, type SessionRecord, type Turn } from '@/lib/store';

const ROUNDS_TOTAL = 3;
const MAX_MESSAGE = 1000;
const MAX_REASON = 500;
const MAX_SUMMARY = 1500;
const MIN_SUMMARY = 30;

const POSITION_OPTIONS: { value: Position; ko: string; en: string; desc: string }[] = [
  { value: 'agree',       ko: '동의',   en: 'Agree',       desc: '명제가 옳다고 본다' },
  { value: 'disagree',    ko: '비동의', en: 'Disagree',    desc: '명제가 옳지 않다고 본다' },
  { value: 'conditional', ko: '조건부', en: 'Conditional', desc: '특정 조건 하에서만 옳다고 본다' },
];
const POS_KO: Record<Position, string> = { agree: '동의', disagree: '비동의', conditional: '조건부' };

type Phase = 'pick' | 'reason' | 'argue' | 'summary' | 'scoring' | 'complete';
const sr = { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' } as const;
const hist = (turns: Turn[]) => turns.slice(-8).map((t) => ({ role: t.role, content: t.content }));

export default function Argue() {
  const [, navigate] = useLocation();
  const [topic] = useState(todaysTopic());
  const [phase, setPhase] = useState<Phase>('pick');
  const [position, setPosition] = useState<Position | null>(null);
  const [rec, setRec] = useState<SessionRecord | null>(null);
  const recRef = useRef<SessionRecord | null>(null);
  const [round, setRound] = useState(0); // 지금까지 받은 AI 반문 수
  const [input, setInput] = useState('');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState<{ error: string; message: string } | null>(null);
  const [scoringErr, setScoringErr] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const commit = (next: SessionRecord) => {
    recRef.current = next;
    setRec(next);
    // 첫 사용자 답이 생기기 전에는 저장하지 않는다(완주율 분모 부풀림 방지)
    if (next.turns.some((t) => t.role === 'user')) upsertSession(next);
  };

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [rec?.turns.length, loading]);

  const begin = (pos: Position) => {
    setPosition(pos);
    commit({
      id: newId(), kind: 'argue', topic: topic.title, field: topic.category, position: pos,
      startedAt: new Date().toISOString(), stageReached: '표면', turns: [], promptVersion: '',
    });
    setPhase('reason');
  };

  const runTurn = async (message: string, addUser: boolean) => {
    const cur = recRef.current;
    if (!cur || !position || loading) return;
    setLoading(true);
    setFailed(null);
    const nextRound = round + 1;
    const history = hist(cur.turns);
    let base = cur;
    if (addUser) {
      base = {
        ...cur,
        firstClaim: cur.firstClaim ?? message,
        anchor: cur.anchor ?? message,
        turns: [...cur.turns, { role: 'user', content: message, at: new Date().toISOString() }],
      };
      commit(base);
    } else {
      history.pop();
    }
    try {
      const res = await coach({ action: 'argue.turn', topic: topic.title, position, round: nextRound, history, message });
      const latest = recRef.current;
      if (!latest || latest.id !== base.id) return;
      commit({
        ...latest,
        promptVersion: res.promptVersion,
        turns: [...latest.turns, { role: 'assistant', content: res.question, at: new Date().toISOString(), targetWeakness: res.targetWeakness }],
      });
      setRound(nextRound);
      setPhase((p) => (p === 'reason' ? 'argue' : p));
    } catch (e) {
      setFailed({ error: errorMessage(e), message });
    } finally {
      setLoading(false);
    }
  };

  const submit = () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    if (round >= ROUNDS_TOTAL) return;
    void runTurn(text, true);
  };

  const submitSummary = async () => {
    const finalText = summary.trim();
    const cur = recRef.current;
    if (!cur || finalText.length < MIN_SUMMARY) return;
    setPhase('scoring');
    setScoringErr('');
    commit({ ...cur, finalSummary: finalText });
    const latest = recRef.current!;
    const [before, after] = await Promise.allSettled([
      latest.scoreBefore ? Promise.resolve(null) : coach({ action: 'score', text: latest.firstClaim ?? '', context: topic.title }),
      latest.scoreAfter ? Promise.resolve(null) : coach({ action: 'score', text: finalText, context: topic.title }),
    ]);
    const next: SessionRecord = { ...recRef.current! };
    const pick = (r: typeof before) => (r.status === 'fulfilled' ? r.value : null);
    const b = pick(before);
    const a = pick(after);
    if (b) next.scoreBefore = { consistency: b.consistency, evidence: b.evidence, defense: b.defense, total: b.total, rationale: b.rationale };
    if (a) { next.scoreAfter = { consistency: a.consistency, evidence: a.evidence, defense: a.defense, total: a.total, rationale: a.rationale }; next.promptVersion = a.promptVersion; }
    if (next.scoreBefore && next.scoreAfter) {
      next.completedAt = new Date().toISOString();
      next.stageReached = '통합';
      commit(next);
      recordActivity();
      setPhase('complete');
    } else {
      commit(next);
      const rej = [before, after].find((r): r is PromiseRejectedResult => r.status === 'rejected');
      setScoringErr(rej ? errorMessage(rej.reason) : '일부 결과를 받지 못했어요.');
    }
  };

  const reset = () => {
    recRef.current = null;
    setRec(null); setPosition(null); setPhase('pick'); setInput(''); setSummary(''); setRound(0); setFailed(null); setScoringErr('');
  };

  /* ── PICK ── */
  if (phase === 'pick') {
    return (
      <DashboardLayout title="오늘의 논증" titleEn="Daily Argument">
        <FocusStyle />
        <div style={{ maxWidth: 860, display: 'grid', gap: 24 }}>
          <div style={{ display: 'grid', gap: 10 }}>
            <Label>Today's Topic · {topic.category}</Label>
            <h2 style={{ fontFamily: serif, fontWeight: 600, fontSize: 'clamp(1.6rem, 3.6vw, 2.6rem)', color: T.cream, letterSpacing: '-0.02em', lineHeight: 1.2, margin: 0 }}>{topic.title}</h2>
            <p style={{ fontFamily: mono, fontSize: 12, color: T.creamMid, lineHeight: 1.9, maxWidth: 620, margin: 0 }}>{topic.context}</p>
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            <Label>입장 선택 — 한쪽을 고르세요</Label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              {POSITION_OPTIONS.map((o) => (
                <button key={o.value} type="button" className="lg-btn" onClick={() => begin(o.value)}
                  style={{ ...panelStyle, textAlign: 'left', cursor: 'pointer', color: T.cream, display: 'grid', gap: 8 }}>
                  <span style={{ ...{ fontFamily: mono, fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase' as const }, color: T.creamMid }}>{o.en}</span>
                  <span style={{ fontFamily: serif, fontWeight: 600, fontSize: 22 }}>{o.ko}</span>
                  <span style={{ fontFamily: mono, fontSize: 11, color: T.creamMid, lineHeight: 1.7 }}>{o.desc}</span>
                </button>
              ))}
            </div>
          </div>
          <p style={{ fontFamily: mono, fontSize: 11, color: T.creamMid, borderTop: `1px solid ${T.border}`, paddingTop: 14, margin: 0, lineHeight: 1.8 }}>
            약 10분 · 반문 {ROUNDS_TOTAL}라운드 · 최종 정리는 직접 쓰기 · 점수는 AI 추정치이고 끝난 뒤에 공개됩니다.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  if (!rec || !position) return null;

  /* ── COMPLETE ── */
  if (phase === 'complete' && rec.scoreBefore && rec.scoreAfter) {
    const b = rec.scoreBefore;
    const a = rec.scoreAfter;
    const streak = computeStreak(loadStore().streak.days, toISODate(new Date()));
    return (
      <DashboardLayout title="오늘의 논증" titleEn="Daily Argument">
        <FocusStyle />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
          <div style={{ ...panelStyle, flex: '2 1 340px', display: 'grid', gap: 20 }}>
            <Label>{POS_KO[position]} 입장 · {topic.title}</Label>
            <DeltaRow before={b.total} after={a.total} beforeLabel="처음 이유" />
            <div style={{ display: 'grid', gap: 10 }}>
              <Quote>처음: "{rec.firstClaim}"</Quote>
              <Quote after>마지막: "{rec.finalSummary}"</Quote>
            </div>
            <RubricBars before={b} after={a} />
            <p style={{ margin: 0, fontFamily: sans, fontSize: 13, color: T.creamMid, borderLeft: `2px solid ${T.border}`, paddingLeft: 12, lineHeight: 1.7 }}>
              AI 추정치예요. 주황 눈금이 처음 점수입니다. {a.rationale}
            </p>
          </div>
          <div style={{ ...panelStyle, flex: '1 1 240px', display: 'grid', gap: 14 }}>
            <Label>연속 기록</Label>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontFamily: serif, fontSize: 40, color: T.cream, fontVariantNumeric: 'tabular-nums' }}>{streak.count}</span>
              <span style={{ fontFamily: mono, fontSize: 11, color: T.creamMid }}>일</span>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: T.creamMid, lineHeight: 1.7 }}>
              {streak.freezesLeftThisWeek > 0 ? '이번 주 쉬어가기 1회가 남아 있어요.' : '이번 주 쉬어가기를 썼어요.'}
            </p>
            <div style={{ display: 'grid', gap: 8 }}>
              <button type="button" className="lg-btn" style={btnPrimary} onClick={() => navigate('/dashboard')}>홈으로</button>
              <button type="button" className="lg-btn" style={btnGhost} onClick={() => navigate('/dashboard/session')}>소크라테스 코칭으로</button>
              <button type="button" className="lg-btn" style={btnGhost} onClick={reset}>다른 입장으로 다시</button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  /* ── SUMMARY / SCORING ── */
  if (phase === 'summary' || phase === 'scoring') {
    const busy = phase === 'scoring' && !scoringErr;
    const short = summary.trim().length < MIN_SUMMARY;
    return (
      <DashboardLayout title="오늘의 논증" titleEn="Daily Argument">
        <FocusStyle />
        <div style={{ maxWidth: 640, display: 'grid', gap: 16 }}>
          <div style={{ ...panelStyle, display: 'grid', gap: 14 }}>
            <Label>처음 이유 · {POS_KO[position]}</Label>
            <Quote>{rec.firstClaim}</Quote>
            <h2 style={{ fontFamily: serif, fontSize: 22, fontWeight: 600, margin: '6px 0 0', color: T.cream }}>세 번의 반문 뒤, 내 입장은?</h2>
            <p style={{ margin: 0, fontSize: 13, color: T.creamMid, lineHeight: 1.7 }}>
              처음 이유가 어떻게 달라졌는지 당신의 말로 정리해 주세요. {MIN_SUMMARY}자 이상이면 됩니다.
            </p>
            <label htmlFor="summary" style={sr}>최종 정리</label>
            <textarea id="summary" className="lg-field" value={summary} onChange={(e) => setSummary(e.target.value.slice(0, MAX_SUMMARY))}
              rows={7} maxLength={MAX_SUMMARY} disabled={phase === 'scoring'} style={textareaStyle} placeholder="지금 내 입장과 그 이유를 적어 보세요." />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', gap: 8, alignItems: 'center', fontFamily: mono, fontSize: 10, color: T.creamMid }}>
                <CharCount value={summary} max={MAX_SUMMARY} /> 최소 {MIN_SUMMARY}자
              </span>
              <button type="button" className="lg-btn" onClick={() => void submitSummary()} disabled={busy || short}
                style={{ ...btnPrimary, ...(busy || short ? btnDisabled : {}) }}>
                {busy ? '채점하는 중' : scoringErr ? '다시 채점' : '결과 보기'}
              </button>
            </div>
            {busy && <TypingDots label="점수를 계산하는 중" />}
            {scoringErr && <ErrorLine message={scoringErr} onRetry={() => void submitSummary()} />}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  /* ── REASON / ARGUE ── */
  const inReason = phase === 'reason';
  const lastIsAi = rec.turns[rec.turns.length - 1]?.role === 'assistant';
  const done = round >= ROUNDS_TOTAL && lastIsAi;
  const max = inReason ? MAX_REASON : MAX_MESSAGE;
  return (
    <DashboardLayout title="오늘의 논증" titleEn="Daily Argument">
      <FocusStyle />
      <div style={{ maxWidth: 780, display: 'grid', gap: 16 }}>
        <div style={{ ...panelStyle, display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ minWidth: 0, flex: '1 1 240px' }}>
            <Label>Topic · {topic.category}</Label>
            <div style={{ fontFamily: serif, fontWeight: 600, fontSize: 16, color: T.cream, marginTop: 4, overflowWrap: 'anywhere' }}>{topic.title}</div>
          </div>
          <div style={{ fontFamily: mono, fontSize: 11, color: T.creamMid, display: 'flex', gap: 12 }}>
            <span>입장 <strong style={{ color: T.cream }}>{POS_KO[position]}</strong></span>
            <span aria-label={`반문 ${Math.min(round + (done ? 0 : 1), ROUNDS_TOTAL)}라운드 중 ${ROUNDS_TOTAL}`}>R {Math.min(round + (done ? 0 : 1), ROUNDS_TOTAL)}/{ROUNDS_TOTAL}</span>
          </div>
        </div>

        <div style={{ ...panelStyle }} aria-live="polite">
          {inReason && (
            <p style={{ margin: 0, fontFamily: serif, fontSize: 18, lineHeight: 1.7, color: T.cream }}>
              {POS_KO[position]} 입장이군요. 그렇게 생각하는 이유를 1~3문장으로 적어 주세요.
            </p>
          )}
          {rec.turns.map((t, i) => {
            const ai = t.role === 'assistant';
            return (
              <div key={i} style={{ padding: '16px 0', borderBottom: i < rec.turns.length - 1 ? `1px solid ${T.border}` : 'none', display: 'grid', gap: 6 }}>
                <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: ai ? T.creamMid : T.creamDim }}>{ai ? 'LOGOS' : `You · ${POS_KO[position]}`}</span>
                <p style={{ margin: 0, fontFamily: ai ? serif : mono, fontSize: ai ? 18 : 14, lineHeight: 1.7, color: ai ? T.cream : T.creamMid, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{t.content}</p>
                {ai && t.targetWeakness && (
                  <span style={{ fontFamily: mono, fontSize: 10, color: T.creamDim, lineHeight: 1.6 }}>겨냥한 약한 고리 · {t.targetWeakness}</span>
                )}
              </div>
            );
          })}
          {loading && <TypingDots />}
          <div ref={endRef} />
        </div>

        {failed && <ErrorLine message={failed.error} onRetry={() => void runTurn(failed.message, false)} retryLabel="마지막 메시지 다시 보내기" />}

        {done ? (
          <div style={{ ...panelStyle, borderColor: T.amber, display: 'grid', gap: 10 }}>
            <p style={{ margin: 0, fontSize: 13, color: T.cream, lineHeight: 1.7 }}>반문 {ROUNDS_TOTAL}라운드를 마쳤어요. 이제 마지막 질문에 대한 답까지 담아 내 입장을 직접 정리해 보세요.</p>
            <div><button type="button" className="lg-btn" style={btnPrimary} onClick={() => setPhase('summary')}>정리하기</button></div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            <label htmlFor="argue-input" style={sr}>{inReason ? '이유 입력' : '논거 입력'}</label>
            <textarea id="argue-input" className="lg-field" value={input} onChange={(e) => setInput(e.target.value.slice(0, max))}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !e.nativeEvent.isComposing) submit(); }}
              placeholder={inReason ? '예: 근거가 되는 사례나 숫자를 한두 개 들어 주세요' : '당신의 논거를 적어 주세요 (Cmd/Ctrl + Enter 전송)'}
              rows={inReason ? 4 : 3} maxLength={max} disabled={loading} style={textareaStyle} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <CharCount value={input} max={max} />
              <button type="button" className="lg-btn" onClick={submit} disabled={loading || !input.trim()} style={{ ...btnPrimary, ...(loading || !input.trim() ? btnDisabled : {}) }}>
                {inReason ? '이유 제출' : '전송'}
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
