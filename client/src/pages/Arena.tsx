/*
 * Arena.tsx — 토론 아레나 (AI 상대)
 *
 * 흐름: 주제 선택 → 입장 선택 → 3라운드(사용자 발언 → AI 반박) → AI 판정 → 결과(전적)
 * 반박과 판정은 모두 서버 응답이다(/api/coach arena.turn · arena.judge).
 * 한 판의 sid는 판마다 새로 만들고 재시도에도 그대로 쓴다.
 */
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'wouter';
import DashboardLayout from '@/components/DashboardLayout';
import {
  T, mono, serif, sans, Label, btnPrimary, btnGhost, btnDisabled, textareaStyle, panelStyle, FocusStyle,
  TypingDots, ErrorLine, CharCount, Quote,
} from '@/components/logos-ui';
import { coach, errorMessage, handleAuthError, type ArenaSide } from '@/lib/api';
import { SEMANTIC, SEMANTIC_DARK } from '@/lib/colors';
import { useTheme } from '@/contexts/ThemeContext';
import { arenaRecord, loadStore, newId, recordActivity, upsertArena, type ArenaRecord } from '@/lib/store';
import { useLocale, useT } from '@/i18n';
import { ARENA_TOPICS, type ArenaDifficulty, type ArenaTopic } from '../../../shared/arenaTopics';

const ROUNDS_TOTAL = 3;
const MAX_MESSAGE = 1000;

type Step = 'topic' | 'side' | 'debate';
type Failure = { kind: 'turn'; error: string; message: string } | { kind: 'judge'; error: string };

const DIFF_KEY = { easy: 'diffEasy', medium: 'diffMedium', hard: 'diffHard' } as const;
const DIFF_DOTS: Record<ArenaDifficulty, number> = { easy: 1, medium: 2, hard: 3 };
const VERDICT_KEY = { win: 'verdictWin', draw: 'verdictDraw', lose: 'verdictLose' } as const;
const AXES = [
  { key: 'consistency', label: 'axisConsistency', max: 30 },
  { key: 'evidence', label: 'axisEvidence', max: 40 },
  { key: 'defense', label: 'axisDefense', max: 30 },
] as const;
const sr = { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' } as const;
const tiny = { fontFamily: mono, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase' } as const;

export default function Arena() {
  const t = useT('arena');
  const sem = useTheme().theme === 'dark' ? SEMANTIC : SEMANTIC_DARK; // 라이트 배경에서는 명도를 낮춘 팔레트
  const { locale } = useLocale();
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>('topic');
  const [topic, setTopic] = useState<ArenaTopic | null>(null);
  const [side, setSide] = useState<ArenaSide | null>(null);
  const [rec, setRec] = useState<ArenaRecord | null>(null);
  const recRef = useRef<ArenaRecord | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState<Failure | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const commit = (next: ArenaRecord) => {
    recRef.current = next;
    setRec(next);
    // 첫 사용자 발언이 생기기 전에는 저장하지 않는다(시작만 하고 나간 판은 기록하지 않음)
    if (next.turns.some((x) => x.role === 'user')) upsertArena(next);
  };

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [rec?.turns.length, loading]);

  const sideLabel = (s: ArenaSide) => t(s);
  const tt = (tp: ArenaTopic) => tp[locale];

  const begin = (s: ArenaSide) => {
    if (!topic) return;
    setSide(s);
    setStep('debate');
    recRef.current = { id: newId(), topicId: topic.id, side: s, startedAt: new Date().toISOString(), turns: [] };
    setRec(recRef.current);
  };

  const judge = async () => {
    const cur = recRef.current;
    if (!cur) return;
    setLoading(true);
    setFailed(null);
    try {
      const res = await coach({
        action: 'arena.judge', sid: cur.id, topicId: cur.topicId, side: cur.side,
        transcript: cur.turns.map((x) => ({ role: x.role, content: x.content })),
      });
      const latest = recRef.current;
      if (!latest || latest.id !== cur.id) return;
      commit({
        ...latest,
        completedAt: new Date().toISOString(),
        promptVersion: res.promptVersion,
        result: {
          consistency: res.consistency, evidence: res.evidence, defense: res.defense, total: res.total,
          verdict: res.verdict, rationale: res.rationale, lessons: res.lessons,
        },
      });
      recordActivity();
    } catch (e) {
      if (handleAuthError(e, navigate)) return;
      setFailed({ kind: 'judge', error: errorMessage(e) });
    } finally {
      setLoading(false);
    }
  };

  /** addUser=false면 이미 기록된 마지막 사용자 발언으로 다시 요청한다(재시도). */
  const runTurn = async (message: string, addUser: boolean) => {
    const cur = recRef.current;
    if (!cur || loading) return;
    setLoading(true);
    setFailed(null);
    let base = cur;
    if (addUser) {
      base = { ...cur, turns: [...cur.turns, { role: 'user', content: message, at: new Date().toISOString() }] };
      commit(base);
    }
    const prior = base.turns.slice(0, -1).map((x) => ({ role: x.role, content: x.content }));
    const round = base.turns.filter((x) => x.role === 'user').length;
    let ok = false;
    try {
      const res = await coach({ action: 'arena.turn', sid: base.id, topicId: base.topicId, side: base.side, round, history: prior, message });
      const latest = recRef.current;
      if (!latest || latest.id !== base.id) return;
      commit({
        ...latest,
        promptVersion: res.promptVersion,
        turns: [...latest.turns, { role: 'assistant', content: res.argument, at: new Date().toISOString(), targetsClaim: res.targetsClaim }],
      });
      ok = round >= ROUNDS_TOTAL;
    } catch (e) {
      if (handleAuthError(e, navigate)) return;
      setFailed({ kind: 'turn', error: errorMessage(e), message });
    } finally {
      setLoading(false);
    }
    if (ok) void judge();
  };

  const submit = () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    void runTurn(text, true);
  };

  const reset = () => {
    recRef.current = null;
    setRec(null); setTopic(null); setSide(null); setStep('topic'); setInput(''); setFailed(null); setLoading(false);
  };

  const layout = (children: React.ReactNode) => (
    <DashboardLayout title={t('pageTitle')} titleEn="Arena">
      <FocusStyle />
      {children}
    </DashboardLayout>
  );

  /* ── 주제 선택 ── */
  if (step === 'topic') {
    return layout(
      <div style={{ maxWidth: 900, display: 'grid', gap: 20 }}>
        <div style={{ display: 'grid', gap: 8 }}>
          <Label>{t('topicLabel')}</Label>
          <p style={{ fontFamily: mono, fontSize: 12, color: T.creamMid, lineHeight: 1.9, margin: 0, maxWidth: 620 }}>{t('topicIntro')}</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {ARENA_TOPICS.map((tp) => {
            const l = tt(tp);
            return (
              <button key={tp.id} type="button" className="lg-btn" onClick={() => { setTopic(tp); setStep('side'); }}
                style={{ ...panelStyle, textAlign: 'left', cursor: 'pointer', color: T.cream, display: 'grid', gap: 8, alignContent: 'start' }}>
                <span style={{ display: 'flex', gap: 10, alignItems: 'center', ...tiny, color: T.creamMid }}>
                  <span aria-label={t(DIFF_KEY[tp.difficulty])}>
                    {'●'.repeat(DIFF_DOTS[tp.difficulty])}<span style={{ color: T.creamDim }}>{'●'.repeat(3 - DIFF_DOTS[tp.difficulty])}</span> {t(DIFF_KEY[tp.difficulty])}
                  </span>
                  <span>{l.category}</span>
                  {tp.hot && <span style={{ marginLeft: 'auto', color: T.amber }}>{t('hot')}</span>}
                </span>
                <span style={{ fontFamily: serif, fontWeight: 600, fontSize: 17, lineHeight: 1.35 }}>{l.title}</span>
                <span style={{ fontFamily: mono, fontSize: 11, color: T.creamMid, lineHeight: 1.7 }}>{l.description}</span>
              </button>
            );
          })}
          <div aria-disabled="true" style={{ ...panelStyle, borderStyle: 'dashed', opacity: 0.6, display: 'grid', gap: 8, alignContent: 'start', cursor: 'not-allowed' }}>
            <span style={{ ...tiny, color: T.creamMid }}>{t('userVsUserSoon')}</span>
            <span style={{ fontFamily: serif, fontWeight: 600, fontSize: 17, color: T.cream }}>{t('userVsUser')}</span>
          </div>
        </div>
      </div>,
    );
  }

  if (!topic) return null;
  const tl = tt(topic);

  /* ── 입장 선택 ── */
  if (step === 'side') {
    return layout(
      <div style={{ maxWidth: 760, display: 'grid', gap: 20 }}>
        <div><button type="button" className="lg-btn" onClick={() => { setStep('topic'); setTopic(null); }} style={{ ...btnGhost, padding: '6px 14px', fontSize: 10 }}>{t('backToTopic')}</button></div>
        <div style={{ ...panelStyle, display: 'grid', gap: 8 }}>
          <Label>{t('selectedTopic')} · {tl.category}</Label>
          <h2 style={{ fontFamily: serif, fontWeight: 600, fontSize: 22, color: T.cream, margin: 0, lineHeight: 1.3 }}>{tl.title}</h2>
          <p style={{ fontFamily: mono, fontSize: 11, color: T.creamMid, lineHeight: 1.7, margin: 0 }}>{tl.description}</p>
        </div>
        <div style={{ display: 'grid', gap: 10 }}>
          <Label>{t('sideLabel')}</Label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {(['pro', 'con'] as const).map((s) => (
              <button key={s} type="button" className="lg-btn" onClick={() => begin(s)}
                style={{ ...panelStyle, textAlign: 'left', cursor: 'pointer', color: T.cream, display: 'grid', gap: 8 }}>
                <span style={{ fontFamily: serif, fontWeight: 600, fontSize: 24 }}>{t(s)}</span>
                <span style={{ fontFamily: mono, fontSize: 11, color: T.creamMid, lineHeight: 1.7 }}>{t(s === 'pro' ? 'proDesc' : 'conDesc')}</span>
              </button>
            ))}
          </div>
        </div>
        <p style={{ fontFamily: mono, fontSize: 11, color: T.creamMid, borderTop: `1px solid ${T.border}`, paddingTop: 14, margin: 0, lineHeight: 1.8 }}>
          {t('sideNote', { total: ROUNDS_TOTAL, max: MAX_MESSAGE })}
        </p>
      </div>,
    );
  }

  if (!rec || !side) return null;

  /* ── 결과 ── */
  const res = rec.result;
  if (res) {
    const store = loadStore();
    const arenas = store.arenas ?? [];
    const wdl = arenaRecord(arenas);
    const prior = arenas.filter((a) => a.id !== rec.id && a.result);
    const avg = prior.length ? Math.round(prior.reduce((s, a) => s + (a.result?.total ?? 0), 0) / prior.length) : null;
    const diff = avg === null ? 0 : res.total - avg;
    const lessons = res.lessons.filter((l) => l.lesson.trim() || l.quote.trim());
    return layout(
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
        <div style={{ ...panelStyle, flex: '2 1 340px', display: 'grid', gap: 20 }}>
          <Label>{t('resultFor', { side: sideLabel(side), topic: tl.title })}</Label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div style={{ display: 'grid', gap: 4 }}>
              <Label>{t('total')}</Label>
              <span style={{ fontFamily: serif, fontSize: 52, lineHeight: 1, color: T.cream, fontVariantNumeric: 'tabular-nums' }}>{res.total}</span>
            </div>
            <div style={{ display: 'grid', gap: 6, justifyItems: 'end' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: `1px solid ${T.borderMid}`, padding: '6px 14px', fontFamily: serif, fontSize: 20, fontWeight: 600, color: T.cream }}>
                <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: sem[res.verdict] }} />
                {t(VERDICT_KEY[res.verdict])}
              </span>
              <span style={{ fontFamily: mono, fontSize: 10, color: T.creamMid }}>{t('thresholds')}</span>
            </div>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            {AXES.map((ax) => (
              <div key={ax.key} style={{ display: 'grid', gridTemplateColumns: 'minmax(6.5em, 9em) 1fr auto', gap: 10, alignItems: 'center', fontSize: 13, color: T.cream }}>
                <span>{t(ax.label)}</span>
                <span role="img" aria-label={`${t(ax.label)} ${res[ax.key]} / ${ax.max}`} style={{ height: 8, backgroundColor: T.faint, position: 'relative', display: 'block' }}>
                  <i style={{ position: 'absolute', inset: '0 auto 0 0', width: `${Math.min(100, (res[ax.key] / ax.max) * 100)}%`, backgroundColor: T.accent }} />
                </span>
                <span style={{ fontFamily: mono, fontSize: 12, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{res[ax.key]} / {ax.max}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            <Label>{t('rationale')}</Label>
            <p style={{ margin: 0, fontFamily: sans, fontSize: 13, color: T.creamMid, borderLeft: `2px solid ${T.border}`, paddingLeft: 12, lineHeight: 1.7 }}>
              {res.rationale} <span style={{ color: T.creamDim }}>{t('aiEstimate')}</span>
            </p>
          </div>
          {lessons.length > 0 && (
            <div style={{ display: 'grid', gap: 14 }}>
              <Label>{t('lessons')}</Label>
              {lessons.map((l, i) => (
                <div key={i} style={{ display: 'grid', gap: 8 }}>
                  {l.quote.trim() && <Quote>"{l.quote}"</Quote>}
                  <p style={{ margin: 0, fontFamily: sans, fontSize: 13, color: T.cream, lineHeight: 1.7, overflowWrap: 'anywhere' }}>{l.lesson}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ ...panelStyle, flex: '1 1 240px', display: 'grid', gap: 14 }}>
          <Label>{t('record')}</Label>
          <span style={{ fontFamily: serif, fontSize: 30, color: T.cream, fontVariantNumeric: 'tabular-nums' }}>{t('recordLine', { w: wdl.w, d: wdl.d, l: wdl.l })}</span>
          <p style={{ margin: 0, fontSize: 12, color: T.creamMid, lineHeight: 1.7 }}>
            {avg === null
              ? t('firstMatch', { n: res.total })
              : t('vsAverage', { n: res.total, avg, diff: diff > 0 ? `+${diff}` : String(diff) })}
          </p>
          <div style={{ display: 'grid', gap: 8 }}>
            <button type="button" className="lg-btn" style={btnPrimary} onClick={reset}>{t('again')}</button>
          </div>
        </div>
      </div>,
    );
  }

  /* ── 토론 ── */
  const userCount = rec.turns.filter((x) => x.role === 'user').length;
  const lastIsAi = rec.turns[rec.turns.length - 1]?.role === 'assistant';
  const finished = userCount >= ROUNDS_TOTAL && lastIsAi;
  const roundNow = Math.min(Math.max(userCount, 1), ROUNDS_TOTAL);
  const awaitingReply = rec.turns.length > 0 && !lastIsAi;
  const canWrite = !finished && !awaitingReply && !loading;
  return layout(
    <div style={{ maxWidth: 780, display: 'grid', gap: 16 }}>
      <div style={{ ...panelStyle, display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ minWidth: 0, flex: '1 1 240px' }}>
          <Label>{tl.category}</Label>
          <div style={{ fontFamily: serif, fontWeight: 600, fontSize: 16, color: T.cream, marginTop: 4, overflowWrap: 'anywhere' }}>{tl.title}</div>
        </div>
        <div style={{ fontFamily: mono, fontSize: 11, color: T.creamMid, display: 'flex', gap: 12 }}>
          <span>{t('side')} <strong style={{ color: T.cream }}>{sideLabel(side)}</strong></span>
          <span aria-label={t('roundAria', { n: roundNow, total: ROUNDS_TOTAL })}>{t('roundCount', { n: roundNow, total: ROUNDS_TOTAL })}</span>
        </div>
      </div>

      <div style={panelStyle} aria-live="polite">
        {rec.turns.length === 0 && (
          <p style={{ margin: 0, fontFamily: serif, fontSize: 18, lineHeight: 1.7, color: T.cream }}>{t('firstPrompt', { side: sideLabel(side) })}</p>
        )}
        {rec.turns.map((turn, i) => {
          const ai = turn.role === 'assistant';
          const claim = turn.targetsClaim;
          return (
            <div key={i} style={{ padding: '16px 0', borderBottom: i < rec.turns.length - 1 ? `1px solid ${T.border}` : 'none', display: 'grid', gap: 6 }}>
              <span style={{ ...tiny, color: ai ? T.creamMid : T.creamDim }}>{ai ? t('opponent') : t('you', { side: sideLabel(side) })}</span>
              <p style={{ margin: 0, fontFamily: ai ? serif : mono, fontSize: ai ? 18 : 14, lineHeight: 1.7, color: ai ? T.cream : T.creamMid, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{turn.content}</p>
              {ai && claim && <span style={{ fontFamily: mono, fontSize: 10, color: T.creamDim, lineHeight: 1.6 }}>{t('targets', { claim })}</span>}
            </div>
          );
        })}
        {loading && <TypingDots label={finished ? t('judging') : t('thinking')} />}
        <div ref={endRef} />
      </div>

      {failed?.kind === 'turn' && <ErrorLine message={failed.error} onRetry={() => void runTurn(failed.message, false)} retryLabel={t('retryTurn')} />}
      {failed?.kind === 'judge' && <ErrorLine message={failed.error} onRetry={() => void judge()} retryLabel={t('retryJudge')} />}

      {!finished && (
        <div style={{ display: 'grid', gap: 8 }}>
          <label htmlFor="arena-input" style={sr}>{t('inputLabel')}</label>
          <textarea id="arena-input" className="lg-field" value={input} onChange={(e) => setInput(e.target.value.slice(0, MAX_MESSAGE))}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !e.nativeEvent.isComposing) submit(); }}
            placeholder={t('placeholder')} rows={4} maxLength={MAX_MESSAGE} disabled={!canWrite} style={textareaStyle} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <CharCount value={input} max={MAX_MESSAGE} />
            <button type="button" className="lg-btn" onClick={submit} disabled={!canWrite || !input.trim()}
              style={{ ...btnPrimary, ...(!canWrite || !input.trim() ? btnDisabled : {}) }}>{t('send')}</button>
          </div>
        </div>
      )}
    </div>,
  );
}
