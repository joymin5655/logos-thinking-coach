/*
 * DashboardHome.tsx — LOGOS 성장 대시보드
 * 모든 숫자는 이 기기에 저장된 실제 기록에서 나온다. 기록이 없으면 빈 상태 문구를 보여준다.
 */
import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import DashboardLayout from '@/components/DashboardLayout';
import { T, mono, serif, Label, btnPrimary, btnGhost, panelStyle, FocusStyle, Quote } from '@/components/logos-ui';
import { ALL_FIELDS, MAX_FIELDS, loadFields, saveFields, type Field } from '@/lib/preferences';
import { FIELD_COLOR } from '@/lib/colors';
import { todaysTopic } from '@/lib/topics';
import { buildDailyArgueIcs, downloadFile } from '@/lib/ics';
import {
  REDIAGNOSE_DAYS, addDays, avgDelta, completionRate, computeStreak, daysUntilRediagnosis, exportJSON,
  isoWeekKey, localDate, pickComparison, toISODate, useStore, weekdayIndex,
} from '@/lib/store';

const DAY_KO = ['월', '화', '수', '목', '금', '토', '일'];
const fmtMD = (iso: string) => {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
};

function Kpi({ label, n, sub }: { label: string; n: string; sub: string }) {
  return (
    <div style={{ backgroundColor: T.panel, padding: 16, display: 'grid', gap: 4, minWidth: 0 }}>
      <Label>{label}</Label>
      <span style={{ fontFamily: serif, fontSize: 30, lineHeight: 1.1, color: T.cream, fontVariantNumeric: 'tabular-nums' }}>{n}</span>
      <span style={{ fontSize: 12, color: T.creamMid, lineHeight: 1.5 }}>{sub}</span>
    </div>
  );
}

export default function DashboardHome() {
  const [, navigate] = useLocation();
  const store = useStore();
  const [fields, setFields] = useState<Field[]>(() => loadFields());
  const [draft, setDraft] = useState<Field[]>([]);
  const [skipDiag, setSkipDiag] = useState(false);
  const topic = useMemo(() => todaysTopic(), []);

  useEffect(() => {
    const sync = () => setFields(loadFields());
    window.addEventListener('logos:fields-changed', sync);
    return () => window.removeEventListener('logos:fields-changed', sync);
  }, []);

  const now = new Date();
  const today = toISODate(now);
  const streak = computeStreak(store.streak.days, today);
  const comp = completionRate(store.sessions);
  const delta = avgDelta(store.sessions);
  const lastDiag = store.diagnostics[store.diagnostics.length - 1];
  const prevDiag = store.diagnostics[store.diagnostics.length - 2];
  const dueIn = daysUntilRediagnosis(store, today);
  const rediagDue = dueIn === 0;
  const doneToday = store.sessions.some((s) => s.kind === 'argue' && s.completedAt && localDate(s.startedAt) === today);

  const trend = useMemo(
    () =>
      store.sessions
        .filter((s) => s.completedAt && s.scoreAfter)
        .sort((a, b) => a.completedAt!.localeCompare(b.completedAt!))
        .slice(-10)
        .map((s) => ({ label: fmtMD(s.completedAt!), score: s.scoreAfter!.total })),
    [store.sessions],
  );
  const compare = useMemo(() => pickComparison(store.sessions, new Date()), [store.sessions]);

  const fieldCounts = fields.map((f) => ({
    f,
    n: store.sessions.filter((s) => s.completedAt && s.field && (s.field.includes(f) || f.includes(s.field))).length,
  }));
  const recent = [...store.sessions].reverse().slice(0, 3);

  const weekStart = addDays(today, -weekdayIndex(today));
  const week = DAY_KO.map((ko, i) => {
    const date = addDays(weekStart, i);
    const froze = streak.freezeDates.includes(date) || store.streak.freezesUsed[isoWeekKey(date)] === date;
    return { ko, date, done: store.streak.days.includes(date), froze, isToday: date === today, future: date > today };
  });

  const addToCalendar = () => {
    const tomorrow = todaysTopic(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
    const ics = buildDailyArgueIcs(tomorrow.title, `${window.location.origin}/dashboard/argue`);
    downloadFile('logos-daily-argue.ics', ics, 'text/calendar;charset=utf-8');
    toast('내일 아침 8시 일정을 내려받았어요. 캘린더 앱에서 열어 주세요.');
  };
  const exportData = () => {
    downloadFile(`logos-export-${today}.json`, exportJSON(), 'application/json');
    toast('기록을 내려받았어요.');
  };

  const toggleDraft = (f: Field) =>
    setDraft((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : prev.length >= MAX_FIELDS ? prev : [...prev, f]));
  const commitFields = () => {
    if (!draft.length) return;
    saveFields(draft);
    setFields(draft);
    setDraft([]);
  };

  const showDiagInvite = (!lastDiag && !skipDiag) || (lastDiag && rediagDue);

  return (
    <DashboardLayout title="대시보드" titleEn="Dashboard">
      <FocusStyle />
      <div style={{ display: 'grid', gap: 24, maxWidth: 1080 }}>
        <div style={{ display: 'grid', gap: 6 }}>
          <Label>Growth</Label>
          <h2 style={{ fontFamily: serif, fontWeight: 600, fontSize: 'clamp(1.6rem, 4vw, 2.1rem)', color: T.cream, letterSpacing: '-0.02em', margin: 0 }}>
            오늘도 깊이 생각하세요
          </h2>
          <p style={{ fontFamily: mono, fontSize: 12, color: T.creamMid, margin: 0, lineHeight: 1.8 }}>
            베타 기간에는 모든 기능을 무료로 쓸 수 있어요. 기록은 이 기기에만 저장됩니다.
          </p>
        </div>

        {showDiagInvite && (
          <div style={{ ...panelStyle, borderColor: T.cream, display: 'grid', gap: 10 }}>
            <Label>{lastDiag ? '재진단' : '3분 사고력 진단'}</Label>
            <p style={{ margin: 0, fontFamily: serif, fontSize: 20, lineHeight: 1.4, color: T.cream }}>
              {lastDiag
                ? `${REDIAGNOSE_DAYS}일이 지났어요. 다시 재서 얼마나 달라졌는지 볼까요?`
                : '먼저 지금의 기준점을 만들어 둘까요? 3분이면 됩니다.'}
            </p>
            <p style={{ margin: 0, fontSize: 13, color: T.creamMid, lineHeight: 1.7 }}>
              {lastDiag ? `지난 진단은 ${lastDiag.score.total}점이었어요.` : '한 문항에 짧게 쓰면 AI가 추정 점수를 냅니다. 4주 뒤 같은 방식으로 다시 재서 변화를 보여 드려요.'}
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="lg-btn" style={btnPrimary} onClick={() => navigate('/dashboard/diagnostic')}>{lastDiag ? '재진단 하기' : '3분 진단 시작'}</button>
              {!lastDiag && <button type="button" className="lg-btn" style={btnGhost} onClick={() => setSkipDiag(true)}>나중에 할게요</button>}
            </div>
          </div>
        )}

        {fields.length === 0 && (
          <div style={{ ...panelStyle, display: 'grid', gap: 12 }}>
            <Label>관심 분야 · 선택</Label>
            <p style={{ margin: 0, fontSize: 13, color: T.creamMid, lineHeight: 1.7 }}>고르면 오늘의 논증 주제에 반영돼요. 최대 {MAX_FIELDS}개, 건너뛰어도 됩니다.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }} role="group" aria-label="관심 분야">
              {ALL_FIELDS.map((opt) => {
                const picked = draft.includes(opt.value);
                const atCap = !picked && draft.length >= MAX_FIELDS;
                return (
                  <button key={opt.value} type="button" className="lg-btn" aria-pressed={picked} onClick={() => toggleDraft(opt.value)} disabled={atCap}
                    style={{ ...btnGhost, padding: '8px 14px', fontSize: 11, textTransform: 'none', letterSpacing: '0.05em', backgroundColor: picked ? T.cream : 'transparent', color: picked ? T.black : atCap ? T.creamDim : T.creamMid, borderColor: picked ? T.cream : T.borderMid, cursor: atCap ? 'not-allowed' : 'pointer' }}>
                    {opt.value}
                  </button>
                );
              })}
            </div>
            <div><button type="button" className="lg-btn" style={{ ...btnPrimary, opacity: draft.length ? 1 : 0.4 }} disabled={!draft.length} onClick={commitFields}>저장</button></div>
          </div>
        )}

        {/* KPI */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 1, backgroundColor: T.border, border: `1px solid ${T.border}` }}>
          <Kpi label="연속 기록" n={`${streak.count}일`} sub={streak.freezesLeftThisWeek > 0 ? '이번 주 쉬어가기 1회 남음' : '이번 주 쉬어가기를 썼어요'} />
          <Kpi label="세션 완주율" n={comp.rate === null ? '—' : `${Math.round(comp.rate * 100)}%`} sub={comp.started ? `시작 ${comp.started} · 완주 ${comp.completed}` : '아직 시작한 세션이 없어요'} />
          <Kpi label="세션 내 평균 상승" n={delta === null ? '—' : `${delta > 0 ? '+' : ''}${Math.round(delta)}`} sub={delta === null ? '완주한 세션이 쌓이면 보여요' : '처음 주장 → 최종 정리'} />
          <Kpi
            label="진단 변화"
            n={!lastDiag ? '—' : prevDiag ? `${prevDiag.score.total}→${lastDiag.score.total}` : `${lastDiag.score.total}→?`}
            sub={!lastDiag ? '3분 진단으로 기준점을 만들어요' : dueIn === 0 ? '재진단 할 수 있어요' : `재진단까지 ${dueIn}일`}
          />
        </div>

        {/* 오늘의 논증 + 주간 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          <div style={{ border: `1px solid ${T.cream}`, padding: 18, display: 'grid', gap: 10, minWidth: 0, alignContent: 'start' }}>
            <Label>오늘의 논증 · 10분</Label>
            <p style={{ fontFamily: serif, fontSize: 19, lineHeight: 1.4, margin: 0, color: T.cream }}>"{topic.title}"</p>
            <p style={{ margin: 0, fontSize: 13, color: T.creamMid, lineHeight: 1.7 }}>입장을 고르고 근거를 쓰면, LOGOS가 가장 약한 고리를 세 번 묻습니다.</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="lg-btn" style={btnPrimary} onClick={() => navigate('/dashboard/argue')}>{doneToday ? '한 번 더' : '시작하기'}</button>
              <button type="button" className="lg-btn" style={btnGhost} onClick={addToCalendar}>내일 아침 8시 캘린더에 추가</button>
            </div>
            {doneToday && <span style={{ fontFamily: mono, fontSize: 11, color: T.creamMid }}>오늘 논증을 마쳤어요.</span>}
          </div>
          <div style={{ display: 'grid', gap: 10, minWidth: 0, alignContent: 'start' }}>
            <Label>이번 주</Label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
              {week.map((d) => (
                <div key={d.date} style={{ display: 'grid', gap: 4, justifyItems: 'center', fontFamily: mono, fontSize: 10, color: T.creamMid }}>
                  <i
                    role="img"
                    aria-label={`${d.ko}요일 ${d.done ? '기록함' : d.froze ? '쉬어감' : d.future ? '아직 안 옴' : '기록 없음'}`}
                    style={{
                      width: '100%', aspectRatio: '1', maxWidth: 34, display: 'block',
                      border: `1px solid ${d.isToday ? T.amber : d.done ? T.cream : T.border}`,
                      background: d.done ? T.cream : d.froze ? `repeating-linear-gradient(45deg, ${T.border} 0 3px, transparent 3px 6px)` : 'transparent',
                      opacity: d.future ? 0.45 : 1,
                    }}
                  />
                  {d.ko}
                </div>
              ))}
            </div>
            <p style={{ margin: 0, fontSize: 13, color: T.creamMid, borderLeft: `2px solid ${T.border}`, paddingLeft: 12, lineHeight: 1.7 }}>
              빗금 = 쉬어가기(주 1회). 하루 놓쳐도 기록이 끊기지 않아요.
            </p>
          </div>
        </div>

        {/* 추이 + 비교 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          <div style={{ display: 'grid', gap: 8, minWidth: 0, alignContent: 'start' }}>
            <Label>세션 점수 추이 (최종 정리 기준 · AI 추정치)</Label>
            {trend.length >= 2 ? (
              <div style={{ height: 180 }} role="img" aria-label={`최근 ${trend.length}회 점수: ${trend[0].score}에서 ${trend[trend.length - 1].score}`}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
                    <CartesianGrid stroke="rgba(240,235,224,0.10)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontFamily: 'Space Mono', fontSize: 10, fill: T.creamMid }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontFamily: 'Space Mono', fontSize: 10, fill: T.creamMid }} axisLine={false} tickLine={false} width={40} />
                    <Tooltip contentStyle={{ backgroundColor: T.black, border: `1px solid ${T.borderMid}`, fontFamily: 'Space Mono', fontSize: 11 }} labelStyle={{ color: T.creamMid }} itemStyle={{ color: T.cream }} formatter={(v: number) => [`${v}점`, '최종 정리']} />
                    <Line type="monotone" dataKey="score" stroke={T.accent} strokeWidth={2} dot={{ r: 3, fill: T.accent, stroke: T.accent }} activeDot={{ r: 5, fill: T.amber, stroke: T.amber }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: 13, color: T.creamMid, lineHeight: 1.7, border: `1px dashed ${T.border}`, padding: 16 }}>
                세션을 2번 완주하면 점수 추이가 그려져요. 지금까지 완주 {trend.length}회.
              </p>
            )}
          </div>
          <div style={{ display: 'grid', gap: 10, minWidth: 0, alignContent: 'start' }}>
            <Label>{compare ? (compare.sameTopic ? `한 달 전의 나와 비교 · 같은 주제 "${compare.older.topic}"` : '예전의 나와 비교') : '한 달 전의 나와 비교'}</Label>
            {compare ? (
              <>
                <Quote>{fmtMD(compare.older.startedAt)}: "{compare.older.finalSummary ?? compare.older.firstClaim}"</Quote>
                <Quote after>{fmtMD(compare.newer.startedAt)}: "{compare.newer.finalSummary ?? compare.newer.firstClaim}"</Quote>
              </>
            ) : (
              <p style={{ margin: 0, fontSize: 13, color: T.creamMid, lineHeight: 1.7, border: `1px dashed ${T.border}`, padding: 16 }}>
                완주한 기록이 2개 이상 쌓이면 예전 내 생각과 지금 생각을 나란히 볼 수 있어요. 3주 넘게 지난 기록이 있으면 그것과 먼저 비교합니다.
              </p>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: mono, fontSize: 11, padding: '3px 8px', border: `1px solid ${T.border}`, color: T.creamMid }}>기록은 이 기기에만 저장돼요</span>
              <button type="button" className="lg-btn" style={btnGhost} onClick={exportData}>파일럿용 기록 내보내기 (JSON)</button>
            </div>
          </div>
        </div>

        {fields.length > 0 && (
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Label>분야별 완주 횟수</Label>
              <button type="button" className="lg-btn" onClick={() => { saveFields([]); setDraft([]); }} style={{ ...btnGhost, border: 'none', padding: '2px 0', fontSize: 10, textDecoration: 'underline' }}>분야 재선택</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
              {fieldCounts.map(({ f, n }) => (
                <div key={f} style={{ ...panelStyle, padding: 14, display: 'grid', gap: 4, borderTop: `2px solid ${FIELD_COLOR[f]}` }}>
                  <span style={{ fontFamily: mono, fontSize: 11, color: T.creamMid }}>{f}</span>
                  <span style={{ fontFamily: serif, fontSize: 24, color: T.cream }}>{n}<span style={{ fontFamily: mono, fontSize: 11, color: T.creamMid }}> 회</span></span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gap: 10 }}>
          <Label>최근 기록</Label>
          {recent.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: T.creamMid, lineHeight: 1.7, border: `1px dashed ${T.border}`, padding: 16 }}>
              아직 기록이 없어요. 오늘의 논증이나 소크라테스 코칭으로 첫 기록을 만들어 보세요.
            </p>
          ) : (
            recent.map((s) => (
              <button key={s.id} type="button" className="lg-btn" onClick={() => navigate('/dashboard/history')}
                style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', textAlign: 'left', padding: '14px 0', background: 'none', border: 'none', borderTop: `1px solid ${T.border}`, color: T.cream, cursor: 'pointer' }}>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontFamily: mono, fontSize: 13, fontWeight: 700, overflowWrap: 'anywhere' }}>{s.topic}</span>
                  <span style={{ fontFamily: mono, fontSize: 10, color: T.creamMid }}>{fmtMD(s.startedAt)} · {s.kind === 'argue' ? '오늘의 논증' : '코칭'} · {s.completedAt ? '완주' : '진행 중'}</span>
                </span>
                {s.scoreAfter && <span style={{ fontFamily: serif, fontSize: 24, flexShrink: 0 }}>{s.scoreAfter.total}</span>}
              </button>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
