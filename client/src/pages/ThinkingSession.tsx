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
  TypingDots, ErrorLine, CharCount, RubricBars, DeltaRow, Quote, ReportBlocks, Survey, sans, SrLatest,
  shouldSubmitOnKey, placeholderFor, isCoarsePointer, useRefocusAfterLoading, useDraft, scrollBehavior } from '@/components/logos-ui';
import { usePageMeta } from '@/lib/usePageMeta';
import { track } from '@/lib/track';
import { authorship } from '@/lib/authorship';
import { AuthorshipCard } from '@/components/growth/AuthorshipCard';
import { pickResume, stageOf, stageStep } from '@/lib/resume';
import { coach, errorCode, errorMessage, handleAuthError, type ApiErrorCode, type Control, type Stage, type ScoreRes, type SessionReportRes } from '@/lib/api';
import { useT } from '@/i18n';
import { newId, recordActivity, upsertSession, useStore, type SessionRecord, type Turn } from '@/lib/store';

const STAGES: Stage[] = ['표면', '도전', '핵심', '통합'];
// 서버·저장소는 한국어 단계명을 식별자로 쓴다. 화면 표시만 번역한다.
const STAGE_KEY = { 표면: 'Surface', 도전: 'Challenge', 핵심: 'Core', 통합: 'Integrate' } as const satisfies Record<Stage, string>;
const MAX_TOPIC = 200;
const MAX_MESSAGE = 1000;
const MAX_SUMMARY = 1500;
const MIN_SUMMARY = 30;
const CONTROL_KEY = { DEEPEN: 'ctrlDeepen', ENOUGH: 'ctrlEnough', THINK: 'ctrlThink' } as const satisfies Record<Control, string>;
const CONTROL_HINT = { DEEPEN: 'hintDeepen', ENOUGH: 'hintEnough', THINK: 'hintThink' } as const satisfies Record<Control, string>;

type Phase = 'intro' | 'session' | 'summary' | 'scoring' | 'complete';
type Pending = { message: string; control?: Control };

const sr = { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' } as const;
const toScore = (s: ScoreRes) => ({ consistency: s.consistency, evidence: s.evidence, defense: s.defense, total: s.total, rationale: s.rationale });
const toReport = (r: SessionReportRes) => ({ stuckPoints: r.stuckPoints, assumptions: r.assumptions, nextQuestions: r.nextQuestions, turningPoint: r.turningPoint });
const toHistory = (turns: Turn[], n: number) => turns.slice(-n).map((t) => ({ role: t.role, content: t.content.slice(0, MAX_MESSAGE) }));
const stageIdx = (s: Stage) => STAGES.indexOf(s);

export default function ThinkingSession() {
  const [, navigate] = useLocation();
  const store = useStore();
  const t = useT('session');
  const stageName = (s: Stage) => t(`stage${STAGE_KEY[s]}`);
  const [phase, setPhase] = useState<Phase>('intro');
  const [topic, setTopic] = useState('');
  const [rec, setRec] = useState<SessionRecord | null>(null);
  const recRef = useRef<SessionRecord | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState<{ error: string; code?: ApiErrorCode; retry: Pending } | null>(null);
  const [thinkOffer, setThinkOffer] = useState(false);
  const [summary, setSummary] = useState('');
  const [scoringErr, setScoringErr] = useState('');
  const [scoringCode, setScoringCode] = useState<ApiErrorCode | undefined>();
  const composerRef = useRef<HTMLDivElement>(null);
  const msgRef = useRef<HTMLTextAreaElement>(null);
  const topicRef = useRef<HTMLTextAreaElement>(null);
  usePageMeta('session', { noindex: true });
  useRefocusAfterLoading(msgRef, loading);
  const rescue = useDraft('msg', input, setInput);
  const summaryRescue = useDraft('summary', summary, setSummary);

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
    composerRef.current?.scrollIntoView({ behavior: scrollBehavior(), block: 'nearest' });
  }, [rec?.turns.length, loading]);

  const resumable = useMemo(() => pickResume(store), [store.sessions]);
  // 세션 화면이 열린 것 — 첫 답변 전 이탈(admin_abandon) 측정용. 이어갈 세션이 있으면 resume:true(새 답변 기록이 없는 게 정상이라 이탈 집계에서 뺀다.
  // 인트로에서 새로 시작해도 보수적으로 제외된다 — 이탈을 과대 집계하는 쪽보다 낫다).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { track('session_open', { resume: !!resumable }); }, []);

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
    const text = topic.trim();
    if (!text) return;
    const now = new Date().toISOString();
    commit({
      id: newId(), kind: 'session', topic: text, startedAt: now, stageReached: '표면',
      turns: [{ role: 'assistant', content: t('firstQuestion'), at: now, stage: '표면' }],
      promptVersion: '',
    });
    setPhase('session');
  };

  const resume = (s: SessionRecord) => {
    recRef.current = s;
    setRec(s);
    setTopic(s.topic);
    // 복원된 정리 초안이 있으면 그것을 우선한다(401로 튕겼다 돌아온 경우)
    setSummary((v) => (v.trim() ? v : s.finalSummary ?? ''));
    // 마지막 저장 턴이 사용자 턴이면 답을 못 받은 채 끊긴 것 — 재시도 상태로 복원
    const last = s.turns[s.turns.length - 1];
    // 같은 글이 입력창 초안과 재시도 버튼에 동시에 남으면 두 번 보낼 수 있다
    if (last?.role === 'user') setInput((v) => (v.trim() === last.content.trim() ? '' : v));
    setFailed(last?.role === 'user' ? { error: t('resumeFailed'), retry: { message: last.content, control: last.control } } : null);
    setPhase('session');
  };

  // 대시보드 "이어서 하기"가 ?resume=<id>로 들어오면 인트로를 건너뛰고 바로 복원한다
  const resumedFromUrl = useRef(false);
  useEffect(() => {
    if (resumedFromUrl.current || !resumable || phase !== 'intro') return;
    const id = new URLSearchParams(window.location.search).get('resume');
    if (id && id === resumable.id) {
      resumedFromUrl.current = true;
      resume(resumable);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumable]);

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
      if (handleAuthError(e, navigate, () => rescue(message))) return;
      setFailed({ error: errorMessage(e), code: errorCode(e), retry: { message, control } });
    } finally {
      setLoading(false);
    }
  };

  const send = (control?: Control) => {
    const text = input.trim();
    if (loading || !rec) return;
    if (!rec.anchor && !text) return; // 첫 답은 직접 써야 한다
    const message = text || (control ? t(CONTROL_KEY[control]) : '');
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
    if (firstErr && handleAuthError(firstErr.reason, navigate, () => summaryRescue(finalText))) {
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
      setScoringErr(firstErr ? errorMessage(firstErr.reason) : t('partialFail'));
      setScoringCode(firstErr ? errorCode(firstErr.reason) : undefined);
    }
  };

  const saveAndLeave = () => {
    toast(t('savedToast'));
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
    const examples = [
      { tag: 'tagWorry', text: 'ex1' },
      { tag: 'tagDecision', text: 'ex2' },
      { tag: 'tagClaim', text: 'ex3' },
      { tag: 'tagClaim', text: 'ex4' },
    ] as const;
    return (
      <DashboardLayout title={t('title')} titleEn={t('titleEn')} aiNotice>
        <FocusStyle />
        <div style={{ maxWidth: 640, display: 'grid', gap: 18 }}>
          <div style={{ display: 'grid', gap: 6 }}>
            <h2 style={{ fontFamily: serif, fontSize: 28, fontWeight: 600, color: T.cream, lineHeight: 1.2, margin: 0 }}>{t('introHeading2')}</h2>
            <p className="l-prose" style={{ fontSize: 13, color: T.creamMid, margin: 0 }}>{t('introNote')}</p>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            <label htmlFor="topic" style={sr}>{t('topicAria')}</label>
            <textarea
              id="topic"
              ref={topicRef}
              className="lg-field"
              value={topic}
              onChange={(e) => setTopic(e.target.value.slice(0, MAX_TOPIC))}
              onKeyDown={(e) => { if (shouldSubmitOnKey(e)) { e.preventDefault(); startSession(); } }}
              placeholder={t('topicPlaceholder')}
              maxLength={MAX_TOPIC}
              rows={3}
              style={{ ...textareaStyle, resize: 'none' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <CharCount value={topic} max={MAX_TOPIC} />
                {!isCoarsePointer() && <span style={{ fontFamily: mono, fontSize: 11, color: T.creamDim }}>{t('introEnterHint')}</span>}
              </span>
              <button type="button" className="lg-btn" onClick={startSession} disabled={!topic.trim()} style={{ ...btnPrimary, ...(topic.trim() ? {} : btnDisabled) }}>
                {t('startBtn')}
              </button>
            </div>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            <Label>{t('exampleLabel')}</Label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {examples.map((ex) => (
                <button
                  key={ex.text} type="button" className="lg-btn"
                  onClick={() => { setTopic(t(ex.text).slice(0, MAX_TOPIC)); topicRef.current?.focus(); }}
                  style={{ ...btnGhost, textTransform: 'none', letterSpacing: 'normal', textAlign: 'left', display: 'inline-flex', gap: 8, alignItems: 'baseline', fontFamily: 'var(--font-body)', fontWeight: 400 }}
                >
                  <span style={{ fontFamily: mono, fontSize: 10, color: T.creamMid }}>{t(ex.tag)}</span>
                  <span style={{ fontSize: 13 }}>{t(ex.text)}</span>
                </button>
              ))}
            </div>
          </div>
          {resumable && (
            <button
              type="button" className="lg-btn" onClick={() => resume(resumable)}
              style={{ border: `1px dashed ${T.borderMid}`, background: 'none', color: T.cream, padding: '12px 14px', textAlign: 'left', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, overflowWrap: 'anywhere' }}
            >
              {t('resumeRow', { topic: resumable.topic, n: stageStep(resumable) })}
            </button>
          )}
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
      <DashboardLayout title={t('summaryTitle')} titleEn={t('summaryTitleEn')} aiNotice>
        <FocusStyle />
        <div style={{ maxWidth: 640, margin: '24px auto', display: 'grid', gap: 16 }}>
          <div style={{ ...panelStyle, display: 'grid', gap: 14 }}>
            <Label>{t('firstClaimLabel')}</Label>
            <Quote>{rec.firstClaim}</Quote>
            <h2 style={{ fontFamily: serif, fontSize: 22, fontWeight: 600, margin: '6px 0 0', color: T.cream }}>{t('nowThink')}</h2>
            <p style={{ margin: 0, fontSize: 13, color: T.creamMid, lineHeight: 1.7 }}>
              {t('summaryLead', { min: MIN_SUMMARY })}
            </p>
            <label htmlFor="summary" style={sr}>{t('summaryAria')}</label>
            <textarea
              id="summary"
              className="lg-field"
              value={summary}
              onChange={(e) => setSummary(e.target.value.slice(0, MAX_SUMMARY))}
              readOnly={phase === 'scoring'}
              aria-busy={phase === 'scoring'}
              rows={7}
              maxLength={MAX_SUMMARY}
              placeholder={t('summaryPlaceholder')}
              style={textareaStyle}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', gap: 8, alignItems: 'center', fontFamily: mono, fontSize: 10, color: T.creamMid }}>
                <CharCount value={summary} max={MAX_SUMMARY} /> {t('minChars', { min: MIN_SUMMARY })}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                {phase === 'summary' && (
                  <button type="button" className="lg-btn" style={btnGhost} onClick={() => setPhase('session')}>{t('backToChat')}</button>
                )}
                <button
                  type="button" className="lg-btn"
                  onClick={() => void submitSummary()}
                  disabled={busy || short}
                  style={{ ...btnPrimary, ...(busy || short ? btnDisabled : {}) }}
                >
                  {busy ? t('scoringBtn') : scoringErr ? t('rescoreBtn') : t('viewResult')}
                </button>
              </div>
            </div>
            {busy && <TypingDots label={t('scoringDots')} />}
            {scoringErr && <ErrorLine message={scoringErr} code={scoringCode} onRetry={() => void submitSummary()} />}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  /* ───────── COMPLETE ───────── */
  if (phase === 'complete' && rec.scoreBefore && rec.scoreAfter && rec.report) {
    const { scoreBefore: b, scoreAfter: a, report } = rec;
    return (
      <DashboardLayout title={t('reportTitle')} titleEn={t('reportTitleEn')} aiNotice>
        <FocusStyle />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
          <div style={{ ...panelStyle, flex: '1 1 340px', display: 'grid', gap: 20 }}>
            <Label>{t('reportTopic', { topic: rec.topic })}</Label>
            {rec.finalSummary && <AuthorshipCard data={authorship(rec)} />}
            <DeltaRow before={b.total} after={a.total} />
            <div style={{ display: 'grid', gap: 10 }}>
              <Quote>{t('quoteFirst', { text: rec.firstClaim ?? '' })}</Quote>
              <Quote after>{t('quoteLast', { text: rec.finalSummary ?? '' })}</Quote>
            </div>
            <RubricBars before={b} after={a} />
            <p style={{ margin: 0, fontFamily: sans, fontSize: 13, color: T.creamMid, borderLeft: `2px solid ${T.border}`, paddingLeft: 12, lineHeight: 1.7 }}>
              {t('aiEstimate')} {a.rationale}
            </p>
          </div>
          <div style={{ ...panelStyle, flex: '1 1 340px', display: 'grid', gap: 20 }}>
            <Label>{t('reportLead')}</Label>
            <ReportBlocks report={report} />
            <Survey value={rec.survey} onChange={(v) => patch({ survey: v })} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button type="button" className="lg-btn" style={btnPrimary} onClick={reset}>{t('newSession')}</button>
              <button type="button" className="lg-btn" style={btnGhost} onClick={() => navigate('/dashboard/history')}>{t('history')}</button>
              <button type="button" className="lg-btn" style={btnGhost} onClick={() => navigate('/dashboard')}>{t('home')}</button>
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

  // ≤640px에서는 사이드 패널이 입력창 아래로 밀리므로, 입력창 위에 같은 조절 버튼을 한 줄로 둔다.
  const controlsRow = (cls: string) => (
    <div className={cls} role="group" aria-label={t('controls')} style={{ gap: 6 }}>
      {(['DEEPEN', 'ENOUGH', 'THINK'] as Control[]).map((c) => (
        <button
          key={c} type="button" className="lg-btn"
          onClick={() => send(c)}
          disabled={controlsDisabled}
          style={{ ...btnGhost, flex: 1, padding: '8px 6px', letterSpacing: '0.02em', textTransform: 'none', ...(controlsDisabled ? btnDisabled : {}) }}
        >
          {t(CONTROL_KEY[c])}
        </button>
      ))}
    </div>
  );

  return (
    <DashboardLayout title={t('title')} titleEn={t('titleEn')} aiNotice>
      <FocusStyle />
      <style>{`.lg-ctrl-compact{display:none}.lg-ctrl-full{display:grid}
@media (max-width:640px){.lg-ctrl-compact{display:flex}.lg-ctrl-full{display:none}}
@media (min-width:641px){.lg-sticky-aside{position:sticky;top:76px;max-height:calc(100dvh / var(--ui-scale, 1) - 92px);overflow-y:auto}}`}</style>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
        <div style={{ flex: '2 1 360px', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 6, flexWrap: 'wrap' }}>
            <Label>{t('subject')}</Label>
            <span style={{ fontFamily: mono, fontSize: 12, color: T.creamMid, overflowWrap: 'anywhere' }}>{rec.topic}</span>
          </div>
          <SrLatest text={lastTurn?.role === 'assistant' ? lastTurn.content : ''} />
          <div>
            {rec.turns.map((turn, i) => {
              const ai = turn.role === 'assistant';
              return (
                <div
                  key={i}
                  className="lg-fade"
                  style={{ padding: '20px 0', borderBottom: `1px solid ${T.border}`, animation: 'lg-fade 0.25s ease', ...(ai && turn.aporia ? { borderLeft: `2px dashed ${T.amber}`, paddingLeft: 14 } : {}) }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: ai ? T.creamMid : T.creamDim }}>{ai ? 'LOGOS' : t('you')}</span>
                    {ai && turn.stage && (
                      <span style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.22em', color: T.creamDim, padding: '2px 6px', border: `1px solid ${T.border}` }}>{t(`stageTag${STAGE_KEY[turn.stage]}`)}</span>
                    )}
                    {ai && turn.aporia && (
                      <span style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.18em', color: T.amber }}>{t('recovery')}</span>
                    )}
                    {!ai && turn.control && (
                      <span style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.18em', color: T.creamDim, padding: '2px 6px', border: `1px solid ${T.border}` }}>{t(CONTROL_KEY[turn.control])}</span>
                    )}
                  </div>
                  <p className={ai ? undefined : 'l-prose'} style={{ margin: 0, ...(ai ? { fontFamily: serif } : {}), fontSize: ai ? 18 : 14, lineHeight: 1.7, color: ai ? T.cream : T.creamMid, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{turn.content}</p>
                </div>
              );
            })}
            {loading && <TypingDots />}
          </div>

          {failed && (
            <div style={{ marginTop: 12 }}>
              <ErrorLine message={failed.error} code={failed.code} onRetry={() => void runTurn(failed.retry.message, failed.retry.control, false)} retryLabel={t('resendLast')} />
            </div>
          )}

          {thinkOffer && !loading && (
            <div style={{ ...panelStyle, marginTop: 12, display: 'grid', gap: 10 }}>
              <p style={{ margin: 0, fontSize: 13, color: T.cream, lineHeight: 1.7 }}>{t('thinkOffer')}</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" className="lg-btn" style={btnPrimary} onClick={saveAndLeave}>{t('saveLeave')}</button>
                <button type="button" className="lg-btn" style={btnGhost} onClick={() => setThinkOffer(false)}>{t('keepGoing')}</button>
              </div>
            </div>
          )}

          {showSynthesisPrompt && (
            <div style={{ ...panelStyle, marginTop: 12, borderColor: T.amber, display: 'grid', gap: 10 }}>
              <p style={{ margin: 0, fontSize: 13, color: T.cream, lineHeight: 1.7 }}>
                {t('synthPrompt')}
              </p>
              <div><button type="button" className="lg-btn" style={btnPrimary} onClick={() => setPhase('summary')}>{t('summarizeBtn')}</button></div>
            </div>
          )}

          <div ref={composerRef} style={{ marginTop: 16, display: 'grid', gap: 8 }}>
            {controlsRow('lg-ctrl-compact')}
            <label htmlFor="msg" style={sr}>{t('msgAria')}</label>
            <textarea
              id="msg"
              ref={msgRef}
              className="lg-field"
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, MAX_MESSAGE))}
              onKeyDown={(e) => { if (shouldSubmitOnKey(e)) { e.preventDefault(); send(); } }}
              placeholder={placeholderFor(needsFirstAnswer ? t('firstPlaceholder') : t('msgPlaceholder'))}
              rows={3}
              maxLength={MAX_MESSAGE}
              readOnly={loading}
              aria-busy={loading}
              style={textareaStyle}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <CharCount value={input} max={MAX_MESSAGE} />
              <button type="button" className="lg-btn" onClick={() => send()} disabled={loading || !input.trim()} style={{ ...btnPrimary, ...(loading || !input.trim() ? btnDisabled : {}) }}>
                {t('send')}
              </button>
            </div>
          </div>
        </div>

        <aside className="lg-sticky-aside" style={{ flex: '1 1 260px', maxWidth: '100%', display: 'grid', gap: 16 }}>
          <div style={{ ...panelStyle, display: 'grid', gap: 12 }}>
            <Label>{t('progress')}</Label>
            <div style={{ display: 'flex', gap: 6 }} role="img" aria-label={t('stageAria', { n: stageIdx(currentStage) + 1, stage: stageName(currentStage) })}>
              {STAGES.map((s, i) => (
                <span key={s} style={{ height: 3, flex: 1, backgroundColor: i <= stageIdx(currentStage) ? T.cream : T.border }} />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: mono, fontSize: 10 }}>
              {STAGES.map((s) => (
                <span key={s} style={{ color: s === currentStage ? T.cream : T.creamDim, fontWeight: s === currentStage ? 700 : 400 }}>{stageName(s)}</span>
              ))}
            </div>
            <p style={{ margin: 0, fontSize: 12, color: T.creamMid }}>{t(`stageDesc${STAGE_KEY[currentStage]}`)}</p>
          </div>

          <div className="lg-ctrl-full" style={{ ...panelStyle, gap: 8 }}>
            <Label>{t('controls')}</Label>
            {(['DEEPEN', 'ENOUGH', 'THINK'] as Control[]).map((c) => (
              <button
                key={c} type="button" className="lg-btn"
                onClick={() => send(c)}
                disabled={controlsDisabled}
                style={{ ...btnGhost, textAlign: 'left', display: 'grid', gap: 2, letterSpacing: '0.04em', textTransform: 'none', ...(controlsDisabled ? btnDisabled : {}) }}
              >
                <span style={{ fontWeight: 700 }}>{t(CONTROL_KEY[c])}</span>
                <span style={{ fontSize: 11, color: T.creamMid }}>{t(CONTROL_HINT[c])}</span>
              </button>
            ))}
            {needsFirstAnswer && <p style={{ margin: 0, fontSize: 11, color: T.creamDim }}>{t('needFirst')}</p>}
          </div>

          <div style={{ ...panelStyle, display: 'grid', gap: 8 }}>
            <Label>{t('firstConviction')}</Label>
            {rec.anchor ? <Quote>{rec.anchor}</Quote> : <p style={{ margin: 0, fontSize: 12, color: T.creamDim }}>{t('none')}</p>}
            <button
              type="button" className="lg-btn"
              onClick={() => setPhase('summary')}
              disabled={!canSummarize || loading}
              style={{ ...btnGhost, marginTop: 4, ...(!canSummarize || loading ? btnDisabled : {}) }}
            >
              {t('summarizeBtn')}
            </button>
            {!canSummarize && rec.anchor && <p style={{ margin: 0, fontSize: 11, color: T.creamDim }}>{t('summarizeHint')}</p>}
            <button type="button" className="lg-btn" onClick={saveAndLeave} style={{ ...btnGhost, border: 'none', textDecoration: 'underline', padding: '4px 0', textAlign: 'left' }}>
              {t('saveLeave')}
            </button>
          </div>
        </aside>
      </div>
    </DashboardLayout>
  );
}
