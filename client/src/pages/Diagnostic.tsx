/*
 * Diagnostic.tsx — 3분 사고력 진단
 * 첫 방문에 기준점을 만들고, 4주 뒤 같은 루브릭으로 다시 재서 변화를 본다.
 * 타이머는 부드러운 안내일 뿐 입력을 막지 않는다.
 */
import { useEffect, useRef, useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import DashboardLayout from '@/components/DashboardLayout';
import {
  T, mono, serif, Label, btnPrimary, btnGhost, btnDisabled, textareaStyle, panelStyle, FocusStyle,
  TypingDots, ErrorLine, CharCount, RubricBars, BigScore, sans, useDraft } from '@/components/logos-ui';
import { usePageMeta } from '@/lib/usePageMeta';
import { coach, errorCode, errorMessage, handleAuthError, type ApiErrorCode } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDate, useT } from '@/i18n';
import { addDiagnostic, daysUntilRediagnosis, newId, nextDiagnosticDate, toISODate, useStore, usedDiagnosticForms, type DiagnosticRecord } from '@/lib/store';
import { fetchMyMetaResult } from '@/lib/cohort';
import { track } from '@/lib/track';
import { DIAGNOSTIC_FORMS, pickForm, type DiagnosticForm } from '../../../shared/diagnosticForms';
import { QUOTAS } from '../../../shared/quotas';

export const DIAGNOSTIC_PROMPTS = ['prompt0', 'prompt1', 'prompt2', 'prompt3'] as const; // diagnostic 사전의 키
const MAX_TEXT = 2000;
const MIN_TEXT = 30;
const TOTAL_SEC = 180;
const sr = { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' } as const;

const fmtDate = (iso: string) => formatDate(new Date(iso.length === 10 ? `${iso}T00:00:00` : iso), { year: 'numeric', month: 'long', day: 'numeric' });

export default function Diagnostic() {
  const [, navigate] = useLocation();
  const fromWelcome = new URLSearchParams(useSearch()).get('from') === 'welcome'; // 온보딩에서 온 진단
  const store = useStore();
  const ta = useT('auth');
  const t = useT('diagnostic');
  const { user, loading: authLoading } = useAuth();
  const sidRef = useRef(newId()); // 재시도는 같은 sid로 보내 한도가 두 번 깎이지 않게 한다
  const last = store.diagnostics[store.diagnostics.length - 1];
  const prev = store.diagnostics[store.diagnostics.length - 2];
  // 파일럿 참가자(user_meta.cohort_code 있음 — arm은 블라인드라 읽지 않는다)는 사전/사후 폼을 교차 배정한다. 확인이 끝나기 전엔 문항을 보여 주지 않는다.
  // 로그인 확인(authLoading)이 끝나기 전에는 비로그인으로 단정해 폼을 확정하지 않는다.
  // 조회가 오류면 1회 재시도하고, 그래도 실패하면 비파일럿으로 진행한다(행 없음과는 다른 경로).
  // joinedAt = 파일럿 최초 참가 시각: 참가 전에 쓴 진단은 사전/사후 순서에서 뺀다(서버 채점 대상 범위와 같다).
  const [pilot, setPilot] = useState(false);
  const [joinedAt, setJoinedAt] = useState<string | null>(null);
  const [metaDone, setMetaDone] = useState(!authLoading && !user);
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setPilot(false);
      setJoinedAt(null);
      setMetaDone(true);
      setLeft(TOTAL_SEC);
      return;
    }
    let cancelled = false;
    setMetaDone(false);
    void fetchMyMetaResult().then((r) => {
      if (cancelled) return;
      const meta = r.ok ? r.meta : null;
      setPilot(!!meta?.cohort_code);
      setJoinedAt(meta?.cohort_code ? meta.joined_at : null);
      setMetaDone(true);
      setLeft(TOTAL_SEC); // 문항이 보이는 순간부터 3분
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id, authLoading]); // eslint-disable-line react-hooks/exhaustive-deps
  const [locked, setLocked] = useState<DiagnosticForm | null>(null); // 쓰기 시작하면 동기화로 기록이 늘어도 문항을 바꾸지 않는다
  const form = locked ?? pickForm({ used: usedDiagnosticForms(store.diagnostics, pilot ? joinedAt : null), seed: user?.id ?? store.participantId, pilot });
  const prompt = t(DIAGNOSTIC_PROMPTS[DIAGNOSTIC_FORMS.indexOf(form)]);

  const [taking, setTaking] = useState(false);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorKind, setErrorKind] = useState<ApiErrorCode | undefined>();
  const [result, setResult] = useState<DiagnosticRecord | null>(null);
  const [left, setLeft] = useState(TOTAL_SEC);
  usePageMeta('diagnostic', { noindex: true });
  const rescue = useDraft('essay', text, setText);

  const writing = taking || !last;
  const startedSid = useRef('');
  useEffect(() => {
    if (!writing || result || !metaDone || startedSid.current === sidRef.current) return;
    startedSid.current = sidRef.current;
    track('diagnostic_start', { form });
  }, [writing, result, metaDone, form]);
  useEffect(() => {
    if (!writing || result) return;
    const id = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [writing, result]);

  const submit = async () => {
    const body = text.trim();
    if (body.length < MIN_TEXT || loading) return;
    setLoading(true);
    setError('');
    try {
      const s = await coach({ action: 'score', sid: sidRef.current, kind: 'diagnostic', text: body, context: prompt.slice(0, 200) });
      const rec: DiagnosticRecord = {
        id: sidRef.current, at: new Date().toISOString(), prompt, text: body,
        score: { consistency: s.consistency, evidence: s.evidence, defense: s.defense, total: s.total, rationale: s.rationale },
        form,
      };
      addDiagnostic(rec);
      track('diagnostic_done', { form, score: s.total, guest: !user });
      setLocked(null);
      sidRef.current = newId();
      setText(''); // 제출이 끝났으니 보관해 둔 초안도 함께 비운다
      setResult(rec);
    } catch (e) {
      if (handleAuthError(e, navigate, () => rescue(body))) return;
      setError(errorMessage(e));
      setErrorKind(errorCode(e));
    } finally {
      setLoading(false);
    }
  };

  const shown = result ?? (!writing ? last : null);
  // addDiagnostic가 setResult보다 먼저 스토어를 갱신하므로 last는 이미 새 기록이다 — 직전 기록(prev)과 비교
  const before = prev;
  const due = daysUntilRediagnosis(store, toISODate(new Date()));

  if (shown) {
    return (
      <DashboardLayout title={t('title')} titleEn={t('titleEn')} aiNotice>
        <FocusStyle />
        <div style={{ maxWidth: 640, display: 'grid', gap: 16 }}>
          <div style={{ ...panelStyle, display: 'grid', gap: 18 }}>
            <Label>{t('resultLabel')}</Label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, alignItems: 'flex-end' }}>
              <BigScore n={shown.score.total} label={before ? t('thisDiag') : t('baseline')} sub={t('scoreSub', { date: fmtDate(shown.at) })} />
              {before && (
                <div style={{ fontFamily: mono, fontSize: 13, color: shown.score.total > before.score.total ? T.amber : T.creamMid }}>
                  {t('deltaPrev', { prev: before.score.total, delta: `${shown.score.total - before.score.total >= 0 ? '+' : ''}${shown.score.total - before.score.total}` })}
                </div>
              )}
            </div>
            <RubricBars after={shown.score} before={before?.score} />
            <p style={{ margin: 0, fontFamily: sans, fontSize: 13, color: T.creamMid, borderLeft: `2px solid ${T.border}`, paddingLeft: 12, lineHeight: 1.7 }}>{shown.score.rationale}</p>
            {!user && (
              <div style={{ border: `1px solid ${T.borderMid}`, padding: 14, display: 'grid', gap: 10 }}>
                <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: T.cream }}>{ta('ctaSave')}</span>
                <span style={{ fontFamily: sans, fontSize: 13, color: T.creamMid, lineHeight: 1.6 }}>{ta('ctaSaveLead')}</span>
                <button type="button" className="lg-btn" style={{ ...btnGhost, justifySelf: 'start' }} onClick={() => navigate('/login?next=/dashboard')}>{ta('ctaButton')}</button>
              </div>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: mono, fontSize: 11, padding: '3px 8px', border: `1px solid ${T.border}`, color: T.creamMid }}>
                {t('rediag', { date: fmtDate(nextDiagnosticDate(shown.at)) })}{due !== null && due > 0 && !result ? t('rediagDays', { n: due }) : ''}
              </span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {!result && <button type="button" className="lg-btn" style={btnGhost} onClick={() => { setTaking(true); setText(''); setLeft(TOTAL_SEC); }}>{t('retake')}</button>}
                {result && fromWelcome && <button type="button" className="lg-btn" style={btnPrimary} onClick={() => navigate('/welcome')}>{t('nextStep')}</button>}
                <button type="button" className="lg-btn" style={result && fromWelcome ? btnGhost : btnPrimary} onClick={() => navigate('/dashboard/session')}>{t('startFirst')}</button>
              </div>
            </div>
          </div>
          <button type="button" className="lg-btn" style={{ ...btnGhost, border: 'none', textDecoration: 'underline', justifySelf: 'start', padding: 0 }} onClick={() => navigate('/dashboard')}>{t('home')}</button>
        </div>
      </DashboardLayout>
    );
  }

  if (!metaDone) {
    return (
      <DashboardLayout title={t('title')} titleEn={t('titleEn')} aiNotice>
        <div role="status" style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.18em', color: T.creamMid }}>{ta('checking')}</div>
      </DashboardLayout>
    );
  }

  const mm = String(Math.floor(Math.abs(left) / 60)).padStart(2, '0');
  const ss = String(Math.abs(left) % 60).padStart(2, '0');
  const short = text.trim().length < MIN_TEXT;
  return (
    <DashboardLayout title={t('title')} titleEn={t('titleEn')} aiNotice>
      <FocusStyle />
      <div style={{ maxWidth: 640, display: 'grid', gap: 16 }}>
        <div style={{ ...panelStyle, display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <Label>{last ? t('labelRe') : t('labelFirst')}</Label>
            <span role="timer" aria-label={t('timerAria')} style={{ fontFamily: mono, fontSize: 13, color: left >= 0 ? T.accent : T.creamMid, fontVariantNumeric: 'tabular-nums' }}>
              {left < 0 ? t('timerOver', { time: `${mm}:${ss}` }) : `${mm}:${ss}`}
            </span>
          </div>
          <div style={{ border: `1px solid ${T.border}`, padding: 18, display: 'grid', gap: 10 }}>
            <Label>{t('itemLabel')}</Label>
            <p style={{ margin: 0, fontFamily: serif, fontSize: 20, lineHeight: 1.45, color: T.cream }}>
              {t('itemText', { prompt })}
            </p>
          </div>
          <label htmlFor="diag" style={sr}>{t('answerAria')}</label>
          <textarea id="diag" className="lg-field" value={text} onChange={(e) => { setLocked((f) => f ?? form); setText(e.target.value.slice(0, MAX_TEXT)); }}
            rows={8} maxLength={MAX_TEXT} readOnly={loading} aria-busy={loading} style={textareaStyle} placeholder={t('placeholder')} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: T.creamMid }}>{t('noRight')}</span>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <CharCount value={text} max={MAX_TEXT} />
              <button type="button" className="lg-btn" onClick={() => void submit()} disabled={loading || short} style={{ ...btnPrimary, ...(loading || short ? btnDisabled : {}) }}>
                {loading ? t('scoring') : t('scoreBtn')}
              </button>
            </div>
          </div>
          {short && text.length > 0 && <span style={{ fontFamily: mono, fontSize: 10, color: T.creamDim }}>{t('minChars', { min: MIN_TEXT })}</span>}
          {loading && <TypingDots label={t('scoring')} />}
          {error && errorKind === 'quota' && !user ? (
            <div role="alert" style={{ border: `1px solid ${T.borderMid}`, padding: '12px 14px', display: 'grid', gap: 10 }}>
              <span style={{ fontFamily: sans, fontSize: 13, color: T.cream, lineHeight: 1.6 }}>{t('guestQuota', { n: QUOTAS.diagnostic.perDay })}</span>
              <button type="button" className="lg-btn" style={{ ...btnGhost, justifySelf: 'start' }} onClick={() => navigate('/login?next=/dashboard/diagnostic')}>{ta('ctaButton')}</button>
            </div>
          ) : (
            error && <ErrorLine message={error} code={errorKind} onRetry={() => void submit()} />
          )}
        </div>
        <button type="button" className="lg-btn" style={{ ...btnGhost, border: 'none', textDecoration: 'underline', justifySelf: 'start', padding: 0 }} onClick={() => navigate('/dashboard')}>
          {t('skip')}
        </button>
      </div>
    </DashboardLayout>
  );
}
