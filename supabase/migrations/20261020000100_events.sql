-- LOGOS: 제품 이벤트(익명 포함)와 사용자 메타(first-touch·온보딩). 쓰기는 RPC로만 한다.
-- props에는 숫자·불리언·짧은 열거형만 넣는다. 자유 텍스트·IP·전체 referrer URL은 저장하지 않는다.
-- 잔여 위험: track()은 공개 쓰기 엔드포인트라 IP 단위 제한 없이는 완전히 막을 수 없다. 상한으로 증가 폭만 제한한다.

-- 이벤트 이름 화이트리스트. shared/events.ts의 EVENT_NAMES와 같아야 한다(shared/__tests__/events.test.ts가 검사).
-- 이름을 추가할 때는 새 마이그레이션에서 이 함수를 create or replace 한다.
create function private.event_name_ok(p text) returns boolean
language sql
immutable
set search_path = ''
as $$
  select p = any (array[
    'landing_view', 'join_view', 'app_open', 'diagnostic_start', 'diagnostic_done',
    'session_open', 'session_start', 'session_summary', 'session_complete',
    'argue_start', 'argue_complete', 'arena_start', 'arena_complete',
    'onboarding_step', 'recap_view', 'milestone_seen',
    'streak_banner_view', 'streak_banner_click', 'reminder_ics', 'signup'
  ]);
$$;

create table public.events (
  id bigint generated always as identity primary key,
  anon_id uuid not null,
  user_id uuid references auth.users (id) on delete cascade,
  name text not null check (private.event_name_ok(name)),
  props jsonb not null default '{}' check (octet_length(props::text) <= 512),
  path text check (length(path) <= 64),
  client_ts timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index events_anon_created_idx on public.events (anon_id, created_at);
create index events_user_created_idx on public.events (user_id, created_at) where user_id is not null;
create index events_created_idx on public.events (created_at);

-- 직접 접근 없음: RLS 켜고 정책·권한 모두 없음. 쓰기는 track(), 읽기는 관리자 RPC.
alter table public.events enable row level security;
revoke all on public.events from anon, authenticated;

-- 배치로 이벤트를 기록한다. 이벤트 객체: {name, props?, path?, ts?(epoch ms)}.
-- 호출당 25건, anon별 30건/분·300건/24h, 전역 600건/분·20000건/24h. 상한 계산은 advisory lock으로 직렬화한다(검사-삽입 경합 방지).
-- 호출의 5%는 180일 지난 이벤트를 최대 2000건 지운다(보조 정리 — 정기 파기는 파일 끝의 pg_cron 잡이 맡는다). 잘못된 이름·큰 props·64자 넘는 path·중첩 props·32자 넘는 문자열 값(자유 텍스트 차단)은 조용히 버린다.
-- 로그인 상태의 호출은 삽입 뒤 이 기기(p_anon)의 미연결 이벤트도 내 계정에 잇는다(claim_profile 이후 늦게 커밋된 익명 이벤트 보정).
-- client_ts는 now() ±1일로 자른다. 반환값은 저장한 건수.
create function public.track(p_anon uuid, p_events jsonb) returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_now timestamptz := now();
  v_room int;
  v_n int := 0;
begin
  if p_anon is null or p_events is null or jsonb_typeof(p_events) <> 'array' then
    return 0;
  end if;

  -- 상한 검사와 삽입 사이에 다른 호출이 끼어들지 못하도록 트랜잭션 단위로 직렬화한다.
  perform pg_advisory_xact_lock(20261020);

  v_room := least(
    300 - (select count(*) from public.events where anon_id = p_anon and created_at > v_now - interval '24 hours'),
    30 - (select count(*) from public.events where anon_id = p_anon and created_at > v_now - interval '1 minute'),
    600 - (select count(*) from public.events where created_at > v_now - interval '1 minute'),
    20000 - (select count(*) from public.events where created_at > v_now - interval '24 hours'),
    25
  )::int;
  if v_room <= 0 then
    return 0;
  end if;

  with ins as (
    insert into public.events (anon_id, user_id, name, props, path, client_ts)
    select p_anon, v_uid, x.name, x.props, x.path, x.ts
    from (
      select t.ord,
        t.e->>'name' as name,
        case when jsonb_typeof(t.e->'props') = 'object' then t.e->'props' else '{}'::jsonb end as props,
        t.e->>'path' as path,
        case when jsonb_typeof(t.e->'ts') = 'number'
          then to_timestamp(least(greatest(
            (t.e->>'ts')::numeric / 1000,
            extract(epoch from v_now) - 86400),
            extract(epoch from v_now) + 86400))
          else v_now end as ts
      from jsonb_array_elements(p_events) with ordinality as t(e, ord)
      where t.ord <= 25 and jsonb_typeof(t.e) = 'object'
    ) x
    where private.event_name_ok(x.name)
      and (x.path is null or length(x.path) <= 64)
      and octet_length(x.props::text) <= 512
      and not exists (
        select 1 from jsonb_each(x.props) kv
        where jsonb_typeof(kv.value) in ('object', 'array', 'null')
          or (jsonb_typeof(kv.value) = 'string' and length(kv.value #>> '{}') > 32)
      )
    order by x.ord
    limit v_room
    returning 1
  )
  select count(*) into v_n from ins;

  -- claim_profile 뒤에 커밋된 익명 이벤트(오프라인 큐·경합)가 연결되지 않고 남지 않게 한다(events_anon_created_idx 사용).
  if v_uid is not null then
    update public.events
    set user_id = v_uid
    where anon_id = p_anon and user_id is null and created_at > v_now - interval '30 days';
  end if;

  -- 기회적 정리: 보관 기간(180일)이 지난 이벤트를 소량씩 지운다.
  if random() < 0.05 then
    delete from public.events
    where id in (select id from public.events where created_at < v_now - interval '180 days' limit 2000);
  end if;

  return v_n;
end;
$$;

-- 사용자 메타: first-touch(최초 유입)와 파일럿 참가·온보딩 상태. 본인 select만, 쓰기는 RPC로만.
create table public.user_meta (
  user_id uuid primary key references auth.users (id) on delete cascade,
  first_source text check (length(first_source) <= 64),
  first_medium text check (length(first_medium) <= 64),
  first_campaign text check (length(first_campaign) <= 64),
  first_ref_host text check (length(first_ref_host) <= 64),
  cohort_code text check (length(cohort_code) <= 24),
  arm text check (arm in ('A', 'B')),
  consent_version text check (length(consent_version) <= 40),
  consent_at timestamptz,
  joined_at timestamptz, -- 파일럿 최초 참가 시각. 재참가·동의 철회로 바뀌지 않는다(채점 대상 범위의 기준)
  onboarded_at timestamptz,
  claimed_at timestamptz, -- claim_profile이 first-touch를 처음 채운 시각. join_cohort·mark_onboarded가 먼저 행을 만들어도 null이라 이후 claim이 채울 수 있다
  created_at timestamptz not null default now()
);

alter table public.user_meta enable row level security;

revoke all on public.user_meta from anon, authenticated;
-- arm(파일럿 군)은 컬럼 단위로 제외한다: 참가자에게 블라인드. 파일럿 여부는 cohort_code·consent_at으로 판단한다.
grant select (user_id, first_source, first_medium, first_campaign, first_ref_host,
              cohort_code, consent_version, consent_at, joined_at, onboarded_at, created_at)
  on public.user_meta to authenticated;

create policy user_meta_select_own on public.user_meta
  for select to authenticated using ((select auth.uid()) = user_id);

-- 이 마이그레이션 이전에 가입한 계정도 가입 시각을 갖게 한다(없으면 첫 로그인 때 신규 가입자로 집계된다).
-- claimed_at도 채워 둔다: 기존 가입자는 이후 첫 claim_profile에서 signup을 내지 않는다.
insert into public.user_meta (user_id, created_at, claimed_at)
select u.id, u.created_at, now() from auth.users u
on conflict (user_id) do nothing;

-- user_meta 행을 새로 만들 때 쓰는 가입 시각: auth.users.created_at(없으면 now()).
create function private.user_created_at(p_uid uuid) returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select u.created_at from auth.users u where u.id = p_uid), now());
$$;

-- 로그인 직후 한 번: 프로필 행을 만들고(first-touch는 비어 있을 때만 채우고 덮어쓰지 않는다) 30일 내 익명 이벤트를 내 계정에 연결한다.
-- p_touch 키: source|utm_source, medium|utm_medium, campaign|utm_campaign, ref_host (각 64자로 자른다).
-- join_cohort·mark_onboarded가 먼저 빈 행을 만들었어도 claimed_at이 null이면 first-touch를 채운다(coalesce(기존, 새값)).
-- 반환 {"created": bool} — true면 이번 호출에서 claimed_at이 null에서 채워졌고 계정이 하루 안에 가입한 경우(signup 이벤트용). 오래된 계정의 첫 로그인은 false.
create function public.claim_profile(p_anon uuid, p_touch jsonb default '{}') returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_touch jsonb := case when jsonb_typeof(p_touch) = 'object' then p_touch else '{}'::jsonb end;
  v_rows int;
  v_joined timestamptz := private.user_created_at(v_uid);
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  insert into public.user_meta (user_id, created_at, claimed_at, first_source, first_medium, first_campaign, first_ref_host)
  values (
    v_uid,
    v_joined,
    now(),
    nullif(substr(regexp_replace(coalesce(v_touch->>'source', v_touch->>'utm_source', ''), '[[:cntrl:]]', '', 'g'), 1, 64), ''),
    nullif(substr(regexp_replace(coalesce(v_touch->>'medium', v_touch->>'utm_medium', ''), '[[:cntrl:]]', '', 'g'), 1, 64), ''),
    nullif(substr(regexp_replace(coalesce(v_touch->>'campaign', v_touch->>'utm_campaign', ''), '[[:cntrl:]]', '', 'g'), 1, 64), ''),
    nullif(substr(regexp_replace(coalesce(v_touch->>'ref_host', ''), '[[:cntrl:]]', '', 'g'), 1, 64), '')
  )
  on conflict (user_id) do update set
    claimed_at = now(),
    first_source = coalesce(public.user_meta.first_source, excluded.first_source),
    first_medium = coalesce(public.user_meta.first_medium, excluded.first_medium),
    first_campaign = coalesce(public.user_meta.first_campaign, excluded.first_campaign),
    first_ref_host = coalesce(public.user_meta.first_ref_host, excluded.first_ref_host)
  where public.user_meta.claimed_at is null;
  get diagnostics v_rows = row_count;

  if p_anon is not null then
    update public.events
    set user_id = v_uid
    where anon_id = p_anon and user_id is null and created_at > now() - interval '30 days';
  end if;

  return jsonb_build_object('created', v_rows > 0 and v_joined > now() - interval '1 day');
end;
$$;

create function public.mark_onboarded() returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  insert into public.user_meta (user_id, created_at, onboarded_at) values (auth.uid(), private.user_created_at(auth.uid()), now())
  on conflict (user_id) do update set onboarded_at = coalesce(public.user_meta.onboarded_at, now());
end;
$$;

-- 내 기록·사전 신청·이벤트·프로필 삭제. usage_events는 한도 우회 방지를 위해 지우지 않는다(계정 삭제 시 cascade).
-- 지워지는 이벤트: 계정에 연결된 것 + p_anon으로 지정한 이 기기의 미연결 이벤트. 그 밖의 미연결 이벤트는 180일 보관 후 파기한다.
-- events·user_meta는 직접 delete 권한이 없어 security definer로 바꾸고, 모든 delete를 auth.uid()로 한정한다.
-- p_anon(이 기기의 익명 id)을 주면 아직 계정에 연결되지 않은(user_id null) 그 익명 이벤트도 지운다.
-- 계정 삭제(delete_my_account)는 auth.users 삭제의 on delete cascade로 계정에 연결된 events와 user_meta도 지운다(연결되지 않은 이벤트는 180일 뒤 파기).
drop function public.delete_my_data();
create function public.delete_my_data(p_anon uuid default null) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  delete from public.records where user_id = auth.uid();
  delete from public.waitlist where user_id = auth.uid();
  delete from public.events where user_id = auth.uid();
  if p_anon is not null then
    delete from public.events where anon_id = p_anon and user_id is null;
  end if;
  delete from public.user_meta where user_id = auth.uid();
end;
$$;

revoke execute on function public.track(uuid, jsonb) from public;
revoke execute on function public.claim_profile(uuid, jsonb) from public, anon;
revoke execute on function public.mark_onboarded() from public, anon;
grant execute on function public.track(uuid, jsonb) to anon, authenticated;
grant execute on function public.claim_profile(uuid, jsonb) to authenticated;
grant execute on function public.mark_onboarded() to authenticated;
revoke execute on function public.delete_my_data(uuid) from public, anon;
grant execute on function public.delete_my_data(uuid) to authenticated;

-- 180일 파기를 트래픽에 맡기지 않도록 pg_cron이 있으면 매일 03:17(UTC)에 지운다. 같은 이름의 잡이 이미 있으면 다시 등록하지 않는다.
-- pg_cron 없는 환경(로컬·PGlite)에서는 건너뛰고 track 호출의 기회적 정리에 기대므로, 트래픽이 없으면 파기가 지연될 수 있음.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    if not exists (select 1 from cron.job where jobname = 'logos-purge-events') then
      perform cron.schedule('logos-purge-events', '17 3 * * *',
        $c$delete from public.events where created_at < now() - interval '180 days'$c$);
    end if;
  end if;
end;
$$;
