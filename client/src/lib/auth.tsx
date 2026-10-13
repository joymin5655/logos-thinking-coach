/*
 * auth.tsx — Supabase 세션을 React에 올리는 AuthProvider·useAuth.
 * Google 로그인만 쓴다. supabase가 null(env 없음)이면 ready=false로 "로그인 준비 중"을 보여 줄 수 있게 한다.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { onSignIn, onSignedOut, signOutFlow } from './sync';
import { getTouch } from './acquisition';
import { getAnonId, privacyAllows, resetAnonymous, track } from './track';
import { clearOnboardingLocal } from './onboarding';
import { clearPendingTermsConsent, flushPendingTermsConsent } from './termsConsent';

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  /** 첫 세션 확인이 끝나기 전까지 true */
  loading: boolean;
  isAdmin: boolean;
  /** 로그인했지만 is_admin 확인이 끝나기 전까지 true */
  adminLoading: boolean;
  /** false면 Supabase env가 없어 로그인할 수 없다 */
  ready: boolean;
  /** 로그인 후 돌아올 경로(같은 사이트 안만). 실패하면 false */
  signIn: (next?: string) => Promise<boolean>;
  /** 취소(미동기화 기록 확인에서 '아니오')하면 false */
  signOut: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** `next` 쿼리는 같은 사이트의 절대 경로일 때만 따른다(오픈 리다이렉트 방지). */
export function safeNext(next: string | null | undefined, fallback = '/dashboard'): string {
  return next && /^\/(?!\/)/.test(next) && !next.includes('\\') ? next : fallback;
}

const claims = new Map<string, Promise<void>>();
let claimGen = 0;

/** 로그아웃 때 성공한 claim 캐시를 비운다 — 같은 계정으로 다시 로그인하면 새 익명 이벤트를 다시 잇는다. */
export function clearClaims(): void {
  claims.clear();
  claimGen++;
}

/**
 * 로그인 직후 프로필 행을 만들고(first-touch 보존) 30일 내 익명 이벤트를 내 계정에 잇는다. uid당 한 번만 보낸다.
 * 새로 만들어졌으면 signup 이벤트. 실패는 삼키고, 다음 호출에서 다시 시도할 수 있게 비운다.
 * GPC·DNT가 켜져 있으면 익명 id와 first-touch는 보내지 않는다(프로필 행만 만든다).
 */
export function claimProfile(uid: string): Promise<void> {
  const cur = claims.get(uid);
  if (cur) return cur;
  const client = supabase;
  if (!client) return Promise.resolve();
  const gen = claimGen;
  const p = (async () => {
    try {
      const { data, error } = await Promise.resolve().then(() => client.rpc('claim_profile', privacyAllows() ? { p_anon: getAnonId(), p_touch: getTouch() } : { p_anon: null, p_touch: null }));
      if (error) {
        claims.delete(uid);
        return;
      }
      // 응답 사이에 로그아웃(claims 비움)됐다면 회전된 익명 id로 signup을 내지 않는다
      if ((data as { created?: boolean } | null)?.created && gen === claimGen) track('signup');
    } catch {
      claims.delete(uid);
    }
  })();
  claims.set(uid, p);
  return p;
}

/**
 * Join 페이지처럼 프로필(first-touch)이 먼저 만들어져야 하는 곳에서 기다린다.
 * 로그인 전이면 곧바로 끝나고, 로그인돼 있으면 claimProfile이 끝나야 끝난다.
 */
export async function ensureProfile(): Promise<void> {
  if (!supabase) return;
  try {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (uid) await claimProfile(uid);
  } catch {
    /* 세션 확인 실패 — 기다릴 것이 없다 */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!!supabase);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminUid, setAdminUid] = useState<string | null>(null); // is_admin 확인이 끝난 uid
  const signedInUid = useRef<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let cancelled = false;

    // 같은 uid로는 한 번만 동기화한다(SIGNED_IN은 탭 복귀 때도 다시 온다)
    const handle = (s: Session | null) => {
      const uid = s?.user.id ?? null;
      if (uid === signedInUid.current) return;
      signedInUid.current = uid;
      if (!uid) {
        onSignedOut(); // 만료·원격 로그아웃에서도 재시도 루프를 멈춘다
        clearClaims();
        resetAnonymous(); // 다음 사용자에게 익명 id·미전송 이벤트·first-touch가 이어지지 않게 한다
        clearOnboardingLocal(); // 온보딩 건너뜀·완료 표시도 기기 단위라 함께 지운다
        clearPendingTermsConsent(); // 다음 사용자의 로그인에 이전 동의 표시가 쓰이지 않게 한다
        setIsAdmin(false);
        setAdminUid(null);
        return;
      }
      void onSignIn(uid);
      // 프로필 행이 먼저 만들어진 뒤 가입 동의를 기록한다(실패해도 로그인은 막지 않고 다음 로드에 다시 시도)
      void claimProfile(uid).then(() => {
        if (cancelled || signedInUid.current !== uid) return; // 그 사이 로그아웃·계정 전환이면 기록하지 않는다
        return flushPendingTermsConsent(client);
      });
      void Promise.resolve(client.rpc('is_admin')).then(
        ({ data, error }) => {
          if (cancelled || signedInUid.current !== uid) return;
          setIsAdmin(!error && data === true);
          setAdminUid(uid);
        },
        () => {
          if (cancelled || signedInUid.current !== uid) return;
          setIsAdmin(false);
          setAdminUid(uid);
        },
      );
    };

    const { data } = client.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setLoading(false);
      // 콜백 안에서 supabase를 부르면 교착이 생기므로 한 틱 미룬다
      setTimeout(() => !cancelled && handle(s), 0);
    });
    void client.auth.getSession().then(({ data: d }) => {
      if (cancelled) return;
      setSession((cur) => cur ?? d.session);
      setLoading(false);
      handle(d.session);
    });
    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (next = '/dashboard') => {
    if (!supabase) return false;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(safeNext(next))}` },
    });
    return !error;
  }, []);

  const adminLoading = !!session && adminUid !== session.user.id;
  const value = useMemo<AuthContextValue>(
    () => ({ user: session?.user ?? null, session, loading, isAdmin, adminLoading, ready: !!supabase, signIn, signOut: signOutFlow }),
    [session, loading, isAdmin, adminLoading, signIn],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth는 AuthProvider 안에서만 쓸 수 있어요.');
  return ctx;
}
