// 어드민 대시보드 (T041, US4 → 002 T023: shadcn Table + 클라이언트 정렬) — 발행/초안 구분
// 목록(GitHub 최신본), invalid 초안 오류 표시, 글별 조회수·최근 발행일 (FR-011·014). 소유: 레인 C
import Link from "next/link";
import { getContentList } from "@/lib/github";
import { getDailyViews, getViewTotals, type DailyViews } from "@/lib/views";
import { DeployBanner } from "@/components/admin/dashboard/deploy-banner";
import { PostTable } from "@/components/admin/dashboard/post-table";
import { ViewsChart } from "@/components/admin/dashboard/views-chart";

export const metadata = { title: "대시보드" };
// GitHub 최신본·조회수는 요청 시점 데이터 — 캐시 금지
export const dynamic = "force-dynamic";

const TREND_DAYS = 30;

interface ViewsData {
  /** null = 조회수 로드 실패(알 수 없음) — 0으로 위장하지 않는다 (codex-review 반영) */
  totals: Record<string, number> | null;
  daily: DailyViews[];
  error: string | null;
}

async function loadViews(): Promise<ViewsData> {
  try {
    // 추이는 lib/views의 getDailyViews 사용만 (T043 — 레인 A 소유 모듈)
    const [totals, daily] = await Promise.all([getViewTotals(), getDailyViews(TREND_DAYS)]);
    return { totals, daily, error: null };
  } catch (err) {
    // 조회수 조회 실패가 글 관리를 막지 않는다 — 목록은 그대로 표시
    return { totals: null, daily: [], error: (err as Error).message };
  }
}

export default async function AdminDashboardPage() {
  const [{ posts, drafts }, { totals, daily, error: viewsError }] = await Promise.all([
    getContentList(),
    loadViews(),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-900">대시보드</h1>
        <Link
          href="/admin/write"
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
        >
          새 글 작성
        </Link>
      </header>

      <DeployBanner />
      {viewsError && (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          조회수를 불러오지 못했습니다: {viewsError}
        </p>
      )}

      {!viewsError && (
        <section className="mb-8">
          <h2 className="mb-2 text-sm font-semibold text-zinc-700">조회수 추이</h2>
          <ViewsChart data={daily} days={TREND_DAYS} />
        </section>
      )}

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-semibold text-zinc-700">
          발행 글 <span className="font-normal text-zinc-400">({posts.length})</span>
        </h2>
        <div className="rounded-lg border border-zinc-200">
          <PostTable items={posts} totals={totals} emptyText="발행된 글이 없습니다" />
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-semibold text-zinc-700">
          초안 <span className="font-normal text-zinc-400">({drafts.length})</span>
        </h2>
        <div className="rounded-lg border border-zinc-200">
          <PostTable items={drafts} totals={totals} emptyText="초안이 없습니다" />
        </div>
      </section>
    </div>
  );
}
