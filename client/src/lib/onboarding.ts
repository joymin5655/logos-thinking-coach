/*
 * onboarding.ts — 첫 실행 온보딩(/welcome)의 단계 판정과 리다이렉트.
 * 진단 → 관심 분야 → 첫 논증 → 알림 순서이고, 단계는 저장된 기록에서 다시 계산한다(진행 상태를 따로 들고 있지 않는다).
 * 서버의 user_meta.onboarded_at이 정본이고, 조회가 실패하면 로컬 기록만으로 판단한다.
 */
import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { supabase } from './supabase';
import { loadStore, type LogosStore } from './store';
import { loadFields, type Field } from './preferences';

export type OnboardingStep = 'diagnostic' | 'interests' | 'argue' | 'reminder' | 'done';

/** 화면에 보이는 4단계(done 제외). */
export const STEPS = ['diagnostic', 'interests', 'argue', 'reminder'] as const satisfies readonly OnboardingStep[];

export const SKIPPED_KEY = 'logos.welcome.skipped';
export const DONE_KEY = 'logos.welcome.done';
export const PROGRESS_KEY = 'logos.welcome.progress';

export type OnboardingState = {
  hasDiagnostic: boolean;
  fieldsChosen: boolean;
  fieldsSkipped: boolean;
  /** 오늘의 논증을 시작했거나 끝냈다 */
  hasArgue: boolean;
  reminderDone: boolean;
  reminderSkipped: boolean;
  onboardedAt: string | null;
};

export function nextStep(s: OnboardingState): OnboardingStep {
  if (s.onboardedAt) return 'done';
  if (!s.hasDiagnostic) return 'diagnostic';
  if (!s.fieldsChosen && !s.fieldsSkipped) return 'interests';
  if (!s.hasArgue) return 'argue';
  if (!s.reminderDone && !s.reminderSkipped) return 'reminder';
  return 'done';
}

/** 단계마다 사용자가 직접 남기는 표시(건너뛰기·알림 완료). */
export type OnboardingPrefs = {
  fields: readonly Field[];
  fieldsSkipped?: boolean;
  reminderDone?: boolean;
  reminderSkipped?: boolean;
};

export type OnboardingMeta = { onboardedAt?: string | null };

export function onboardingState(
  store: Pick<LogosStore, 'diagnostics' | 'sessions'>,
  prefs: OnboardingPrefs,
  meta: OnboardingMeta = {},
): OnboardingState {
  return {
    hasDiagnostic: store.diagnostics.length > 0,
    fieldsChosen: prefs.fields.length > 0,
    fieldsSkipped: !!prefs.fieldsSkipped,
    hasArgue: store.sessions.some((x) => x.kind === 'argue'),
    reminderDone: !!prefs.reminderDone,
    reminderSkipped: !!prefs.reminderSkipped,
    onboardedAt: meta.onboardedAt ?? null,
  };
}

/** 완료한 코칭·논증·아레나 기록과 진단 기록의 합. 0이면 신규 사용자. */
export function recordCount(store: Pick<LogosStore, 'diagnostics' | 'sessions' | 'arenas'>): number {
  return (
    store.diagnostics.length +
    store.sessions.filter((x) => x.completedAt).length +
    (store.arenas ?? []).filter((x) => x.completedAt).length
  );
}

/** 신규(기록 0)이고, 아직 온보딩을 안 마쳤고, 건너뛴 적 없을 때만 /welcome으로 보낸다. */
export function shouldRedirectToWelcome(i: { onboardedAt?: string | null; records: number; dismissed: boolean }): boolean {
  return !i.onboardedAt && !i.dismissed && i.records === 0;
}

/* ───────── 로컬 표시(localStorage) ───────── */

function readLs(key: string): string | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLs(key: string, value: string) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
  } catch {
    /* 저장 불가 환경 */
  }
}

/** 로그아웃 때: 온보딩 로컬 플래그(건너뜀·완료·진행)는 기기 단위라 다음 계정으로 새지 않게 지운다. */
export function clearOnboardingLocal() {
  for (const k of [SKIPPED_KEY, DONE_KEY, PROGRESS_KEY]) {
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(k);
    } catch {
      /* 저장 불가 환경 */
    }
  }
}

export const isDismissed = () => readLs(SKIPPED_KEY) !== null;
export const isCompletedLocally = () => readLs(DONE_KEY) !== null;

export function skipOnboarding() {
  writeLs(SKIPPED_KEY, new Date().toISOString());
}

type Progress = Pick<OnboardingPrefs, 'fieldsSkipped' | 'reminderDone' | 'reminderSkipped'>;

export function loadProgress(): Progress {
  try {
    const v: unknown = JSON.parse(readLs(PROGRESS_KEY) ?? '{}');
    if (!v || typeof v !== 'object') return {};
    const o = v as Record<string, unknown>;
    return { fieldsSkipped: o.fieldsSkipped === true, reminderDone: o.reminderDone === true, reminderSkipped: o.reminderSkipped === true };
  } catch {
    return {};
  }
}

export function saveProgress(patch: Progress) {
  writeLs(PROGRESS_KEY, JSON.stringify({ ...loadProgress(), ...patch }));
}

/** 현재 로컬 상태에서 prefs를 모은다. */
export function loadPrefs(): OnboardingPrefs {
  return { fields: loadFields(), ...loadProgress() };
}

/* ───────── 서버 ───────── */

/** 본인 행의 onboarded_at. 로그인 전·행 없음·오류는 null(= 서버 기준으로 아직 안 마침). ok=false면 조회 실패. */
export async function fetchOnboardedAt(): Promise<{ ok: boolean; onboardedAt: string | null }> {
  if (!supabase) return { ok: false, onboardedAt: null };
  try {
    const { data: auth } = await supabase.auth.getSession();
    const uid = auth.session?.user.id;
    if (!uid) return { ok: false, onboardedAt: null };
    const { data, error } = await supabase.from('user_meta').select('onboarded_at').eq('user_id', uid).maybeSingle();
    if (error) return { ok: false, onboardedAt: null };
    return { ok: true, onboardedAt: (data as { onboarded_at: string | null } | null)?.onboarded_at ?? null };
  } catch {
    return { ok: false, onboardedAt: null };
  }
}

/** 로컬 플래그를 먼저 남기고 서버에 알린다. 서버 호출이 실패해도 로컬 완료는 유지된다. */
export async function completeOnboarding(): Promise<void> {
  writeLs(DONE_KEY, new Date().toISOString());
  if (!supabase) return;
  try {
    await supabase.rpc('mark_onboarded');
  } catch {
    /* 로컬 플래그만으로 다시 보내지 않는다 */
  }
}

/**
 * DashboardHome에서 한 번 부른다. 마운트 시 신규 사용자면 /welcome으로 replace 이동한다.
 * 서버 조회가 끝나기 전에는 움직이지 않고, 조회가 실패하면 로컬 기록만으로 판단한다.
 */
export function useOnboardingRedirect(): void {
  const [, navigate] = useLocation();

  useEffect(() => {
    if (isDismissed() || isCompletedLocally() || recordCount(loadStore()) > 0) return;
    let cancelled = false;
    void fetchOnboardedAt().then(({ onboardedAt }) => {
      if (cancelled) return;
      // 조회 사이에 동기화로 기록이 내려왔을 수 있으니 다시 센다
      const go = shouldRedirectToWelcome({
        onboardedAt: onboardedAt ?? (isCompletedLocally() ? 'local' : null),
        records: recordCount(loadStore()),
        dismissed: isDismissed(),
      });
      if (go) navigate('/welcome', { replace: true });
    });
    return () => {
      cancelled = true;
    };
  }, [navigate]);
}
