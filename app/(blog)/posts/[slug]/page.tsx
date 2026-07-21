// 글 상세 (T029) — 전부 SSG. 소유: 레인 B
import { notFound } from "next/navigation";
import { formatDate } from "@/components/blog/format-date";
import { TagLink } from "@/components/blog/tag-link";
import { getPost, getPublishedPosts } from "@/lib/content";
import { renderMdx } from "@/lib/mdx";

/** 빌드 시점의 발행 글만 존재 — 그 외 slug는 404 */
export const dynamicParams = false;

export async function generateStaticParams() {
  const posts = await getPublishedPosts();
  return posts.map(({ slug }) => ({ slug }));
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const content = await renderMdx(post.body);

  return (
    <article>
      <header className="mb-10">
        <time dateTime={post.date} className="text-sm text-zinc-500">
          {formatDate(post.date)}
        </time>
        <h1 className="mt-2 text-3xl leading-tight font-bold tracking-tight text-zinc-900">
          {post.title}
        </h1>
        <p className="mt-3 text-lg text-zinc-600">{post.description}</p>
        {post.tags.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <li key={tag}>
                <TagLink tag={tag} />
              </li>
            ))}
          </ul>
        )}
      </header>
      <div className="prose">{content}</div>
    </article>
  );
}
