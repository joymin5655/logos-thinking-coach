-- LOGOS: 사전 신청, 관리자 지표, 내 데이터·계정 삭제.

create table public.waitlist (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  plan text not null check (plan in ('pro', 'team')),
  created_at timestamptz not null default now(),
  primary key (user_id, plan)
);

alter table public.waitlist enable row level security;

revoke all on public.waitlist from anon, authenticated;
grant select, insert, delete on public.waitlist to authenticated;

create policy waitlist_select_own on public.waitlist
  for select to authenticated using ((select auth.uid()) = user_id);
create policy waitlist_insert_own on public.waitlist
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy waitlist_delete_own on public.waitlist
  for delete to authenticated using ((select auth.uid()) = user_id);

-- 관리자 목록: API에 노출하지 않는 private 스키마. 수동 시드(이메일은 저장소에 두지 않는다).
create schema private;
revoke all on schema private from public, anon, authenticated;

create table private.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);
revoke all on private.admins from public, anon, authenticated;

create function public.is_admin() returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (select 1 from private.admins where user_id = (select auth.uid()));
$$;

create function public.admin_metrics() returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'Asia/Seoul')::date;
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  with r as (
    select * from public.records
    where user_id not in (select user_id from private.admins)
  ),
  act as (
    select user_id, (started_at at time zone 'Asia/Seoul')::date as d from r
    union
    select user_id, (completed_at at time zone 'Asia/Seoul')::date from r where completed_at is not null
  ),
  first_day as (
    select user_id, min(d) as fd from act group by user_id
  ),
  ret as (
    select n.n,
      count(*) filter (where f.fd + n.n <= v_today) as eligible,
      count(*) filter (
        where f.fd + n.n <= v_today
          and exists (select 1 from act a where a.user_id = f.user_id and a.d = f.fd + n.n)
      ) as returned
    from first_day f cross join (values (1), (7)) as n(n)
    group by n.n
  ),
  kinds as (
    select k.kind,
      count(r.id) as started,
      count(r.completed_at) as completed,
      avg(r.score_after - r.score_before) as avg_delta,
      count(*) filter (where r.score_before is not null and r.score_after is not null) as n_delta
    from (values ('session'), ('argue'), ('arena'), ('diagnostic')) as k(kind)
    left join r on r.kind = k.kind
    group by k.kind
  ),
  diag as (
    select distinct on (user_id) user_id,
      first_value(score_after) over (partition by user_id order by started_at, created_at) as first_score,
      first_value(score_after) over (partition by user_id order by started_at desc, created_at desc) as last_score,
      count(*) over (partition by user_id) as n
    from r where kind = 'diagnostic' and score_after is not null
  ),
  wl as (
    select plan, count(*) as c from public.waitlist
    where user_id not in (select user_id from private.admins)
    group by plan
  )
  select jsonb_build_object(
    'users', (select count(*) from auth.users where id not in (select user_id from private.admins)),
    'kinds', (select jsonb_object_agg(kind, jsonb_build_object(
        'started', started,
        'completed', completed,
        'completion_rate', case when started > 0 then round(completed::numeric / started, 4) end,
        'avg_delta', round(avg_delta, 2),
        'n_delta', n_delta)) from kinds),
    'd1', (select jsonb_build_object('eligible', coalesce(eligible, 0), 'returned', coalesce(returned, 0),
        'rate', case when eligible > 0 then round(returned::numeric / eligible, 4) end)
        from (select 1) x left join ret on ret.n = 1),
    'd7', (select jsonb_build_object('eligible', coalesce(eligible, 0), 'returned', coalesce(returned, 0),
        'rate', case when eligible > 0 then round(returned::numeric / eligible, 4) end)
        from (select 1) x left join ret on ret.n = 7),
    'survey', jsonb_build_object(
        'diff', (select round(avg(survey_diff), 2) from r),
        'self', (select round(avg(survey_self), 2) from r),
        'n', (select count(*) from r where survey_diff is not null or survey_self is not null)),
    'arena', jsonb_build_object(
        'win', (select count(*) from r where kind = 'arena' and verdict = 'win'),
        'draw', (select count(*) from r where kind = 'arena' and verdict = 'draw'),
        'lose', (select count(*) from r where kind = 'arena' and verdict = 'lose')),
    'diagnostics', jsonb_build_object(
        'users_with_2plus', (select count(*) from diag where n >= 2),
        'avg_change', (select round(avg(last_score - first_score), 2) from diag where n >= 2)),
    'waitlist', coalesce((select jsonb_object_agg(plan, c) from wl), '{}'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

-- 본문(data) 없는 지표 행만 내보낸다. user_ref는 user_id의 md5 앞 12자.
create function public.admin_export() returns table (
  user_ref text,
  kind text,
  started_at timestamptz,
  completed_at timestamptz,
  score_before smallint,
  score_after smallint,
  survey_diff smallint,
  survey_self smallint,
  verdict text,
  prompt_version text
)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
    select substr(md5(r.user_id::text), 1, 12), r.kind, r.started_at, r.completed_at,
           r.score_before, r.score_after, r.survey_diff, r.survey_self, r.verdict, r.prompt_version
    from public.records r
    where r.user_id not in (select a.user_id from private.admins a)
    order by r.started_at;
end;
$$;

create function public.admin_waitlist() returns table (
  email text,
  plan text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
    select u.email::text, w.plan, w.created_at
    from public.waitlist w
    join auth.users u on u.id = w.user_id
    order by w.created_at;
end;
$$;

-- 내 기록·사전 신청 삭제. usage_events는 한도 우회 방지를 위해 지우지 않는다(계정 삭제 시 cascade).
create function public.delete_my_data() returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  delete from public.records where user_id = auth.uid();
  delete from public.waitlist where user_id = auth.uid();
end;
$$;

-- 주의: 호스팅 Supabase에서 security definer 함수가 auth.users를 지울 수 있는지는 배포 전 검증해야 한다.
-- 막히면 Edge Function(서비스 키 자동 주입)으로 대체한다.
create function public.delete_my_account() returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.admin_metrics() from public, anon;
revoke execute on function public.admin_export() from public, anon;
revoke execute on function public.admin_waitlist() from public, anon;
revoke execute on function public.delete_my_data() from public, anon;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.admin_metrics() to authenticated;
grant execute on function public.admin_export() to authenticated;
grant execute on function public.admin_waitlist() to authenticated;
grant execute on function public.delete_my_data() to authenticated;
grant execute on function public.delete_my_account() to authenticated;
