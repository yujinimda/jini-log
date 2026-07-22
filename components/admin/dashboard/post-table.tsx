"use client";
// 대시보드 글 목록 (T023, US3) — shadcn Table + 클라이언트 정렬 (FR-014).
// 정렬: 제목·발행일·조회수 토글, 기본 = 발행일 내림차순. 세션 내 상태 유지(저장 안 함 — 계약).
// 소유: 레인 C
import { useState } from "react";
import Link from "next/link";
import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon } from "lucide-react";
import type { DraftListItem, PostMeta } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PostRowActions } from "@/components/admin/dashboard/post-row-actions";

type SortKey = "title" | "date" | "views";
type SortDir = "asc" | "desc";

interface SortState {
  key: SortKey;
  dir: SortDir;
}

/** invalid 초안은 제목·발행일이 없다 — slug/빈 값으로 정렬 키를 대신한다 */
function titleKey(item: PostMeta | DraftListItem): string {
  return item.status === "invalid" ? item.slug : item.title;
}

function dateKey(item: PostMeta | DraftListItem): string {
  return item.status === "invalid" ? "" : item.date;
}

function viewsKey(item: PostMeta | DraftListItem, totals: Record<string, number> | null): number {
  if (item.status !== "published") return -1; // 초안·invalid는 조회수 없음 → 뒤(내림차순 기준)로
  return totals?.[item.slug] ?? -1; // null = 로드 실패(알 수 없음) — 0으로 위장하지 않는다
}

/**
 * 오름차순으로 정렬한 뒤 내림차순은 통째로 뒤집는다 — 동률 포함 토글이 항상 정확히
 * 역순이 되도록 (D 테스트 계약: 토글 시 행 순서가 반대).
 */
function sortItems(
  items: (PostMeta | DraftListItem)[],
  sort: SortState,
  totals: Record<string, number> | null,
): (PostMeta | DraftListItem)[] {
  const asc = [...items].sort((a, b) => {
    let cmp = 0;
    if (sort.key === "title") cmp = titleKey(a).localeCompare(titleKey(b), "ko");
    else if (sort.key === "date") cmp = dateKey(a).localeCompare(dateKey(b));
    else cmp = viewsKey(a, totals) - viewsKey(b, totals);
    // 동률은 slug 사전순으로 고정 — 정렬 결과가 렌더마다 흔들리지 않는다
    return cmp !== 0 ? cmp : a.slug.localeCompare(b.slug);
  });
  return sort.dir === "asc" ? asc : asc.reverse();
}

function SortableHead({
  label,
  sortKey,
  sort,
  onSort,
  align = "left",
}: {
  label: string;
  sortKey: SortKey;
  sort: SortState;
  onSort: (key: SortKey) => void;
  align?: "left" | "right";
}) {
  const active = sort.key === sortKey;
  const Icon = !active ? ChevronsUpDownIcon : sort.dir === "asc" ? ArrowUpIcon : ArrowDownIcon;
  return (
    <TableHead
      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
      className={`px-1 py-1 text-xs ${align === "right" ? "text-right" : ""}`}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex w-full items-center gap-1 rounded px-2 py-1 font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 ${
          align === "right" ? "justify-end" : ""
        } ${active ? "text-zinc-900" : ""}`}
      >
        {label}
        <Icon aria-hidden className={`size-3 ${active ? "" : "text-zinc-300"}`} />
      </button>
    </TableHead>
  );
}

function PostRow({ post, views }: { post: PostMeta; views: number | null }) {
  return (
    <TableRow className="border-zinc-100">
      <TableCell className="px-3 py-2 whitespace-normal">
        <Link
          href={`/admin/write?slug=${post.slug}&status=${post.status}`}
          className="font-medium text-zinc-900 hover:underline"
        >
          {post.title}
        </Link>
        <span className="ml-2 text-xs text-zinc-400">{post.slug}</span>
      </TableCell>
      <TableCell className="px-3 py-2 text-xs whitespace-nowrap text-zinc-500">
        {post.date}
      </TableCell>
      <TableCell className="px-3 py-2 text-xs whitespace-normal text-zinc-500">
        {post.tags.length > 0 ? post.tags.join(", ") : "—"}
      </TableCell>
      <TableCell className="px-3 py-2 text-right text-xs tabular-nums">
        {post.status === "published" ? (views ?? "—") : ""}
      </TableCell>
      <TableCell className="px-3 py-2 text-right">
        <PostRowActions slug={post.slug} status={post.status} />
      </TableCell>
    </TableRow>
  );
}

function InvalidDraftRow({ draft }: { draft: { slug: string; error: string } }) {
  return (
    <TableRow className="border-zinc-100 bg-red-50/50 hover:bg-red-50/70">
      <TableCell className="px-3 py-2 whitespace-normal">
        <Link
          href={`/admin/write?slug=${draft.slug}&status=draft`}
          className="font-medium text-red-700 hover:underline"
        >
          {draft.slug}
        </Link>
        <p className="mt-0.5 text-xs text-red-600">형식 오류: {draft.error}</p>
      </TableCell>
      <TableCell className="px-3 py-2 text-xs text-zinc-400">—</TableCell>
      <TableCell className="px-3 py-2 text-xs text-zinc-400">—</TableCell>
      <TableCell className="px-3 py-2"></TableCell>
      <TableCell className="px-3 py-2 text-right">
        <PostRowActions slug={draft.slug} status="draft" />
      </TableCell>
    </TableRow>
  );
}

export function PostTable({
  items,
  totals,
  emptyText,
}: {
  items: (PostMeta | DraftListItem)[];
  /** null = 조회수 로드 실패(알 수 없음) — 0으로 위장하지 않는다 (codex-review 반영) */
  totals: Record<string, number> | null;
  emptyText: string;
}) {
  // 기본 정렬 = 발행일 내림차순 (계약). 컴포넌트 상태라 router.refresh에도 유지된다.
  const [sort, setSort] = useState<SortState>({ key: "date", dir: "desc" });

  const toggleSort = (key: SortKey) =>
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "title" ? "asc" : "desc" },
    );

  if (items.length === 0) {
    return <p className="px-3 py-6 text-center text-sm text-zinc-400">{emptyText}</p>;
  }

  // 조회 데이터가 없으면(로드 실패·전부 초안) 조회수 정렬은 무의미 — 비활성 (codex-review 반영)
  const viewsSortable = totals !== null && items.some((item) => item.status === "published");
  const effectiveSort: SortState =
    sort.key === "views" && !viewsSortable ? { key: "date", dir: "desc" } : sort;

  const sorted = sortItems(items, effectiveSort, totals);

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-zinc-200 hover:bg-transparent">
          <SortableHead label="제목" sortKey="title" sort={effectiveSort} onSort={toggleSort} />
          <SortableHead label="발행일" sortKey="date" sort={effectiveSort} onSort={toggleSort} />
          <TableHead className="px-3 py-2 text-xs font-medium text-zinc-500">태그</TableHead>
          {viewsSortable ? (
            <SortableHead
              label="조회수"
              sortKey="views"
              sort={effectiveSort}
              onSort={toggleSort}
              align="right"
            />
          ) : (
            <TableHead className="px-3 py-2 text-right text-xs font-medium text-zinc-500">
              조회수
            </TableHead>
          )}
          <TableHead className="px-3 py-2"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((item) =>
          item.status === "invalid" ? (
            <InvalidDraftRow key={`invalid-${item.slug}`} draft={item} />
          ) : (
            <PostRow
              key={`${item.status}-${item.slug}`}
              post={item}
              views={totals ? (totals[item.slug] ?? 0) : null}
            />
          ),
        )}
      </TableBody>
    </Table>
  );
}
