/*
 * supabase.ts — 브라우저용 Supabase 클라이언트. publishable 키는 공개 전제이고 접근은 RLS가 막는다.
 * env가 없으면 null이다. 화면은 "로그인 준비 중"으로 처리한다.
 */
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = url && key
  ? createClient(url, key, { auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true } })
  : null;
