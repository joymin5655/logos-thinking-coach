/*
 * auth.tsx — Supabase 세션을 React에 올리는 AuthProvider·useAuth.
 * Google 로그인만 쓴다. supabase가 null(env 없음)이면 ready=false로 "로그인 준비 중"을 보여 줄 수 있게 한다.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { onSignIn, onSignedOut, signOutFlow } from './sync';

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
        setIsAdmin(false);
        setAdminUid(null);
        return;
      }
      void onSignIn(uid);
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
