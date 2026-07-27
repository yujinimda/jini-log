-- daily_views 기간 경계 교정 (C4, codex-review 반영)
--
-- 001의 `view_date >= current_date - p_days`는 "최근 30일"에 31개 날짜를 포함한다
-- (오늘 포함 30개가 아니라 오늘 + 과거 30일). 차트가 30칸을 그리는데 집계는 31일치를
-- 더하고 있었으므로 "최근 30일 합계"가 실제보다 하루치 많았다.
--
-- 002_referrer_hits.sql의 referrer_totals와 같은 경계(`> current_date - p_days`)로 통일한다.

create or replace function daily_views(p_days integer, p_slug text default null)
returns table (view_date date, total bigint)
language sql
security definer
set search_path = public
as $$
  select view_date, sum(count)::bigint as total
  from page_views
  where view_date > current_date - p_days
    and (p_slug is null or slug = p_slug)
  group by view_date
  order by view_date;
$$;

-- create or replace는 기존 권한을 유지하지만, 재적용 시에도 안전하도록 명시한다 (001과 동일)
revoke execute on function daily_views(integer, text) from public;
revoke execute on function daily_views(integer, text) from anon;
revoke execute on function daily_views(integer, text) from authenticated;
grant execute on function daily_views(integer, text) to service_role;
