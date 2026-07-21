// 태그별 글 목록 (T031) — SSG. 소유: 레인 B
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostList } from "@/components/blog/post-list";
import { RSS_ALTERNATE, siteName, tagUrl } from "@/components/blog/site";
import { getAllTags, getPublishedPosts } from "@/lib/content";

/** 빌드 시점에 존재하는 태그만 — 그 외는 404 */
export const dynamicParams = false;

export async function generateStaticParams() {
  const tags = await getAllTags();
  return tags.map((tag) => ({ tag }));
}

// T035: 태그 페이지 메타데이터
export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}): Promise<Metadata> {
  const { tag: raw } = await params;
  const tag = decodeURIComponent(raw);
  const title = `#${tag}`;
  const description = `${siteName()}의 "${tag}" 태그가 달린 글 목록`;
  return {
    title,
    description,
    alternates: { canonical: tagUrl(tag), types: RSS_ALTERNATE },
    openGraph: {
      type: "website",
      title,
      description,
      url: tagUrl(tag),
      siteName: siteName(),
      locale: "ko_KR",
    },
  };
}

export default async function TagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag: raw } = await params;
  const tag = decodeURIComponent(raw);
  const posts = (await getPublishedPosts()).filter((post) => post.tags.includes(tag));
  if (posts.length === 0) notFound();

  return (
    <div>
      <header className="mb-10">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">#{tag}</h1>
        <p className="mt-2 text-sm text-zinc-500">
          {posts.length}개의 글이 이 태그로 발행되었습니다.
        </p>
      </header>
      <PostList posts={posts} />
    </div>
  );
}
