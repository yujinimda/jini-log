-- 유입 출처 집계 (C4)
-- 실제 검색어는 저장할 수 없다 — 검색엔진이 Referrer-Policy로 쿼리스트링을 제거해
-- 리퍼러에 "https://www.google.com/"까지만 도착한다. 그래서 "어디서 왔는가"만 센다.
--
-- 개인정보 없음: 전체 URL이 아니라 서버에서 분류한 출처 라벨(google·naver·직접 등)만
-- 저장한다. 경로·쿼리·사용자 식별자는 어떤 형태로도 남기지 않는다 (FR-010 기조 유지).
--
-- slug를 함께 두는 이유: "어떤 글이 어디서 유입되는가"를 나중에 보게 된다.
-- 지금 안 넣으면 나중에 소급 불가 — 스키마에 미리 반영한다.

create table if not exists referrer_hits (
  slug      text    not null,
  view_date date    not null,
  source    text    not null,
  count     integer not null default 0,
  primary key (slug, view_date, source)
);

-- 쓰기는 서버(service key)만: RLS 켜고 anon 정책을 만들지 않음 = 기본 거부 (001과 동일)
alter table referrer_hits enable row level security;

-- 원자적 upsert 증가
create or replace function increment_referrer(p_slug text, p_source text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into referrer_hits (slug, view_date, source, count)
  values (p_slug, current_date, p_source, 1)
  on conflict (slug, view_date, source)
  do update set count = referrer_hits.count + 1;
$$;

-- 기간별 출처 합계 — 집계는 DB에서 (PostgREST 행 상한으로 조용히 덜 세는 문제 방지)
create or replace function referrer_totals(p_days integer)
returns table (source text, total bigint)
language sql
security definer
set search_path = public
as $$
  -- "최근 N일" = 오늘 포함 N개 날짜. current_date - p_days로 잡으면 N+1개가 들어간다
  -- (codex-review 반영). current_date는 DB 타임존 기준 — 001과 동일 기준을 쓴다.
  select source, sum(count)::bigint as total
  from referrer_hits
  where view_date > current_date - p_days
  group by source
  order by total desc;
$$;

-- security definer 함수는 기본이 PUBLIC 실행 가능 — 서버(service_role) 외 전부 회수 (001과 동일)
revoke execute on function increment_referrer(text, text) from public;
revoke execute on function increment_referrer(text, text) from anon;
revoke execute on function increment_referrer(text, text) from authenticated;
grant execute on function increment_referrer(text, text) to service_role;

revoke execute on function referrer_totals(integer) from public;
revoke execute on function referrer_totals(integer) from anon;
revoke execute on function referrer_totals(integer) from authenticated;
grant execute on function referrer_totals(integer) to service_role;
