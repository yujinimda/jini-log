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

// 집계는 전부 DB RPC에서 수행 — PostgREST 응답 상한(기본 1000행)으로
// 클라이언트 집계가 조용히 덜 세는 문제 방지 (codex-review 반영)

/** 글별 누적 조회수 (대시보드 목록용) */
export async function getViewTotals(): Promise<Record<string, number>> {
  const { data, error } = await client().rpc("view_totals");
  if (error) throw new Error(`조회수 조회 실패: ${error.message}`);
  const totals: Record<string, number> = {};
  for (const row of (data ?? []) as { slug: string; total: number }[]) {
    totals[row.slug] = Number(row.total);
  }
  return totals;
}

export interface DailyViews {
  date: string;
  count: number;
}

/** 기간별 추이 — slug 지정 시 해당 글만, 미지정 시 전체 합산 (대시보드 차트용) */
export async function getDailyViews(days: number, slug?: string): Promise<DailyViews[]> {
  const { data, error } = await client().rpc("daily_views", {
    p_days: days,
    p_slug: slug ?? null,
  });
  if (error) throw new Error(`조회수 추이 조회 실패: ${error.message}`);
  return ((data ?? []) as { view_date: string; total: number }[]).map((row) => ({
    date: row.view_date,
    count: Number(row.total),
  }));
}
