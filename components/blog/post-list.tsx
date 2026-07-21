import Link from "next/link";
import type { PostMeta } from "@/lib/types";
import { formatDate } from "./format-date";
import { TagLink } from "./tag-link";

/** 글 목록 — 홈·태그 페이지 공용 (최신순 정렬은 데이터 소스 책임) */
export function PostList({ posts }: { posts: PostMeta[] }) {
  if (posts.length === 0) {
    return <p className="py-16 text-center text-zinc-500">아직 발행된 글이 없습니다.</p>;
  }

  return (
    <ul className="space-y-10">
      {posts.map((post) => (
        <li key={post.slug}>
          <article>
            <time dateTime={post.date} className="text-sm text-zinc-500">
              {formatDate(post.date)}
            </time>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">
              <Link
                href={`/posts/${post.slug}`}
                className="text-zinc-900 transition-colors hover:text-zinc-600"
              >
                {post.title}
              </Link>
            </h2>
            <p className="mt-2 leading-relaxed text-zinc-600">{post.description}</p>
            {post.tags.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <li key={tag}>
                    <TagLink tag={tag} />
                  </li>
                ))}
              </ul>
            )}
          </article>
        </li>
      ))}
    </ul>
  );
}
