import Link from "next/link";
import type { PostDerived } from "@/lib/types";
import { formatDate } from "./format-date";
import { TagLink } from "./tag-link";

/** 글 목록 (002 T018 — FR-006) — 홈·태그 페이지 공용, PostDerived 소비 (최신순 정렬은 데이터 소스 책임).
 *  카드 = 세리프 제목 + 요약 2줄(line-clamp) + 날짜·읽기시간·태그. 구분선 리듬 — 박스·그림자 없음 (B1). */
export function PostList({ posts }: { posts: PostDerived[] }) {
  if (posts.length === 0) {
    return <p className="py-16 text-center text-zinc-500">아직 발행된 글이 없습니다.</p>;
  }

  return (
    <ul className="divide-y divide-zinc-200">
      {posts.map((post) => (
        <li key={post.slug} className="py-9 first:pt-0 last:pb-0">
          <article>
            <h2 className="font-serif text-xl font-bold tracking-tight">
              <Link
                href={`/posts/${post.slug}`}
                className="text-zinc-900 transition-colors hover:text-zinc-600"
              >
                {post.title}
              </Link>
            </h2>
            <p className="mt-2 line-clamp-2 leading-relaxed text-zinc-600">{post.description}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-zinc-500">
              <time dateTime={post.date}>{formatDate(post.date)}</time>
              <span aria-hidden="true" className="text-zinc-300">
                ·
              </span>
              <span>{post.readingMinutes}분</span>
              {post.tags.length > 0 && (
                <>
                  <span aria-hidden="true" className="text-zinc-300">
                    ·
                  </span>
                  <ul className="flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <li key={tag}>
                        <TagLink tag={tag} />
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}
