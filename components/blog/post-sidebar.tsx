"use client";
// 좌측 전체 글 목록 (C4) — 어느 공개 페이지에서든 전체 글로 바로 이동할 수 있게 한다.
//
// 데이터는 서버(layout.tsx)에서 getPublishedPosts()로 받아 props로 내려온다 —
// 이 컴포넌트가 클라이언트인 이유는 오직 "현재 보고 있는 글" 하이라이트(usePathname) 때문이고,
// 목록 자체는 정적 HTML에 포함된다. 즉 공개 페이지의 SSG는 유지된다.
//
// 배치: 우측 목차(toc.tsx)와 좌우 대칭인 fixed 컬럼.
//   본문 48rem(절반 24rem) + 간격 2rem + 컬럼 12rem = 중앙에서 38rem
//   → 필요 폭 76rem(1216px). xl(1280px)에서 좌우 2rem씩 여유가 남는다.
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * 사이드바가 받는 최소 형태 — 본문·발췌를 클라이언트 번들로 넘기지 않기 위해
 * 서버(layout.tsx)에서 slug·title만 추려 내려준다.
 *
 * 변환 함수를 여기 두지 않는 이유: 이 파일은 "use client"라 서버에서 함수를 호출할 수 없다
 * (타입은 컴파일 시 지워지므로 export해도 무방하다).
 */
export interface SidebarPost {
  slug: string;
  title: string;
}

export function PostSidebar({ posts }: { posts: SidebarPost[] }) {
  const pathname = usePathname();

  if (posts.length === 0) return null;

  return (
    <aside className="fixed top-40 right-[calc(50%+var(--rail-offset))] hidden w-[var(--rail-w)] xl:block">
      {/* 글이 늘어나면 레일이 뷰포트 밖으로 잘린다 — 내부 스크롤 (codex-review 반영) */}
      <nav aria-label="전체 글" className="max-h-[calc(100dvh-12rem)] overflow-y-auto pr-1">
        <p className="mb-3 text-xs font-semibold tracking-wide text-zinc-400">전체 글</p>
        <ul className="space-y-2.5 text-sm">
          {posts.map((post) => {
            const href = `/posts/${post.slug}`;
            const active = pathname === href;
            return (
              <li key={post.slug}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={
                    active
                      ? "line-clamp-2 font-medium text-zinc-900"
                      : "line-clamp-2 text-zinc-500 transition-colors hover:text-zinc-900"
                  }
                >
                  {post.title}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
