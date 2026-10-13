-- LOGOS: 연구 파일럿. 코호트(코드→arm 배정), 동의, 블라인드 채점용 내보내기.

create table private.cohorts (
  code text primary key check (code ~ '^[A-Z0-9-]{8,24}$'),
  arm text not null check (arm in ('A', 'B')),
  active boolean not null default true,
  consent_version text not null,
  max_members int check (max_members > 0)
);
revoke all on private.cohorts from public, anon, authenticated;

-- 코드로 참가한다. arm은 한 번만 배정되고 바뀌지 않는다(같은 코드로 다시 부르면 변화 없이 현재 상태를 돌려준다).
-- 반환값에 arm은 없다(블라인드). 이미 참가한 사람에게는 코드 유효 여부가 드러나지 않도록 already_joined 판정을 코드 검사보다 먼저 한다.
-- 오류(메시지로 구분): invalid_code·consent_mismatch(22023), already_joined(23505), full(P0001).
create function public.join_cohort(p_code text, p_consent_version text) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_code text := upper(btrim(coalesce(p_code, '')));
  v_c private.cohorts;
  v_m public.user_meta;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  insert into public.user_meta (user_id, created_at) values (v_uid, private.user_created_at(v_uid)) on conflict (user_id) do nothing;
  select * into v_m from public.user_meta where user_id = v_uid for update;

  if v_m.arm is not null and v_m.cohort_code is distinct from v_code then
    raise exception 'already_joined' using errcode = '23505';
  end if;

  if v_code !~ '^[A-Z0-9-]{8,24}$' then
    raise exception 'invalid_code' using errcode = '22023';
  end if;

  select * into v_c from private.cohorts where code = v_code and active for update;
  if not found then
    raise exception 'invalid_code' using errcode = '22023';
  end if;

  if p_consent_version is distinct from v_c.consent_version then
    raise exception 'consent_mismatch' using errcode = '22023';
  end if;

  if v_m.arm is not null then
    -- 같은 코드: 동의를 철회했었다면 다시 동의로 기록하고(동의 버전도 지금 것으로), 그 외에는 변화 없음. joined_at은 바꾸지 않는다.
    update public.user_meta
    set consent_at = coalesce(consent_at, now()), consent_version = v_c.consent_version
    where user_id = v_uid;
    return jsonb_build_object('cohort_code', v_code, 'joined', false);
  end if;

  if v_c.max_members is not null
     and (select count(*) from public.user_meta where cohort_code = v_code) >= v_c.max_members then
    raise exception 'full' using errcode = 'P0001';
  end if;

  update public.user_meta
  set cohort_code = v_code, arm = v_c.arm, consent_version = v_c.consent_version, consent_at = now(), joined_at = now()
  where user_id = v_uid;

  return jsonb_build_object('cohort_code', v_code, 'joined', true);
end;
$$;

-- 동의 철회: 이후 채점용 내보내기에서 빠진다. 참가 상태(arm)는 유지한다.
create function public.withdraw_consent() returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  update public.user_meta set consent_at = null where user_id = auth.uid();
end;
$$;

-- 블라인드 키: 기록 → 무작위 id. 채점자에게는 blind_id만 준다.
create table private.rater_keys (
  record_id uuid primary key references public.records (id) on delete cascade,
  blind_id uuid not null unique default gen_random_uuid()
);
revoke all on private.rater_keys from public, anon, authenticated;

-- 채점자용: blind_id·form·text만, 무작위 순서. user_ref·시각·점수 없음. 동의 철회자·관리자 제외.
-- 대상은 최초 참가(joined_at) 이후에 시작한 진단뿐이다 — 참가 전에 쓴 글은 동의 범위 밖이라 내보내지 않는다.
-- 처음 내보낼 때 blind_id를 부여한다. text = 진단 기록 data의 text(store.ts DiagnosticRecord).
create function public.admin_rater_export() returns table (
  blind_id uuid,
  form text,
  "text" text
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

  -- started_at >= joined_at은 의도한 현행 유지: 진단의 시각은 제출 시각이라, 참가 후 제출한 글은 동의 범위로 본다.
  insert into private.rater_keys (record_id)
  select r.id
  from public.records r
  join public.user_meta m on m.user_id = r.user_id
  where r.kind = 'diagnostic' and m.arm is not null and m.consent_at is not null
    and r.started_at >= m.joined_at
    and not exists (select 1 from private.admins a where a.user_id = r.user_id)
  on conflict (record_id) do nothing;

  return query
    select k.blind_id, r.data->>'form', r.data->>'text'
    from public.records r
    join public.user_meta m on m.user_id = r.user_id
    join private.rater_keys k on k.record_id = r.id
    where r.kind = 'diagnostic' and m.arm is not null and m.consent_at is not null
      and r.started_at >= m.joined_at
      and not exists (select 1 from private.admins a where a.user_id = r.user_id)
    order by random();
end;
$$;

-- 블라인드 해제용 별도 파일. phase = 참가 이후(joined_at 이후 시작)에 쓴 진단의 완료 순서(1번째 pre, 2번째 post, 그 이후 later).
create function public.admin_rater_key() returns table (
  blind_id uuid,
  user_ref text,
  arm text,
  phase text,
  form text,
  score smallint
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
    with d as (
      select r.id, r.user_id, m.arm as arm, r.data->>'form' as form, r.score_after as score,
        row_number() over (partition by r.user_id order by r.completed_at, r.started_at, r.created_at) as rn
      from public.records r
      join public.user_meta m on m.user_id = r.user_id
      where r.kind = 'diagnostic' and m.arm is not null and m.consent_at is not null
        and r.started_at >= m.joined_at
        and not exists (select 1 from private.admins a where a.user_id = r.user_id)
    )
    select k.blind_id, substr(md5(d.user_id::text), 1, 12), d.arm,
           case d.rn when 1 then 'pre' when 2 then 'post' else 'later' end,
           d.form, d.score
    from d
    join private.rater_keys k on k.record_id = d.id
    order by d.arm, 2, d.rn;
end;
$$;

revoke execute on function public.join_cohort(text, text) from public, anon;
revoke execute on function public.withdraw_consent() from public, anon;
revoke execute on function public.admin_rater_export() from public, anon;
revoke execute on function public.admin_rater_key() from public, anon;
grant execute on function public.join_cohort(text, text) to authenticated;
grant execute on function public.withdraw_consent() to authenticated;
grant execute on function public.admin_rater_export() to authenticated;
grant execute on function public.admin_rater_key() to authenticated;
