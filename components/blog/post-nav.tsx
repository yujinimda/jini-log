// 이전/다음 글 내비 (002 T013 — FR-009) — 서버 컴포넌트. 소유: 레인 B
// 순서 근거: getPublishedPosts의 안정 정렬(발행일 내림차순, 동일 날짜 slug 사전순 — data-model §3).
// "이전 글" = 더 먼저 발행된 글, "다음 글" = 더 나중에 발행된 글 (spec grilling 확정).
import Link from "next/link";
import { getPublishedPosts } from "@/lib/content";
import type { PostDerived } from "@/lib/types";

function NavLink({
  post,
  label,
  align,
}: {
  post: PostDerived;
  label: string;
  align: "left" | "right";
}) {
  return (
    <Link
      href={`/posts/${post.slug}`}
      className={`group flex flex-col gap-1 ${align === "right" ? "items-end text-right" : "items-start"}`}
    >
      <span className="text-xs text-zinc-400">{label}</span>
      <span className="font-serif font-semibold text-zinc-700 transition-colors group-hover:text-zinc-950">
        {post.title}
      </span>
    </Link>
  );
}

/** 글 상세 하단 이전/다음 내비 — 없는 방향은 생략, 양쪽 다 없으면 미렌더 */
export async function PostNav({ slug }: { slug: string }) {
  const posts = await getPublishedPosts();
  const index = posts.findIndex((post) => post.slug === slug);
  if (index === -1) return null;

  // 목록은 최신순 — 다음(더 새로운) 글은 앞쪽, 이전(더 오래된) 글은 뒤쪽
  const newer = index > 0 ? posts[index - 1] : null;
  const older = index < posts.length - 1 ? posts[index + 1] : null;
  if (!newer && !older) return null;

  return (
    <nav
      aria-label="이전 다음 글"
      className="mt-16 flex justify-between gap-6 border-t border-zinc-200 pt-8"
    >
      {older ? <NavLink post={older} label="이전 글" align="left" /> : <span />}
      {newer ? <NavLink post={newer} label="다음 글" align="right" /> : <span />}
    </nav>
  );
}
