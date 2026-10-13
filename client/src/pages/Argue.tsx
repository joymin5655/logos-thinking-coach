/*
 * Argue.tsx — Session 1 · 오늘의 논증
 *
 * 흐름: 입장 선택 → 이유 1~3문장(= 처음 주장) → 반문 3라운드(AI 질문, 가장 약한 고리) → 최종 정리 직접 작성
 *       → 처음/최종 채점 → Before/After + 연속 기록
 * 반문과 점수는 모두 서버 응답이다. 스코어는 완료 후에만 보인다.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import DashboardLayout from '@/components/DashboardLayout';
import {
  T, mono, serif, Label, btnPrimary, btnGhost, btnDisabled, textareaStyle, panelStyle, FocusStyle,
  TypingDots, ErrorLine, CharCount, RubricBars, DeltaRow, Quote, sans, SrLatest,
  shouldSubmitOnKey, placeholderFor, useRefocusAfterLoading, useDraft, scrollBehavior } from '@/components/logos-ui';
import { usePageMeta } from '@/lib/usePageMeta';
import { authorship } from '@/lib/authorship';
import { AuthorshipCard } from '@/components/growth/AuthorshipCard';
import { coach, errorCode, errorMessage, handleAuthError, type ApiErrorCode, type Position } from '@/lib/api';
import { todaysTopic } from '@/lib/topics';
import { useLocale, useT } from '@/i18n';
import { computeStreak, newId, recordActivity, toISODate, upsertSession, loadStore, type SessionRecord, type Turn } from '@/lib/store';

const ROUNDS_TOTAL = 3;
const MAX_MESSAGE = 1000;
const MAX_REASON = 500;
const MAX_SUMMARY = 1500;
const MIN_SUMMARY = 30;

const POS_KEY = { agree: 'Agree', disagree: 'Disagree', conditional: 'Conditional' } as const satisfies Record<Position, string>;
const POSITIONS: Position[] = ['agree', 'disagree', 'conditional'];

type Phase = 'pick' | 'reason' | 'argue' | 'summary' | 'scoring' | 'complete';
const sr = { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' } as const;
const hist = (turns: Turn[]) => turns.slice(-8).map((t) => ({ role: t.role, content: t.content }));

export default function Argue() {
  const [, navigate] = useLocation();
  const t = useT('argue');
  const { locale } = useLocale();
  // 언어를 바꾸면 같은 날의 주제를 그 언어로 다시 고른다(분야 키는 한국어 그대로 매칭)
  const topic = useMemo(() => todaysTopic(), [locale]);
  const posName = (p: Position) => t(`pos${POS_KEY[p]}`);

  const [phase, setPhase] = useState<Phase>('pick');
  const [position, setPosition] = useState<Position | null>(null);
  const [rec, setRec] = useState<SessionRecord | null>(null);
  const recRef = useRef<SessionRecord | null>(null);
  const [round, setRound] = useState(0); // 지금까지 받은 AI 반문 수
  const [input, setInput] = useState('');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState<{ error: string; code?: ApiErrorCode; message: string } | null>(null);
  const [scoringErr, setScoringErr] = useState('');
  const [scoringCode, setScoringCode] = useState<ApiErrorCode | undefined>();
  const composerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  usePageMeta('argue', { noindex: true });
  useRefocusAfterLoading(inputRef, loading);
  const rescue = useDraft('main', input, setInput);
  const summaryRescue = useDraft('summary', summary, setSummary);

  const commit = (next: SessionRecord) => {
    recRef.current = next;
    setRec(next);
    // 첫 사용자 답이 생기기 전에는 저장하지 않는다(완주율 분모 부풀림 방지)
    if (next.turns.some((t) => t.role === 'user')) upsertSession(next);
  };

  useEffect(() => { composerRef.current?.scrollIntoView({ behavior: scrollBehavior(), block: 'nearest' }); }, [rec?.turns.length, loading]);

  const begin = (pos: Position) => {
    setPosition(pos);
    commit({
      id: newId(), kind: 'argue', topic: topic.title, field: topic.field, position: pos,
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
      const res = await coach({ action: 'argue.turn', sid: base.id, topic: topic.title, position, round: nextRound, history, message });
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
      if (handleAuthError(e, navigate, () => rescue(message))) return;
      setFailed({ error: errorMessage(e), code: errorCode(e), message });
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
      latest.scoreBefore ? Promise.resolve(null) : coach({ action: 'score', sid: latest.id, kind: 'argue', text: latest.firstClaim ?? '', context: topic.title }),
      latest.scoreAfter ? Promise.resolve(null) : coach({ action: 'score', sid: latest.id, kind: 'argue', text: finalText, context: topic.title }),
    ]);
    const next: SessionRecord = { ...recRef.current! };
    const pick = (r: typeof before) => (r.status === 'fulfilled' ? r.value : null);
    const b = pick(before);
    const a = pick(after);
    if (b) next.scoreBefore = { consistency: b.consistency, evidence: b.evidence, defense: b.defense, total: b.total, rationale: b.rationale };
    if (a) { next.scoreAfter = { consistency: a.consistency, evidence: a.evidence, defense: a.defense, total: a.total, rationale: a.rationale }; next.promptVersion = a.promptVersion; }
    const authErr = [before, after].find((r): r is PromiseRejectedResult => r.status === 'rejected');
    if (authErr && handleAuthError(authErr.reason, navigate, () => summaryRescue(finalText))) {
      commit(next);
      return;
    }
    if (next.scoreBefore && next.scoreAfter) {
      next.completedAt = new Date().toISOString();
      next.stageReached = '통합';
      commit(next);
      recordActivity();
      setSummary(''); // 제출이 끝난 정리 글이 다음 논증의 초안으로 되살아나지 않게
      setPhase('complete');
    } else {
      commit(next);
      const rej = [before, after].find((r): r is PromiseRejectedResult => r.status === 'rejected');
      setScoringErr(rej ? errorMessage(rej.reason) : t('partialFail'));
      setScoringCode(rej ? errorCode(rej.reason) : undefined);
    }
  };

  const reset = () => {
    recRef.current = null;
    setRec(null); setPosition(null); setPhase('pick'); setInput(''); setSummary(''); setRound(0); setFailed(null); setScoringErr('');
  };

  /* ── PICK ── */
  if (phase === 'pick') {
    return (
      <DashboardLayout title={t('title')} titleEn={t('titleEn')}>
        <FocusStyle />
        <div style={{ maxWidth: 860, display: 'grid', gap: 24 }}>
          <div style={{ display: 'grid', gap: 10 }}>
            <Label>{t('todaysTopic', { category: topic.category })}</Label>
            <h2 style={{ fontFamily: serif, fontWeight: 600, fontSize: 'clamp(1.6rem, 3.6vw, 2.6rem)', color: T.cream, letterSpacing: '-0.02em', lineHeight: 1.2, margin: 0 }}>{topic.title}</h2>
            <p className="l-prose" style={{ fontSize: 13, color: T.creamMid, lineHeight: 1.9, maxWidth: 620, margin: 0 }}>{topic.context}</p>
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            <Label>{t('pickLabel')}</Label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              {POSITIONS.map((p) => (
                <button key={p} type="button" className="lg-btn" onClick={() => begin(p)}
                  style={{ ...panelStyle, textAlign: 'left', cursor: 'pointer', color: T.cream, display: 'grid', gap: 8 }}>
                  {t(`posTag${POS_KEY[p]}`) && (
                    <span style={{ ...{ fontFamily: mono, fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase' as const }, color: T.creamMid }}>{t(`posTag${POS_KEY[p]}`)}</span>
                  )}
                  <span style={{ fontFamily: serif, fontWeight: 600, fontSize: 22 }}>{posName(p)}</span>
                  <span className="l-prose" style={{ fontSize: 12, color: T.creamMid }}>{t(`posDesc${POS_KEY[p]}`)}</span>
                </button>
              ))}
            </div>
          </div>
          <p className="l-prose" style={{ fontSize: 12, color: T.creamMid, borderTop: `1px solid ${T.border}`, paddingTop: 14, margin: 0, lineHeight: 1.8 }}>
            {t('pickFootnote', { rounds: ROUNDS_TOTAL })}
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
      <DashboardLayout title={t('title')} titleEn={t('titleEn')}>
        <FocusStyle />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
          <div style={{ ...panelStyle, flex: '2 1 340px', display: 'grid', gap: 20 }}>
            <Label>{t('completeLabel', { pos: posName(position), topic: topic.title })}</Label>
            {rec.finalSummary && <AuthorshipCard data={authorship(rec)} />}
            <DeltaRow before={b.total} after={a.total} beforeLabel={t('beforeReason')} />
            <div style={{ display: 'grid', gap: 10 }}>
              <Quote>{t('quoteFirst', { text: rec.firstClaim ?? '' })}</Quote>
              <Quote after>{t('quoteLast', { text: rec.finalSummary ?? '' })}</Quote>
            </div>
            <RubricBars before={b} after={a} />
            <p style={{ margin: 0, fontFamily: sans, fontSize: 13, color: T.creamMid, borderLeft: `2px solid ${T.border}`, paddingLeft: 12, lineHeight: 1.7 }}>
              {t('aiEstimate')} {a.rationale}
            </p>
          </div>
          <div style={{ ...panelStyle, flex: '1 1 240px', display: 'grid', gap: 14 }}>
            <Label>{t('streak')}</Label>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontFamily: serif, fontSize: 40, color: T.cream, fontVariantNumeric: 'tabular-nums' }}>{streak.count}</span>
              <span style={{ fontFamily: mono, fontSize: 11, color: T.creamMid }}>{t('days')}</span>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: T.creamMid, lineHeight: 1.7 }}>
              {streak.freezesLeftThisWeek > 0 ? t('freezeLeft') : t('freezeUsed')}
            </p>
            <div style={{ display: 'grid', gap: 8 }}>
              <button type="button" className="lg-btn" style={btnPrimary} onClick={() => navigate('/dashboard')}>{t('goHome')}</button>
              <button type="button" className="lg-btn" style={btnGhost} onClick={() => navigate('/dashboard/session')}>{t('toCoach')}</button>
              <button type="button" className="lg-btn" style={btnGhost} onClick={reset}>{t('again')}</button>
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
      <DashboardLayout title={t('title')} titleEn={t('titleEn')}>
        <FocusStyle />
        <div style={{ maxWidth: 640, display: 'grid', gap: 16 }}>
          <div style={{ ...panelStyle, display: 'grid', gap: 14 }}>
            <Label>{t('summaryFirst', { pos: posName(position) })}</Label>
            <Quote>{rec.firstClaim}</Quote>
            <h2 style={{ fontFamily: serif, fontSize: 22, fontWeight: 600, margin: '6px 0 0', color: T.cream }}>{t('summaryHeading')}</h2>
            <p style={{ margin: 0, fontSize: 13, color: T.creamMid, lineHeight: 1.7 }}>
              {t('summaryLead', { min: MIN_SUMMARY })}
            </p>
            <label htmlFor="summary" style={sr}>{t('summaryAria')}</label>
            <textarea id="summary" className="lg-field" value={summary} onChange={(e) => setSummary(e.target.value.slice(0, MAX_SUMMARY))}
              rows={7} maxLength={MAX_SUMMARY} readOnly={phase === 'scoring'} aria-busy={phase === 'scoring'} style={textareaStyle} placeholder={t('summaryPlaceholder')} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', gap: 8, alignItems: 'center', fontFamily: mono, fontSize: 10, color: T.creamMid }}>
                <CharCount value={summary} max={MAX_SUMMARY} /> {t('minChars', { min: MIN_SUMMARY })}
              </span>
              <button type="button" className="lg-btn" onClick={() => void submitSummary()} disabled={busy || short}
                style={{ ...btnPrimary, ...(busy || short ? btnDisabled : {}) }}>
                {busy ? t('scoringBtn') : scoringErr ? t('rescoreBtn') : t('viewResult')}
              </button>
            </div>
            {busy && <TypingDots label={t('scoringDots')} />}
            {scoringErr && <ErrorLine message={scoringErr} code={scoringCode} onRetry={() => void submitSummary()} />}
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
    <DashboardLayout title={t('title')} titleEn={t('titleEn')}>
      <FocusStyle />
      <div style={{ maxWidth: 780, display: 'grid', gap: 16 }}>
        <div style={{ ...panelStyle, display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ minWidth: 0, flex: '1 1 240px' }}>
            <Label>{t('topicLabel', { category: topic.category })}</Label>
            <div style={{ fontFamily: serif, fontWeight: 600, fontSize: 16, color: T.cream, marginTop: 4, overflowWrap: 'anywhere' }}>{topic.title}</div>
          </div>
          <div style={{ fontFamily: mono, fontSize: 11, color: T.creamMid, display: 'flex', gap: 12 }}>
            <span>{t('stance')} <strong style={{ color: T.cream }}>{posName(position)}</strong></span>
            <span aria-label={t('roundAria', { n: Math.min(round + (done ? 0 : 1), ROUNDS_TOTAL), total: ROUNDS_TOTAL })}>{t('roundShort', { n: Math.min(round + (done ? 0 : 1), ROUNDS_TOTAL), total: ROUNDS_TOTAL })}</span>
          </div>
        </div>

        <SrLatest text={lastIsAi ? rec.turns[rec.turns.length - 1].content : ''} />
        <div style={{ ...panelStyle }}>
          {inReason && (
            <p style={{ margin: 0, fontFamily: serif, fontSize: 18, lineHeight: 1.7, color: T.cream }}>
              {t('reasonIntro', { pos: posName(position) })}
            </p>
          )}
          {rec.turns.map((turn, i) => {
            const ai = turn.role === 'assistant';
            return (
              <div key={i} style={{ padding: '16px 0', borderBottom: i < rec.turns.length - 1 ? `1px solid ${T.border}` : 'none', display: 'grid', gap: 6 }}>
                <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: ai ? T.creamMid : T.creamDim }}>{ai ? 'LOGOS' : t('you', { pos: posName(position) })}</span>
                <p className={ai ? undefined : 'l-prose'} style={{ margin: 0, ...(ai ? { fontFamily: serif } : {}), fontSize: ai ? 18 : 14, lineHeight: 1.7, color: ai ? T.cream : T.creamMid, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{turn.content}</p>
                {ai && turn.targetWeakness && (
                  <span style={{ fontFamily: mono, fontSize: 10, color: T.creamDim, lineHeight: 1.6 }}>{t('weakness', { text: turn.targetWeakness })}</span>
                )}
              </div>
            );
          })}
          {loading && <TypingDots />}
        </div>

        {failed && <ErrorLine message={failed.error} code={failed.code} onRetry={() => void runTurn(failed.message, false)} retryLabel={t('resendLast')} />}

        <div ref={composerRef}>
        {done ? (
          <div style={{ ...panelStyle, borderColor: T.amber, display: 'grid', gap: 10 }}>
            <p style={{ margin: 0, fontSize: 13, color: T.cream, lineHeight: 1.7 }}>{t('roundsDone', { rounds: ROUNDS_TOTAL })}</p>
            <div><button type="button" className="lg-btn" style={btnPrimary} onClick={() => setPhase('summary')}>{t('summarizeBtn')}</button></div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            <label htmlFor="argue-input" style={sr}>{inReason ? t('reasonAria') : t('argueAria')}</label>
            <textarea id="argue-input" ref={inputRef} className="lg-field" value={input} onChange={(e) => setInput(e.target.value.slice(0, max))}
              onKeyDown={(e) => { if (shouldSubmitOnKey(e)) { e.preventDefault(); submit(); } }}
              placeholder={placeholderFor(inReason ? t('reasonPlaceholder') : t('arguePlaceholder'))}
              rows={inReason ? 4 : 3} maxLength={max} readOnly={loading} aria-busy={loading} style={textareaStyle} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <CharCount value={input} max={max} />
              <button type="button" className="lg-btn" onClick={submit} disabled={loading || !input.trim()} style={{ ...btnPrimary, ...(loading || !input.trim() ? btnDisabled : {}) }}>
                {inReason ? t('submitReason') : t('send')}
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </DashboardLayout>
  );
}
