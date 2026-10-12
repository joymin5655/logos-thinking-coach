-- LOGOS: 계정 삭제 후 재가입으로 일 한도를 초기화하는 우회를 막고, 사용자별 records 행 수 상한을 둔다.

-- 1) 삭제된 계정의 최근 사용량을 이메일 해시로 이월한다(이메일 원문은 저장하지 않는다).
create table private.deleted_usage (
  email_hash text not null,
  kind text not null,
  ref uuid not null,
  created_at timestamptz not null
);

create index deleted_usage_email_created_idx on private.deleted_usage (email_hash, created_at);

revoke all on private.deleted_usage from public, anon, authenticated;

create or replace function public.delete_my_account() returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select email into v_email from auth.users where id = v_uid;
  if v_email is not null then
    insert into private.deleted_usage (email_hash, kind, ref, created_at)
    select md5(lower(v_email)), kind, ref, created_at
    from public.usage_events
    where user_id = v_uid and created_at >= now() - interval '1 day';
  end if;
  delete from private.deleted_usage where created_at < now() - interval '2 days';

  delete from auth.users where id = v_uid;
end;
$$;

create function public.carried_usage(p_since timestamptz) returns table (kind text, ref uuid)
language sql
security definer
stable
set search_path = ''
as $$
  select d.kind, d.ref
  from private.deleted_usage d
  where d.created_at >= p_since
    and d.email_hash = (select md5(lower(u.email)) from auth.users u where u.id = auth.uid());
$$;

revoke execute on function public.carried_usage(timestamptz) from public, anon;
grant execute on function public.carried_usage(timestamptz) to authenticated;

-- 2) consume_quota: 이월분을 오늘 사용량에 합산한다. 나머지 의미는 그대로.
create or replace function public.consume_quota(
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
  from (
    select e.kind, e.ref from public.usage_events e where e.user_id = v_uid and e.created_at >= v_day_start
    union all
    select c.kind, c.ref from public.carried_usage(v_day_start) c
  ) u;

  select count(*) into v_ref_calls
  from (
    select e.kind, e.ref from public.usage_events e where e.user_id = v_uid and e.created_at >= v_day_start
    union all
    select c.kind, c.ref from public.carried_usage(v_day_start) c
  ) u
  where u.ref = p_ref;

  select count(distinct u.ref) into v_refs
  from (
    select e.kind, e.ref from public.usage_events e where e.user_id = v_uid and e.created_at >= v_day_start
    union all
    select c.kind, c.ref from public.carried_usage(v_day_start) c
  ) u
  where u.kind = p_kind;

  select not exists (
    select 1 from (
      select e.kind, e.ref from public.usage_events e where e.user_id = v_uid and e.created_at >= v_day_start
      union all
      select c.kind, c.ref from public.carried_usage(v_day_start) c
    ) u
    where u.kind = p_kind and u.ref = p_ref
  ) into v_new_ref;

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

-- 3) 사용자별 records 상한. 새 행 INSERT만 센다(이미 있는 id의 upsert는 UPDATE 경로이므로 통과).
create function public.enforce_record_limit() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.records where id = new.id) then
    return new; -- on conflict do update 로 이어지는 기존 행
  end if;
  if (select count(*) from public.records where user_id = new.user_id) >= 2000 then
    raise exception 'record_limit' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke execute on function public.enforce_record_limit() from public, anon, authenticated;

create trigger records_limit before insert on public.records
  for each row execute function public.enforce_record_limit();
