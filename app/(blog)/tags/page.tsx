// 태그 인덱스 (002 T019 — FR-005) — 전체 태그 + 태그별 글 수, SSG. 소유: 레인 B
// B1 톤: 칩 클라우드 없이 무채색 구분선 리듬 (docs/design — "조용함 유지").
import type { Metadata } from "next";
import Link from "next/link";
import { RSS_ALTERNATE, siteName, siteUrl } from "@/components/blog/site";
import { getPublishedPosts } from "@/lib/content";

export const metadata: Metadata = {
  title: "태그",
  description: `${siteName()}의 전체 태그 목록`,
  alternates: { canonical: "/tags", types: RSS_ALTERNATE },
  openGraph: {
    type: "website",
    title: "태그",
    description: `${siteName()}의 전체 태그 목록`,
    url: `${siteUrl()}/tags`,
    siteName: siteName(),
    locale: "ko_KR",
  },
};

export default async function TagsPage() {
  const posts = await getPublishedPosts();

  // 태그별 글 수 — 글 수 내림차순, 동수는 가나다순
  const counts = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  const tags = [...counts.entries()].sort(([aTag, aCount], [bTag, bCount]) =>
    aCount !== bCount ? bCount - aCount : aTag.localeCompare(bTag, "ko"),
  );

  return (
    <div>
      <header className="mb-10">
        <h1 className="font-serif text-2xl font-bold tracking-tight text-zinc-900">태그</h1>
        <p className="mt-2 text-sm text-zinc-500">
          {tags.length}개의 태그로 발행 글을 탐색할 수 있습니다.
        </p>
      </header>
      {tags.length === 0 ? (
        <p className="py-16 text-center text-zinc-500">아직 태그가 없습니다.</p>
      ) : (
        <ul className="divide-y divide-zinc-200">
          {tags.map(([tag, count]) => (
            <li key={tag}>
              <Link
                href={`/tags/${encodeURIComponent(tag)}`}
                className="group flex items-baseline justify-between py-4"
              >
                <span className="font-medium text-zinc-800 transition-colors group-hover:text-zinc-950">
                  #{tag}
                </span>
                <span className="text-sm text-zinc-500">{count}개의 글</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
