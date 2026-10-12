-- LOGOS: 사용자 기록. 본인 행만 접근(RLS). 접근 권한은 기본 권한에 기대지 않고 명시한다.

create table public.records (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('session', 'argue', 'arena', 'diagnostic')),
  started_at timestamptz not null,
  completed_at timestamptz,
  -- diagnostic은 점수를 score_after에 둔다.
  score_before smallint check (score_before between 0 and 100),
  score_after smallint check (score_after between 0 and 100),
  survey_diff smallint check (survey_diff between 1 and 5),
  survey_self smallint check (survey_self between 1 and 5),
  verdict text check (verdict in ('win', 'draw', 'lose')),
  prompt_version text check (length(prompt_version) <= 40),
  data jsonb not null check (pg_column_size(data) < 262144),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index records_user_started_idx on public.records (user_id, started_at);

create function public.set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger records_set_updated_at
before update on public.records
for each row execute function public.set_updated_at();

alter table public.records enable row level security;

revoke all on public.records from anon, authenticated;
grant select, insert, update, delete on public.records to authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

create policy records_select_own on public.records
  for select to authenticated using ((select auth.uid()) = user_id);
create policy records_insert_own on public.records
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy records_update_own on public.records
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy records_delete_own on public.records
  for delete to authenticated using ((select auth.uid()) = user_id);
