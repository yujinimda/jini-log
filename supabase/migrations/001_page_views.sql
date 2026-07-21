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

-- security definer 함수는 기본이 PUBLIC 실행 가능 — anon 키로 조회수 조작이 가능해지므로
-- 서버(service_role) 외 전부 회수한다 (codex-review 반영)
revoke execute on function increment_view(text) from public;
revoke execute on function increment_view(text) from anon;
revoke execute on function increment_view(text) from authenticated;
grant execute on function increment_view(text) to service_role;
