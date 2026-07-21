// 태그별 글 목록 (T031) — SSG. 소유: 레인 B
import { notFound } from "next/navigation";
import { PostList } from "@/components/blog/post-list";
import { getAllTags, getPublishedPosts } from "@/lib/content";

/** 빌드 시점에 존재하는 태그만 — 그 외는 404 */
export const dynamicParams = false;

export async function generateStaticParams() {
  const tags = await getAllTags();
  return tags.map((tag) => ({ tag }));
}

export default async function TagPage({ params }: { params: Promise<{ tag: string }> }) {
  // generateStaticParams가 넘긴 원본 값이 그대로 들어온다 — 재디코딩하면
  // "100%" 같은 태그에서 URIError가 난다 (codex-review 반영)
  const { tag } = await params;
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
