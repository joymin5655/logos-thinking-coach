-- LOGOS: 가입 동의 기록. 이용약관·개인정보 처리방침에 동의한 버전과 시각을 서버에 남긴다.
-- 동의는 Google 로그인 전에 받으므로, 로그인 직후 클라이언트가 record_terms_consent를 한 번 부른다. 직접 쓰기 권한은 없다.
-- 계정 삭제(auth.users on delete cascade)와 delete_my_data(user_meta 행 삭제)가 이 기록도 함께 지운다.

alter table public.user_meta
  add column terms_version text check (length(terms_version) <= 40),
  add column terms_agreed_at timestamptz;

-- 본인 select만(테이블 권한은 events 마이그레이션에서 이미 회수). 쓰기는 아래 RPC로만.
grant select (terms_version, terms_agreed_at) on public.user_meta to authenticated;

-- 약관 버전은 날짜 형식(YYYY-MM-DD)만 받는다 — shared/terms.ts의 TERMS_VERSION과 같은 형식. 버전을 올려도 마이그레이션이 필요 없다.
-- 같은 버전으로 다시 부르면 최초 동의 시각을 유지하고, 다른 버전이면 그 시각으로 갱신한다.
-- 오류(메시지로 구분): not authenticated(28000), invalid_version(22023).
create function public.record_terms_consent(p_version text) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_version is null or p_version !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    raise exception 'invalid_version' using errcode = '22023';
  end if;

  insert into public.user_meta (user_id, created_at, terms_version, terms_agreed_at)
  values (v_uid, private.user_created_at(v_uid), p_version, now())
  on conflict (user_id) do update
  set terms_agreed_at = case when public.user_meta.terms_version is not distinct from excluded.terms_version
                             then coalesce(public.user_meta.terms_agreed_at, excluded.terms_agreed_at)
                             else excluded.terms_agreed_at end,
      terms_version = excluded.terms_version;
end;
$$;

revoke execute on function public.record_terms_consent(text) from public, anon;
grant execute on function public.record_terms_consent(text) to authenticated;
