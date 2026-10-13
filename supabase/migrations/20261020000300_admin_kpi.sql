-- LOGOS: 관리자 KPI. 모두 is_admin() 게이트, 관리자 본인 활동은 제외. 사람 키 = coalesce(user_id, anon_id).

-- 방문(이벤트) 기반 퍼널. 단계별 고유 사람 수(기간 내 해당 이벤트를 낸 사람), D1/D7 재방문,
-- 비회원 진단 점수 분포(diagnostic_done의 props.score, 5구간; props.guest가 true인 이벤트).
-- D1/D7: 첫 방문일은 기간과 무관하게 전체 이벤트에서 사람별 최소일로 구하고, 첫 방문일이 기간 안인 사람만 코호트로 센다.
-- 180일 파기로 옛 이벤트가 사라지면 기존 사용자가 신규로 재분류되므로, 계정이 있는 사람은 user_meta.created_at(KST 날짜)을 하한으로 쓴다.
-- 익명 방문자는 파기된 첫 방문일을 복원할 수 없어 보정하지 못한다(180일 넘게 지난 뒤 다시 온 익명 방문자는 신규로 보인다).
-- north_star: 기간 내 시작한 session(argue는 별도 키) 중 최종 정리(data.finalSummary가 비어 있지 않음)를 쓴 비율. 완료·채점 여부 무관.
-- d7_session: 첫 session/argue 시작일(KST) 기준 정확히 7일째에 session/argue를 시작한 사용자 비율(전체 기간, 분모 = 첫 시작일이 7일 이상 전).
create function public.admin_funnel(p_days int default 30) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_days int := least(greatest(coalesce(p_days, 30), 1), 3650);
  v_today date := (now() at time zone 'Asia/Seoul')::date;
  v_from date := ((now() - make_interval(days => v_days)) at time zone 'Asia/Seoul')::date;
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  with ev_all as (
    select coalesce(e.user_id::text, e.anon_id::text) as person, e.user_id, e.name, e.props, e.created_at,
           (e.created_at at time zone 'Asia/Seoul')::date as d
    from public.events e
    where not exists (select 1 from private.admins a where a.user_id = e.user_id)
  ),
  ev as (
    select * from ev_all where created_at >= now() - make_interval(days => v_days)
  ),
  steps as (
    select s.name, s.ord, count(distinct ev.person) as persons
    from (values ('landing_view', 1), ('diagnostic_start', 2), ('diagnostic_done', 3),
                 ('signup', 4), ('session_start', 5), ('session_complete', 6)) as s(name, ord)
    left join ev on ev.name = s.name
    group by s.name, s.ord
  ),
  first_day as (
    select a.person, least(min(a.d), min((m.created_at at time zone 'Asia/Seoul')::date)) as fd
    from ev_all a
    left join public.user_meta m on m.user_id = a.user_id
    group by a.person
    having least(min(a.d), min((m.created_at at time zone 'Asia/Seoul')::date)) >= v_from
  ),
  ret as (
    select n.n,
      count(*) filter (where f.fd + n.n <= v_today) as eligible,
      count(*) filter (
        where f.fd + n.n <= v_today
          and exists (select 1 from ev_all x where x.person = f.person and x.d = f.fd + n.n)
      ) as returned
    from first_day f cross join (values (1), (7)) as n(n)
    group by n.n
  ),
  guest as (
    select (ev.props->>'score')::numeric as score
    from ev
    where ev.name = 'diagnostic_done' and ev.props->'guest' = 'true'::jsonb and jsonb_typeof(ev.props->'score') = 'number'
  ),
  rec as (
    select r.user_id, r.kind, r.started_at, (r.started_at at time zone 'Asia/Seoul')::date as d, r.data
    from public.records r
    where r.kind in ('session', 'argue')
      and not exists (select 1 from private.admins a where a.user_id = r.user_id)
  ),
  rec_in as (
    select * from rec where started_at >= now() - make_interval(days => v_days)
  ),
  first_start as (
    select user_id, min(d) as fd from rec group by user_id
  ),
  d7s as (
    select count(*) filter (where f.fd + 7 <= v_today) as eligible,
      count(*) filter (
        where f.fd + 7 <= v_today
          and exists (select 1 from rec x where x.user_id = f.user_id and x.d = f.fd + 7)
      ) as returned
    from first_start f
  )
  select jsonb_build_object(
    'days', v_days,
    'steps', (select jsonb_agg(jsonb_build_object(
        'name', name,
        'persons', persons,
        'rate_from_landing', case when (select persons from steps where ord = 1) > 0
          then round(persons::numeric / (select persons from steps where ord = 1), 4) end) order by ord) from steps),
    'd1', (select jsonb_build_object('eligible', coalesce(eligible, 0), 'returned', coalesce(returned, 0),
        'rate', case when eligible > 0 then round(returned::numeric / eligible, 4) end)
        from (select 1) x left join ret on ret.n = 1),
    'd7', (select jsonb_build_object('eligible', coalesce(eligible, 0), 'returned', coalesce(returned, 0),
        'rate', case when eligible > 0 then round(returned::numeric / eligible, 4) end)
        from (select 1) x left join ret on ret.n = 7),
    'guest_scores', jsonb_build_object(
        'n', (select count(*) from guest),
        '0-19', (select count(*) from guest where score < 20),
        '20-39', (select count(*) from guest where score >= 20 and score < 40),
        '40-59', (select count(*) from guest where score >= 40 and score < 60),
        '60-79', (select count(*) from guest where score >= 60 and score < 80),
        '80-100', (select count(*) from guest where score >= 80)),
    'north_star', jsonb_build_object(
        'session', (select jsonb_build_object('started', count(*), 'summarized', count(*) filter (where coalesce(data->>'finalSummary', '') <> ''),
            'rate', case when count(*) > 0 then round(count(*) filter (where coalesce(data->>'finalSummary', '') <> '')::numeric / count(*), 4) end)
            from rec_in where kind = 'session'),
        'argue', (select jsonb_build_object('started', count(*), 'summarized', count(*) filter (where coalesce(data->>'finalSummary', '') <> ''),
            'rate', case when count(*) > 0 then round(count(*) filter (where coalesce(data->>'finalSummary', '') <> '')::numeric / count(*), 4) end)
            from rec_in where kind = 'argue')),
    'd7_session', (select jsonb_build_object('eligible', eligible, 'returned', returned,
        'rate', case when eligible > 0 then round(returned::numeric / eligible, 4) end) from d7s)
  ) into v_result;

  return v_result;
end;
$$;

-- 이탈 지점: 미완료 세션·논증의 stageReached 분포(32자로 자름), 정리문(finalSummary)을 썼지만 완료하지 않은 수,
-- 첫 답변 전 이탈(session_open 후 1시간 안에 그 사람의 session 기록이 없음. 1시간이 안 지난 이벤트는 제외).
-- 기존 세션을 이어서 연 경우(props.resume = true)는 새 답변 기록이 없는 게 정상이므로 제외한다.
-- 시각 비교는 client_ts(±1일로 자른 기기 시각)로 한다 — 오프라인 큐로 늦게 도착한 이벤트(created_at)와 기록 시작 시각(기기 시각)을 같은 기준에 둔다.
create function public.admin_abandon() returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  with inc as (
    select r.kind, coalesce(nullif(left(r.data->>'stageReached', 32), ''), 'unknown') as stage, r.data
    from public.records r
    where r.kind in ('session', 'argue') and r.completed_at is null
      and not exists (select 1 from private.admins a where a.user_id = r.user_id)
  ),
  opens as (
    select e.id, e.user_id, coalesce(e.user_id::text, e.anon_id::text) as person, e.client_ts
    from public.events e
    where e.name = 'session_open' and e.created_at < now() - interval '1 hour'
      and e.props->'resume' is distinct from 'true'::jsonb
      and not exists (select 1 from private.admins a where a.user_id = e.user_id)
  )
  select jsonb_build_object(
    'incomplete', (select count(*) from inc),
    'by_stage', coalesce((
        select jsonb_object_agg(kind || ':' || stage, c)
        from (select kind, stage, count(*) as c from inc group by kind, stage) s), '{}'::jsonb),
    'summary_no_complete', (select count(*) from inc where coalesce(inc.data->>'finalSummary', '') <> ''),
    'open_no_record', (
        select count(*) from opens o
        where not exists (
          select 1 from public.records r
          where r.user_id = o.user_id and r.kind = 'session'
            and r.started_at >= o.client_ts and r.started_at <= o.client_ts + interval '1 hour')),
    'opens', (select count(*) from opens)
  ) into v_result;

  return v_result;
end;
$$;

-- 유입 경로: 기간 내 가입자(user_meta)를 first_source별로 — 가입, 온보딩 완료, 기록 완료 1건 이상. 유입 도메인 상위 20.
create function public.admin_acquisition(p_days int default 30) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_days int := least(greatest(coalesce(p_days, 30), 1), 3650);
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  with m as (
    select u.user_id, coalesce(u.first_source, '(direct)') as source, u.first_ref_host,
           u.onboarded_at is not null as onboarded,
           exists (select 1 from public.records r where r.user_id = u.user_id and r.completed_at is not null) as completed_any
    from public.user_meta u
    where u.created_at >= now() - make_interval(days => v_days)
      and not exists (select 1 from private.admins a where a.user_id = u.user_id)
  )
  select jsonb_build_object(
    'days', v_days,
    'signups', (select count(*) from m),
    'by_source', coalesce((
        select jsonb_agg(jsonb_build_object('source', source, 'signups', c, 'onboarded', o, 'completed_any', k) order by c desc, source)
        from (select source, count(*) as c, count(*) filter (where onboarded) as o, count(*) filter (where completed_any) as k
              from m group by source) s), '[]'::jsonb),
    'by_ref_host', coalesce((
        select jsonb_agg(jsonb_build_object('ref_host', first_ref_host, 'signups', c) order by c desc, first_ref_host)
        from (select first_ref_host, count(*) as c from m where first_ref_host is not null
              group by first_ref_host order by count(*) desc, first_ref_host limit 20) h), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

-- 파일럿 arm별 지표(동의한 참가자 기준): n·동의 수, 세션/논증 완주율, 세션 내 Δ, 설문, 재진단 변화(첫→마지막),
-- D7 재방문(기록·이벤트 활동일), B군 오염 수(B군인데 코칭 기록이 있는 참가자).
-- 모든 군별 집계는 참가(joined_at) 이후의 기록(started_at)·이벤트(created_at)만 센다. D7 첫 활동일도 참가 이후 기준.
create function public.admin_arms() returns jsonb
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

  with p as (
    select m.user_id, m.arm, m.consent_at is not null as consented, m.joined_at
    from public.user_meta m
    where m.arm is not null
      and not exists (select 1 from private.admins a where a.user_id = m.user_id)
  ),
  c as (select * from p where consented),
  r as (
    select r.*, c.arm from public.records r join c on c.user_id = r.user_id
    where r.started_at >= c.joined_at
  ),
  act as (
    select user_id, (started_at at time zone 'Asia/Seoul')::date as d from r
    union
    select user_id, (completed_at at time zone 'Asia/Seoul')::date from r where completed_at is not null
    union
    select e.user_id, (e.created_at at time zone 'Asia/Seoul')::date
    from public.events e join c on c.user_id = e.user_id
    where e.created_at >= c.joined_at
  ),
  first_day as (
    select user_id, min(d) as fd from act group by user_id
  ),
  d7 as (
    select c.arm,
      count(*) filter (where f.fd + 7 <= v_today) as eligible,
      count(*) filter (
        where f.fd + 7 <= v_today
          and exists (select 1 from act a where a.user_id = f.user_id and a.d = f.fd + 7)
      ) as returned
    from first_day f join c on c.user_id = f.user_id
    group by c.arm
  ),
  diag as (
    select distinct on (r.user_id) r.user_id, r.arm,
      first_value(r.score_after) over (partition by r.user_id order by r.started_at, r.created_at) as first_score,
      first_value(r.score_after) over (partition by r.user_id order by r.started_at desc, r.created_at desc) as last_score,
      count(*) over (partition by r.user_id) as n
    from r where r.kind = 'diagnostic' and r.score_after is not null
  ),
  per_arm as (
    select a.arm,
      (select count(*) from p where p.arm = a.arm) as n,
      (select count(*) from c where c.arm = a.arm) as consented,
      (select count(*) from r where r.arm = a.arm and r.kind in ('session', 'argue')) as started,
      (select count(*) from r where r.arm = a.arm and r.kind in ('session', 'argue') and r.completed_at is not null) as completed,
      (select round(avg(r.score_after - r.score_before), 2) from r
         where r.arm = a.arm and r.kind in ('session', 'argue') and r.score_before is not null and r.score_after is not null) as avg_delta,
      (select count(*) from r
         where r.arm = a.arm and r.kind in ('session', 'argue') and r.score_before is not null and r.score_after is not null) as n_delta,
      (select round(avg(r.survey_diff), 2) from r where r.arm = a.arm) as survey_diff,
      (select round(avg(r.survey_self), 2) from r where r.arm = a.arm) as survey_self,
      (select count(*) from r where r.arm = a.arm and (r.survey_diff is not null or r.survey_self is not null)) as n_survey,
      (select count(*) from diag where diag.arm = a.arm and diag.n >= 2) as n_rediag,
      (select round(avg(diag.last_score - diag.first_score), 2) from diag where diag.arm = a.arm and diag.n >= 2) as rediag_change,
      coalesce((select eligible from d7 where d7.arm = a.arm), 0) as d7_eligible,
      coalesce((select returned from d7 where d7.arm = a.arm), 0) as d7_returned,
      (select count(distinct r.user_id) from r
         where r.arm = a.arm and a.arm = 'B' and r.kind in ('session', 'argue', 'arena')) as contaminated
    from (values ('A'), ('B')) as a(arm)
  )
  select coalesce(jsonb_object_agg(arm, jsonb_build_object(
      'n', n,
      'consented', consented,
      'started', started,
      'completed', completed,
      'completion_rate', case when started > 0 then round(completed::numeric / started, 4) end,
      'avg_delta', avg_delta,
      'n_delta', n_delta,
      'survey_diff', survey_diff,
      'survey_self', survey_self,
      'n_survey', n_survey,
      'rediagnostic', jsonb_build_object('n', n_rediag, 'avg_change', rediag_change),
      'd7', jsonb_build_object('eligible', d7_eligible, 'returned', d7_returned,
          'rate', case when d7_eligible > 0 then round(d7_returned::numeric / d7_eligible, 4) end),
      'contaminated', contaminated)), '{}'::jsonb)
  into v_result
  from per_arm;

  return v_result;
end;
$$;

-- 보관 기간이 지난 이벤트 삭제(기본 180일). 삭제한 건수를 돌려준다.
create function public.admin_purge_events(p_days int default 180) returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n int;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_days is null or p_days < 1 then
    raise exception 'invalid_days' using errcode = '22023';
  end if;
  delete from public.events where created_at < now() - make_interval(days => p_days);
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- admin_export에 form·arm·first_source 추가. 기존 컬럼과 순서는 그대로 앞에 둔다.
drop function public.admin_export();
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
  prompt_version text,
  form text,
  arm text,
  first_source text
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
           r.score_before, r.score_after, r.survey_diff, r.survey_self, r.verdict, r.prompt_version,
           case when r.data->>'form' in ('f0', 'f1', 'f2', 'f3') then r.data->>'form' end, m.arm, m.first_source
    from public.records r
    left join public.user_meta m on m.user_id = r.user_id
    where r.user_id not in (select a.user_id from private.admins a)
    order by r.started_at;
end;
$$;

revoke execute on function public.admin_funnel(int) from public, anon;
revoke execute on function public.admin_abandon() from public, anon;
revoke execute on function public.admin_acquisition(int) from public, anon;
revoke execute on function public.admin_arms() from public, anon;
revoke execute on function public.admin_purge_events(int) from public, anon;
revoke execute on function public.admin_export() from public, anon;
grant execute on function public.admin_funnel(int) to authenticated;
grant execute on function public.admin_abandon() to authenticated;
grant execute on function public.admin_acquisition(int) to authenticated;
grant execute on function public.admin_arms() to authenticated;
grant execute on function public.admin_purge_events(int) to authenticated;
grant execute on function public.admin_export() to authenticated;
