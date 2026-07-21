import Link from "next/link";

/** 태그 칩 — 태그별 목록 페이지로 이동 */
export function TagLink({ tag }: { tag: string }) {
  return (
    <Link
      href={`/tags/${encodeURIComponent(tag)}`}
      className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-200 hover:text-zinc-900"
    >
      {tag}
    </Link>
  );
}
