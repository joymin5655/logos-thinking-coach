/*
 * ThinkingSession.tsx — 소크라테스 코칭 세션 (실제 AI)
 *
 * 흐름: 주제 입력 → 고정 첫 질문("가장 확신하는 한 가지") → 사용자 답 = anchor = 처음 주장
 *       → 서버 질문 반복(표면·도전·핵심·통합) → 사용자가 직접 최종 정리 → 처음/최종 채점 + 리포트
 * 질문·점수 문구는 모두 서버 응답이다. 클라이언트에 정해진 것은 첫 질문 하나뿐이다.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import DashboardLayout from '@/components/DashboardLayout';
import {
  T, mono, serif, Label, btnPrimary, btnGhost, btnDisabled, textareaStyle, panelStyle, FocusStyle,
  TypingDots, ErrorLine, CharCount, RubricBars, DeltaRow, Quote, ReportBlocks, Survey, sans } from '@/components/logos-ui';
import { coach, errorMessage, handleAuthError, type Control, type Stage, type ScoreRes, type SessionReportRes } from '@/lib/api';
import { newId, recordActivity, upsertSession, useStore, type SessionRecord, type Turn } from '@/lib/store';

const STAGES: Stage[] = ['표면', '도전', '핵심', '통합'];
const STAGE_EN: Record<Stage, string> = { 표면: 'SURFACE', 도전: 'CHALLENGE', 핵심: 'CORE', 통합: 'SYNTHESIS' };
const STAGE_DESC: Record<Stage, string> = {
  표면: '생각을 꺼내 놓습니다',
  도전: '전제를 흔들어 봅니다',
  핵심: '진짜 문제를 찾습니다',
  통합: '스스로 정리할 차례입니다',
};

const FIRST_QUESTION = '이 주제에서 지금 가장 확신하는 한 가지는 무엇인가요?';
const MAX_TOPIC = 200;
const MAX_MESSAGE = 1000;
const MAX_SUMMARY = 1500;
const MIN_SUMMARY = 30;
const CONTROL_TEXT: Record<Control, string> = {
  DEEPEN: '더 파고들어줘',
  ENOUGH: '이 정도면 됐어',
  THINK: '내가 더 고민해볼게',
};

type Phase = 'intro' | 'session' | 'summary' | 'scoring' | 'complete';
type Pending = { message: string; control?: Control };

const sr = { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' } as const;
const toScore = (s: ScoreRes) => ({ consistency: s.consistency, evidence: s.evidence, defense: s.defense, total: s.total, rationale: s.rationale });
const toReport = (r: SessionReportRes) => ({ stuckPoints: r.stuckPoints, assumptions: r.assumptions, nextQuestions: r.nextQuestions, turningPoint: r.turningPoint });
const toHistory = (turns: Turn[], n: number) => turns.slice(-n).map((t) => ({ role: t.role, content: t.content.slice(0, MAX_MESSAGE) }));
const stageIdx = (s: Stage) => STAGES.indexOf(s);
const stageOf = (r: SessionRecord): Stage => [...r.turns].reverse().find((t) => t.role === 'assistant' && t.stage)?.stage ?? '표면';

export default function ThinkingSession() {
  const [, navigate] = useLocation();
  const store = useStore();
  const [phase, setPhase] = useState<Phase>('intro');
  const [topic, setTopic] = useState('');
  const [rec, setRec] = useState<SessionRecord | null>(null);
  const recRef = useRef<SessionRecord | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState<{ error: string; retry: Pending } | null>(null);
  const [thinkOffer, setThinkOffer] = useState(false);
  const [summary, setSummary] = useState('');
  const [scoringErr, setScoringErr] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const commit = (next: SessionRecord) => {
    recRef.current = next;
    setRec(next);
    // 첫 사용자 답이 생기기 전에는 저장하지 않는다(시작만 하고 떠난 세션이 완주율 분모를 부풀리지 않도록)
    if (next.turns.some((t) => t.role === 'user')) upsertSession(next);
  };
  const patch = (p: Partial<SessionRecord>) => {
    if (recRef.current) commit({ ...recRef.current, ...p });
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [rec?.turns.length, loading]);

  const resumable = useMemo(
    () => [...store.sessions].reverse().find((s) => s.kind === 'session' && !s.completedAt && s.turns.some((t) => t.role === 'user')),
    [store.sessions],
  );

  const currentStage: Stage = rec ? stageOf(rec) : '표면';
  const userTurns = rec?.turns.filter((t) => t.role === 'user').length ?? 0;
  // 통합 단계 질문이 나온 뒤 사용자가 한 번 이상 답했는지
  const answeredInSynthesis = useMemo(() => {
    const turns = rec?.turns ?? [];
    const first = turns.findIndex((t) => t.role === 'assistant' && t.stage === '통합');
    return first >= 0 && turns.slice(first + 1).some((t) => t.role === 'user');
  }, [rec?.turns]);
  const canSummarize = !!rec?.anchor && (answeredInSynthesis || userTurns >= 6);

  const startSession = () => {
    const t = topic.trim();
    if (!t) return;
    const now = new Date().toISOString();
    commit({
      id: newId(), kind: 'session', topic: t, startedAt: now, stageReached: '표면',
      turns: [{ role: 'assistant', content: FIRST_QUESTION, at: now, stage: '표면' }],
      promptVersion: '',
    });
    setPhase('session');
  };

  const resume = (s: SessionRecord) => {
    recRef.current = s;
    setRec(s);
    setTopic(s.topic);
    setSummary(s.finalSummary ?? '');
    // 마지막 저장 턴이 사용자 턴이면 답을 못 받은 채 끊긴 것 — 재시도 상태로 복원
    const last = s.turns[s.turns.length - 1];
    setFailed(last?.role === 'user' ? { error: '이전 답변에 대한 질문을 받지 못했어요.', retry: { message: last.content, control: last.control } } : null);
    setPhase('session');
  };

  // 첫 주장 채점은 대화와 병렬로 미리 해 둔다. 실패하면 마지막 정리 때 다시 시도한다.
  const scoreAnchorInBackground = (claim: string, topicText: string, sessionId: string) => {
    coach({ action: 'score', sid: sessionId, kind: 'session', text: claim, context: topicText })
      .then((s) => {
        if (recRef.current?.id === sessionId && !recRef.current.scoreBefore) patch({ scoreBefore: toScore(s) });
      })
      .catch(() => {});
  };

  const runTurn = async (message: string, control: Control | undefined, addUser: boolean) => {
    const cur = recRef.current;
    if (!cur || loading) return;
    setLoading(true);
    setFailed(null);
    setThinkOffer(false);
    const history = toHistory(cur.turns, 16);
    let base = cur;
    if (addUser) {
      const isAnchor = !cur.anchor;
      base = {
        ...cur,
        anchor: cur.anchor ?? message,
        firstClaim: cur.firstClaim ?? message,
        turns: [...cur.turns, { role: 'user', content: message, at: new Date().toISOString(), control }],
      };
      commit(base);
      if (isAnchor) scoreAnchorInBackground(message, cur.topic, cur.id);
    } else {
      history.pop(); // 재시도: 마지막 사용자 턴은 message로 따로 보낸다
    }
    try {
      const res = await coach({
        action: 'session.turn', sid: base.id, topic: base.topic, stage: stageOf(cur), history, message, control, anchor: base.anchor,
      });
      // await 중 백그라운드 scoreBefore 패치가 들어왔을 수 있으므로 base가 아니라 최신 기록에 이어 붙인다
      const latest = recRef.current;
      if (!latest || latest.id !== base.id) return;
      commit({
        ...latest,
        stageReached: stageIdx(res.stage) > stageIdx(latest.stageReached) ? res.stage : latest.stageReached,
        promptVersion: res.promptVersion,
        turns: [...latest.turns, { role: 'assistant', content: res.question, at: new Date().toISOString(), stage: res.stage, aporia: res.aporia }],
      });
      if (control === 'THINK') setThinkOffer(true);
    } catch (e) {
      if (handleAuthError(e, navigate)) return;
      setFailed({ error: errorMessage(e), retry: { message, control } });
    } finally {
      setLoading(false);
    }
  };

  const send = (control?: Control) => {
    const text = input.trim();
    if (loading || !rec) return;
    if (!rec.anchor && !text) return; // 첫 답은 직접 써야 한다
    const message = text || (control ? CONTROL_TEXT[control] : '');
    if (!message) return;
    setInput('');
    void runTurn(message, control, true);
  };

  const submitSummary = async () => {
    const finalText = summary.trim();
    if (!recRef.current || finalText.length < MIN_SUMMARY) return;
    setPhase('scoring');
    setScoringErr('');
    // 정리 글이 바뀌었으면 이전 정리로 만든 점수·리포트는 재사용하지 않는다
    if (finalText !== recRef.current.finalSummary) patch({ finalSummary: finalText, scoreAfter: undefined, report: undefined });
    const latest = recRef.current!;
    const claim = latest.firstClaim ?? latest.anchor ?? '';
    const [before, after, report] = await Promise.allSettled([
      latest.scoreBefore ? Promise.resolve(null) : coach({ action: 'score', sid: latest.id, kind: 'session', text: claim, context: latest.topic }),
      latest.scoreAfter ? Promise.resolve(null) : coach({ action: 'score', sid: latest.id, kind: 'session', text: finalText, context: latest.topic }),
      latest.report ? Promise.resolve(null) : coach({ action: 'session.report', sid: latest.id, topic: latest.topic, history: toHistory(latest.turns, 24) }),
    ]);
    const next: SessionRecord = { ...recRef.current! };
    if (before.status === 'fulfilled' && before.value) next.scoreBefore = toScore(before.value);
    if (after.status === 'fulfilled' && after.value) { next.scoreAfter = toScore(after.value); next.promptVersion = after.value.promptVersion; }
    if (report.status === 'fulfilled' && report.value) next.report = toReport(report.value);
    const firstErr = [before, after, report].find((r): r is PromiseRejectedResult => r.status === 'rejected');
    if (firstErr && handleAuthError(firstErr.reason, navigate)) {
      commit(next);
      return;
    }
    if (!firstErr && next.scoreBefore && next.scoreAfter && next.report) {
      next.completedAt = new Date().toISOString();
      commit(next);
      recordActivity();
      setPhase('complete');
    } else {
      commit(next);
      setScoringErr(firstErr ? errorMessage(firstErr.reason) : '일부 결과를 받지 못했어요.');
    }
  };

  const saveAndLeave = () => {
    toast('저장했어요. 세션 시작 화면에서 이어서 할 수 있어요.');
    navigate('/dashboard');
  };

  const reset = () => {
    recRef.current = null;
    setRec(null);
    setTopic('');
    setInput('');
    setSummary('');
    setFailed(null);
    setThinkOffer(false);
    setScoringErr('');
    setPhase('intro');
  };

  /* ───────── INTRO ───────── */
  if (phase === 'intro') {
    return (
      <DashboardLayout title="씽킹 세션" titleEn="Thinking Session">
        <FocusStyle />
        <div style={{ maxWidth: 560, margin: '24px auto', display: 'grid', gap: 16 }}>
          {resumable && (
            <div style={{ ...panelStyle, display: 'grid', gap: 10 }}>
              <Label>이어서 하기</Label>
              <p style={{ margin: 0, fontFamily: serif, fontSize: 16, color: T.cream, overflowWrap: 'anywhere' }}>"{resumable.topic}"</p>
              <p style={{ margin: 0, fontFamily: mono, fontSize: 11, color: T.creamMid }}>
                {resumable.stageReached} 단계까지 {resumable.turns.filter((t) => t.role === 'user').length}번 답했어요.
              </p>
              <div><button type="button" className="lg-btn" style={btnGhost} onClick={() => resume(resumable)}>이어서 하기</button></div>
            </div>
          )}
          <div style={{ border: `1px solid ${T.border}`, backgroundColor: T.panel }}>
            <div style={{ padding: '22px 22px 18px' }}>
              <Label style={{ marginBottom: 10 }}>Session Init · Socratic Method</Label>
              <h2 style={{ fontFamily: serif, fontSize: 28, fontWeight: 600, color: T.cream, lineHeight: 1.2, margin: '0 0 8px' }}>무엇을 생각하고 싶으신가요?</h2>
              <p style={{ fontFamily: mono, fontSize: 12, color: T.creamMid, lineHeight: 1.8, margin: '0 0 16px' }}>
                고민, 결정, 주장 — 무엇이든 괜찮아요. LOGOS는 답을 주지 않고 질문만 합니다.
              </p>
              <label htmlFor="topic" style={sr}>세션 주제</label>
              <textarea
                id="topic"
                className="lg-field"
                value={topic}
                onChange={(e) => setTopic(e.target.value.slice(0, MAX_TOPIC))}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); startSession(); } }}
                placeholder="예: 지금 회사를 옮겨야 할지 고민됩니다"
                maxLength={MAX_TOPIC}
                rows={4}
                style={{ ...textareaStyle, resize: 'none' }}
              />
            </div>
            <div style={{ padding: '10px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `1px solid ${T.border}` }}>
              <CharCount value={topic} max={MAX_TOPIC} />
              <button type="button" className="lg-btn" onClick={startSession} disabled={!topic.trim()} style={{ ...btnPrimary, ...(topic.trim() ? {} : btnDisabled) }}>
                세션 시작
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!rec) return null;

  /* ───────── SUMMARY / SCORING ───────── */
  if (phase === 'summary' || phase === 'scoring') {
    const busy = phase === 'scoring' && !scoringErr;
    const short = summary.trim().length < MIN_SUMMARY;
    return (
      <DashboardLayout title="내 말로 정리하기" titleEn="Your Synthesis">
        <FocusStyle />
        <div style={{ maxWidth: 640, margin: '24px auto', display: 'grid', gap: 16 }}>
          <div style={{ ...panelStyle, display: 'grid', gap: 14 }}>
            <Label>처음 주장</Label>
            <Quote>{rec.firstClaim}</Quote>
            <h2 style={{ fontFamily: serif, fontSize: 22, fontWeight: 600, margin: '6px 0 0', color: T.cream }}>지금은 어떻게 생각하나요?</h2>
            <p style={{ margin: 0, fontSize: 13, color: T.creamMid, lineHeight: 1.7 }}>
              대화에서 발견한 것을 당신의 말로 정리해 주세요. LOGOS는 대신 써 주지 않아요. {MIN_SUMMARY}자 이상 써야 점수를 볼 수 있어요.
            </p>
            <label htmlFor="summary" style={sr}>최종 정리</label>
            <textarea
              id="summary"
              className="lg-field"
              value={summary}
              onChange={(e) => setSummary(e.target.value.slice(0, MAX_SUMMARY))}
              disabled={phase === 'scoring'}
              rows={7}
              maxLength={MAX_SUMMARY}
              placeholder="지금 내 결론과 그 이유를 적어 보세요."
              style={textareaStyle}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', gap: 8, alignItems: 'center', fontFamily: mono, fontSize: 10, color: T.creamMid }}>
                <CharCount value={summary} max={MAX_SUMMARY} /> 최소 {MIN_SUMMARY}자
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                {phase === 'summary' && (
                  <button type="button" className="lg-btn" style={btnGhost} onClick={() => setPhase('session')}>대화로 돌아가기</button>
                )}
                <button
                  type="button" className="lg-btn"
                  onClick={() => void submitSummary()}
                  disabled={busy || short}
                  style={{ ...btnPrimary, ...(busy || short ? btnDisabled : {}) }}
                >
                  {busy ? '채점하는 중' : scoringErr ? '다시 채점' : '결과 보기'}
                </button>
              </div>
            </div>
            {busy && <TypingDots label="점수와 리포트를 만드는 중" />}
            {scoringErr && <ErrorLine message={scoringErr} onRetry={() => void submitSummary()} />}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  /* ───────── COMPLETE ───────── */
  if (phase === 'complete' && rec.scoreBefore && rec.scoreAfter && rec.report) {
    const { scoreBefore: b, scoreAfter: a, report } = rec;
    return (
      <DashboardLayout title="세션 리포트" titleEn="Session Report">
        <FocusStyle />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
          <div style={{ ...panelStyle, flex: '1 1 340px', display: 'grid', gap: 20 }}>
            <Label>이번 세션 · {rec.topic}</Label>
            <DeltaRow before={b.total} after={a.total} />
            <div style={{ display: 'grid', gap: 10 }}>
              <Quote>처음: "{rec.firstClaim}"</Quote>
              <Quote after>마지막: "{rec.finalSummary}"</Quote>
            </div>
            <RubricBars before={b} after={a} />
            <p style={{ margin: 0, fontFamily: sans, fontSize: 13, color: T.creamMid, borderLeft: `2px solid ${T.border}`, paddingLeft: 12, lineHeight: 1.7 }}>
              AI 추정치예요. 같은 루브릭으로 처음 답과 마지막 정리를 따로 채점하고, 주황 눈금이 처음 점수입니다. {a.rationale}
            </p>
          </div>
          <div style={{ ...panelStyle, flex: '1 1 340px', display: 'grid', gap: 20 }}>
            <Label>LOGOS는 답 대신 빈틈을 보여줍니다</Label>
            <ReportBlocks report={report} />
            <Survey value={rec.survey} onChange={(v) => patch({ survey: v })} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button type="button" className="lg-btn" style={btnPrimary} onClick={reset}>새 세션</button>
              <button type="button" className="lg-btn" style={btnGhost} onClick={() => navigate('/dashboard/history')}>세션 기록</button>
              <button type="button" className="lg-btn" style={btnGhost} onClick={() => navigate('/dashboard')}>홈</button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  /* ───────── SESSION ───────── */
  const lastTurn = rec.turns[rec.turns.length - 1];
  const needsFirstAnswer = !rec.anchor;
  const controlsDisabled = loading || needsFirstAnswer;
  const showSynthesisPrompt = canSummarize && !loading && !failed && lastTurn?.role === 'assistant';

  return (
    <DashboardLayout title="씽킹 세션" titleEn="Thinking Session">
      <FocusStyle />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
        <div style={{ flex: '2 1 360px', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 6, flexWrap: 'wrap' }}>
            <Label>Subject</Label>
            <span style={{ fontFamily: mono, fontSize: 12, color: T.creamMid, overflowWrap: 'anywhere' }}>{rec.topic}</span>
          </div>
          <div aria-live="polite">
            {rec.turns.map((t, i) => {
              const ai = t.role === 'assistant';
              return (
                <div
                  key={i}
                  className="lg-fade"
                  style={{ padding: '20px 0', borderBottom: `1px solid ${T.border}`, animation: 'lg-fade 0.25s ease', ...(ai && t.aporia ? { borderLeft: `2px dashed ${T.amber}`, paddingLeft: 14 } : {}) }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: ai ? T.creamMid : T.creamDim }}>{ai ? 'LOGOS' : 'You'}</span>
                    {ai && t.stage && (
                      <span style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.22em', color: T.creamDim, padding: '2px 6px', border: `1px solid ${T.border}` }}>{STAGE_EN[t.stage]}</span>
                    )}
                    {ai && t.aporia && (
                      <span style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.18em', color: T.amber }}>RECOVERY · 처음 확신했던 지점으로 돌아가요</span>
                    )}
                    {!ai && t.control && (
                      <span style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.18em', color: T.creamDim, padding: '2px 6px', border: `1px solid ${T.border}` }}>{CONTROL_TEXT[t.control]}</span>
                    )}
                  </div>
                  <p style={{ margin: 0, fontFamily: ai ? serif : mono, fontSize: ai ? 18 : 14, lineHeight: 1.7, color: ai ? T.cream : T.creamMid, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{t.content}</p>
                </div>
              );
            })}
            {loading && <TypingDots />}
          </div>

          {failed && (
            <div style={{ marginTop: 12 }}>
              <ErrorLine message={failed.error} onRetry={() => void runTurn(failed.retry.message, failed.retry.control, false)} retryLabel="마지막 메시지 다시 보내기" />
            </div>
          )}

          {thinkOffer && !loading && (
            <div style={{ ...panelStyle, marginTop: 12, display: 'grid', gap: 10 }}>
              <p style={{ margin: 0, fontSize: 13, color: T.cream, lineHeight: 1.7 }}>충분히 생각해 보세요. 지금까지의 대화는 저장해 두고, 나중에 이어서 할 수 있어요.</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" className="lg-btn" style={btnPrimary} onClick={saveAndLeave}>저장하고 나가기</button>
                <button type="button" className="lg-btn" style={btnGhost} onClick={() => setThinkOffer(false)}>계속하기</button>
              </div>
            </div>
          )}

          {showSynthesisPrompt && (
            <div style={{ ...panelStyle, marginTop: 12, borderColor: T.amber, display: 'grid', gap: 10 }}>
              <p style={{ margin: 0, fontSize: 13, color: T.cream, lineHeight: 1.7 }}>
                정리할 만큼 대화가 쌓였어요. 이제 지금 생각을 직접 한 번 써 볼까요?
              </p>
              <div><button type="button" className="lg-btn" style={btnPrimary} onClick={() => setPhase('summary')}>정리하기</button></div>
            </div>
          )}

          <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
            <label htmlFor="msg" style={sr}>답변 입력</label>
            <textarea
              id="msg"
              className="lg-field"
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, MAX_MESSAGE))}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }}
              placeholder={needsFirstAnswer ? '가장 확신하는 한 가지를 적어 주세요' : '생각을 적어 주세요 (Enter 전송, Shift+Enter 줄바꿈)'}
              rows={3}
              maxLength={MAX_MESSAGE}
              disabled={loading}
              style={textareaStyle}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <CharCount value={input} max={MAX_MESSAGE} />
              <button type="button" className="lg-btn" onClick={() => send()} disabled={loading || !input.trim()} style={{ ...btnPrimary, ...(loading || !input.trim() ? btnDisabled : {}) }}>
                보내기
              </button>
            </div>
          </div>
          <div ref={endRef} />
        </div>

        <aside style={{ flex: '1 1 260px', maxWidth: '100%', display: 'grid', gap: 16 }}>
          <div style={{ ...panelStyle, display: 'grid', gap: 12 }}>
            <Label>진행 단계</Label>
            <div style={{ display: 'flex', gap: 6 }} role="img" aria-label={`4단계 중 ${stageIdx(currentStage) + 1}단계, ${currentStage}`}>
              {STAGES.map((s, i) => (
                <span key={s} style={{ height: 3, flex: 1, backgroundColor: i <= stageIdx(currentStage) ? T.cream : T.border }} />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: mono, fontSize: 10 }}>
              {STAGES.map((s) => (
                <span key={s} style={{ color: s === currentStage ? T.cream : T.creamDim, fontWeight: s === currentStage ? 700 : 400 }}>{s}</span>
              ))}
            </div>
            <p style={{ margin: 0, fontSize: 12, color: T.creamMid }}>{STAGE_DESC[currentStage]}</p>
          </div>

          <div style={{ ...panelStyle, display: 'grid', gap: 8 }}>
            <Label>대화 조절</Label>
            {([
              ['DEEPEN', '더 파고들어줘', '같은 지점을 더 날카롭게 묻습니다'],
              ['ENOUGH', '이 정도면 됐어', '다음 단계로 넘어갑니다'],
              ['THINK', '내가 더 고민해볼게', '저장해 두고 나중에 이어갑니다'],
            ] as [Control, string, string][]).map(([c, label, hint]) => (
              <button
                key={c} type="button" className="lg-btn"
                onClick={() => send(c)}
                disabled={controlsDisabled}
                style={{ ...btnGhost, textAlign: 'left', display: 'grid', gap: 2, letterSpacing: '0.04em', textTransform: 'none', ...(controlsDisabled ? btnDisabled : {}) }}
              >
                <span style={{ fontWeight: 700 }}>{label}</span>
                <span style={{ fontSize: 10, color: T.creamMid }}>{hint}</span>
              </button>
            ))}
            {needsFirstAnswer && <p style={{ margin: 0, fontSize: 11, color: T.creamDim }}>첫 답을 쓰면 켜져요.</p>}
          </div>

          <div style={{ ...panelStyle, display: 'grid', gap: 8 }}>
            <Label>내가 처음 확신한 것</Label>
            {rec.anchor ? <Quote>{rec.anchor}</Quote> : <p style={{ margin: 0, fontSize: 12, color: T.creamDim }}>아직 없어요.</p>}
            <button
              type="button" className="lg-btn"
              onClick={() => setPhase('summary')}
              disabled={!canSummarize || loading}
              style={{ ...btnGhost, marginTop: 4, ...(!canSummarize || loading ? btnDisabled : {}) }}
            >
              정리하기
            </button>
            {!canSummarize && rec.anchor && <p style={{ margin: 0, fontSize: 11, color: T.creamDim }}>통합 단계에서 한 번 답하거나, 6번 답하면 켜져요.</p>}
            <button type="button" className="lg-btn" onClick={saveAndLeave} style={{ ...btnGhost, border: 'none', textDecoration: 'underline', padding: '4px 0', textAlign: 'left' }}>
              저장하고 나가기
            </button>
          </div>
        </aside>
      </div>
    </DashboardLayout>
  );
}
