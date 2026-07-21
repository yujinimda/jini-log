// 어드민 대시보드 (T041, US4) — 발행/초안 구분 목록(GitHub 최신본), invalid 초안 오류 표시,
// 글별 조회수·최근 발행일 (FR-011·014). 소유: 레인 C
import Link from "next/link";
import { getContentList } from "@/lib/github";
import { getViewTotals } from "@/lib/views";
import type { DraftListItem, PostMeta } from "@/lib/types";

export const metadata = { title: "대시보드" };
// GitHub 최신본·조회수는 요청 시점 데이터 — 캐시 금지
export const dynamic = "force-dynamic";

async function loadViewTotals(): Promise<{ totals: Record<string, number>; error: string | null }> {
  try {
    return { totals: await getViewTotals(), error: null };
  } catch (err) {
    // 조회수 조회 실패가 글 관리를 막지 않는다 — 목록은 그대로 표시
    return { totals: {}, error: (err as Error).message };
  }
}

function PostRow({ post, views }: { post: PostMeta; views: number | null }) {
  return (
    <tr className="border-b border-zinc-100">
      <td className="px-3 py-2">
        <Link
          href={`/admin/write?slug=${post.slug}&status=${post.status}`}
          className="font-medium text-zinc-900 hover:underline"
        >
          {post.title}
        </Link>
        <span className="ml-2 text-xs text-zinc-400">{post.slug}</span>
      </td>
      <td className="px-3 py-2 text-xs whitespace-nowrap text-zinc-500">{post.date}</td>
      <td className="px-3 py-2 text-xs text-zinc-500">
        {post.tags.length > 0 ? post.tags.join(", ") : "—"}
      </td>
      <td className="px-3 py-2 text-right text-xs tabular-nums">
        {post.status === "published" ? (views ?? "—") : ""}
      </td>
      <td className="px-3 py-2 text-right"></td>
    </tr>
  );
}

function InvalidDraftRow({ draft }: { draft: Extract<DraftListItem, { status: "invalid" }> }) {
  return (
    <tr className="border-b border-zinc-100 bg-red-50/50">
      <td className="px-3 py-2">
        <Link
          href={`/admin/write?slug=${draft.slug}&status=draft`}
          className="font-medium text-red-700 hover:underline"
        >
          {draft.slug}
        </Link>
        <p className="mt-0.5 text-xs text-red-600">형식 오류: {draft.error}</p>
      </td>
      <td className="px-3 py-2 text-xs text-zinc-400">—</td>
      <td className="px-3 py-2 text-xs text-zinc-400">—</td>
      <td className="px-3 py-2"></td>
      <td className="px-3 py-2 text-right"></td>
    </tr>
  );
}

function PostTable({
  items,
  totals,
  emptyText,
}: {
  items: (PostMeta | DraftListItem)[];
  totals: Record<string, number>;
  emptyText: string;
}) {
  if (items.length === 0) {
    return <p className="px-3 py-6 text-center text-sm text-zinc-400">{emptyText}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
            <th className="px-3 py-2 font-medium">제목</th>
            <th className="px-3 py-2 font-medium">발행일</th>
            <th className="px-3 py-2 font-medium">태그</th>
            <th className="px-3 py-2 text-right font-medium">조회수</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) =>
            item.status === "invalid" ? (
              <InvalidDraftRow key={`invalid-${item.slug}`} draft={item} />
            ) : (
              <PostRow key={`${item.status}-${item.slug}`} post={item} views={totals[item.slug] ?? 0} />
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}

export default async function AdminDashboardPage() {
  const [{ posts, drafts }, { totals, error: viewsError }] = await Promise.all([
    getContentList(),
    loadViewTotals(),
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

      {viewsError && (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          조회수를 불러오지 못했습니다: {viewsError}
        </p>
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
