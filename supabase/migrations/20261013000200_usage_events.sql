-- LOGOS: 이용 한도 원장. 추가만 가능(update/delete 권한·정책 없음).

create table public.usage_events (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('session', 'argue', 'arena', 'diagnostic')),
  ref uuid not null,
  action text not null check (length(action) <= 32),
  created_at timestamptz not null default now()
);

create index usage_events_user_created_idx on public.usage_events (user_id, created_at desc);

alter table public.usage_events enable row level security;

revoke all on public.usage_events from anon, authenticated;
grant select, insert on public.usage_events to authenticated;

create policy usage_events_select_own on public.usage_events
  for select to authenticated using ((select auth.uid()) = user_id);
-- 과거·미래 시각으로 한도 계산을 속이지 못하게 한다.
create policy usage_events_insert_own on public.usage_events
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and created_at between now() - interval '1 minute' and now() + interval '1 minute'
  );

-- 한도 확인과 기록을 한 번에. 사용자 권한(RLS 적용)으로 실행되고, 사용자별 advisory lock으로 직렬화한다.
-- 하루 = 한국 시간 자정 기준. p_day_ceiling: 일 전체 호출 상한, p_max_refs: 오늘 시작 가능한 ref(판) 수,
-- p_calls_per_ref: ref 하나당 호출 수.
create function public.consume_quota(
  p_kind text,
  p_ref uuid,
  p_action text,
  p_max_refs int,
  p_calls_per_ref int,
  p_day_ceiling int
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_day_start timestamptz := date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul';
  v_total int;
  v_ref_calls int;
  v_refs int;
  v_new_ref boolean;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));

  select count(*) into v_total
  from public.usage_events
  where user_id = v_uid and created_at >= v_day_start;

  select count(*) into v_ref_calls
  from public.usage_events
  where user_id = v_uid and created_at >= v_day_start and ref = p_ref;

  select count(distinct ref) into v_refs
  from public.usage_events
  where user_id = v_uid and created_at >= v_day_start and kind = p_kind;

  v_new_ref := not exists (
    select 1 from public.usage_events
    where user_id = v_uid and created_at >= v_day_start and kind = p_kind and ref = p_ref
  );

  if v_total >= p_day_ceiling then
    return jsonb_build_object('ok', false, 'reason', 'day');
  end if;
  if v_new_ref and v_refs >= p_max_refs then
    return jsonb_build_object('ok', false, 'reason', 'refs');
  end if;
  if v_ref_calls >= p_calls_per_ref then
    return jsonb_build_object('ok', false, 'reason', 'ref_calls');
  end if;

  insert into public.usage_events (user_id, kind, ref, action)
  values (v_uid, p_kind, p_ref, p_action);

  return jsonb_build_object(
    'ok', true,
    'user_id', v_uid,
    'remaining', jsonb_build_object(
      'day', p_day_ceiling - v_total - 1,
      'refs', p_max_refs - v_refs - (case when v_new_ref then 1 else 0 end),
      'ref_calls', p_calls_per_ref - v_ref_calls - 1
    )
  );
end;
$$;

revoke execute on function public.consume_quota(text, uuid, text, int, int, int) from public, anon;
grant execute on function public.consume_quota(text, uuid, text, int, int, int) to authenticated;
