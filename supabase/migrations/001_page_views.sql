-- 조회수 집계 (data-model.md §2)
-- slug·일자 단위 단순 누적. 방문자 개인정보 없음 (FR-010).

create table if not exists page_views (
  slug      text    not null,
  view_date date    not null,
  count     integer not null default 0,
  primary key (slug, view_date)
);

-- 쓰기는 서버(service key)만: RLS 켜고 anon 정책을 만들지 않음 = 기본 거부
alter table page_views enable row level security;

-- 원자적 upsert 증가
create or replace function increment_view(p_slug text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into page_views (slug, view_date, count)
  values (p_slug, current_date, 1)
  on conflict (slug, view_date)
  do update set count = page_views.count + 1;
$$;

-- 집계는 DB에서 — PostgREST 응답 상한(기본 1000행)으로 클라이언트 집계가
-- 조용히 덜 세는 문제 방지 (codex-review 반영)
create or replace function view_totals()
returns table (slug text, total bigint)
language sql
security definer
set search_path = public
as $$
  select slug, sum(count)::bigint as total
  from page_views
  group by slug;
$$;

create or replace function daily_views(p_days integer, p_slug text default null)
returns table (view_date date, total bigint)
language sql
security definer
set search_path = public
as $$
  select view_date, sum(count)::bigint as total
  from page_views
  where view_date >= current_date - p_days
    and (p_slug is null or slug = p_slug)
  group by view_date
  order by view_date;
$$;

-- security definer 함수는 기본이 PUBLIC 실행 가능 — anon 키로 조작·조회가
-- 가능해지므로 서버(service_role) 외 전부 회수한다 (codex-review 반영)
revoke execute on function increment_view(text) from public;
revoke execute on function increment_view(text) from anon;
revoke execute on function increment_view(text) from authenticated;
grant execute on function increment_view(text) to service_role;

revoke execute on function view_totals() from public;
revoke execute on function view_totals() from anon;
revoke execute on function view_totals() from authenticated;
grant execute on function view_totals() to service_role;

revoke execute on function daily_views(integer, text) from public;
revoke execute on function daily_views(integer, text) from anon;
revoke execute on function daily_views(integer, text) from authenticated;
grant execute on function daily_views(integer, text) to service_role;
