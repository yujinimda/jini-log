// 조회수 read/write — Supabase 서버 전용 (research R5). 소유: 레인 A
// 쓰기는 반드시 서버 route handler에서만 호출한다 (service key — 브라우저 노출 금지).
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

function client(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_KEY가 설정되지 않았습니다");
  }
  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}

/** 페이지로드 1회 기록 — 호출 전 운영자·봇 제외는 API 라우트(레인 B) 책임 */
export async function incrementView(slug: string): Promise<void> {
  const { error } = await client().rpc("increment_view", { p_slug: slug });
  if (error) throw new Error(`조회수 기록 실패: ${error.message}`);
}

interface ViewRow {
  slug: string;
  view_date: string;
  count: number;
}

/** 글별 누적 조회수 (대시보드 목록용) */
export async function getViewTotals(): Promise<Record<string, number>> {
  const { data, error } = await client().from("page_views").select("slug, count");
  if (error) throw new Error(`조회수 조회 실패: ${error.message}`);
  const totals: Record<string, number> = {};
  for (const row of (data ?? []) as Pick<ViewRow, "slug" | "count">[]) {
    totals[row.slug] = (totals[row.slug] ?? 0) + row.count;
  }
  return totals;
}

export interface DailyViews {
  date: string;
  count: number;
}

/** 기간별 추이 — slug 지정 시 해당 글만, 미지정 시 전체 합산 (대시보드 차트용) */
export async function getDailyViews(days: number, slug?: string): Promise<DailyViews[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  let query = client().from("page_views").select("view_date, count").gte("view_date", since);
  if (slug) query = query.eq("slug", slug);
  const { data, error } = await query;
  if (error) throw new Error(`조회수 추이 조회 실패: ${error.message}`);

  const byDate = new Map<string, number>();
  for (const row of (data ?? []) as Pick<ViewRow, "view_date" | "count">[]) {
    byDate.set(row.view_date, (byDate.get(row.view_date) ?? 0) + row.count);
  }
  return [...byDate.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}
