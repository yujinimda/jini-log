"use client";
// 좌측 전체 글 목록 (C4 → 분류 2단) — 어느 공개 페이지에서든 전체 글로 바로 이동할 수 있게 한다.
//
// 데이터는 서버(layout.tsx)에서 getPublishedPosts() → groupPostsByCategory()로 묶어
// props로 내려온다 — 이 컴포넌트가 클라이언트인 이유는 오직 "현재 보고 있는 글"
// 하이라이트(usePathname) 때문이고, 목록 자체는 정적 HTML에 포함된다. 즉 SSG는 유지된다.
//
// 분류 헤더를 **링크로 만들지 않는다**: /categories 페이지를 두지 않기로 했고,
// 링크가 아니어야 "레일의 링크 수 = 발행 글 수"라는 기존 e2e 계약도 그대로 성립한다.
//
// 배치: 우측 목차(toc.tsx)와 좌우 대칭인 fixed 컬럼.
//   본문 48rem(절반 24rem) + 간격 2rem + 컬럼 12rem = 중앙에서 38rem
//   → 필요 폭 76rem(1216px). xl(1280px)에서 좌우 2rem씩 여유가 남는다.
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SidebarGroup } from "@/lib/content";

export function PostSidebar({ groups }: { groups: SidebarGroup[] }) {
  const pathname = usePathname();

  if (groups.length === 0) return null;

  return (
    <aside className="fixed top-40 right-[calc(50%+var(--rail-offset))] hidden w-[var(--rail-w)] xl:block">
      {/* 글이 늘어나면 레일이 뷰포트 밖으로 잘린다 — 내부 스크롤 (codex-review 반영) */}
      <nav aria-label="전체 글" className="max-h-[calc(100dvh-12rem)] overflow-y-auto pr-1">
        {/* 위계: 전체 글(h2) > 분류(h3) > 글(li). 예전엔 "전체 글"이 p이고 분류가 h2라
            스크린리더에서 위계가 뒤집혀 있었다 (codex 지적) */}
        <h2 className="mb-3 text-xs font-semibold tracking-wide text-zinc-400">전체 글</h2>
        {/* space-y로 분류 사이 간격을 주되, 마지막 분류 아래에는 여백이 남지 않게 한다 */}
        <div className="space-y-4">
          {groups.map((group, index) => (
            // id에 분류명을 그대로 쓰면 "Web Dev"처럼 공백이 든 값에서 깨진다 — 인덱스로 만든다
            <section key={group.category} aria-labelledby={`rail-cat-${index}`}>
              <h3 id={`rail-cat-${index}`} className="mb-1.5 text-xs font-medium text-zinc-400">
                {group.category}
              </h3>
              {/* 12rem 레일에서 들여쓰기를 크게 주면 제목이 접힌다 — 얇은 좌측 선 + 0.5rem으로 대신한다 */}
              <ul className="space-y-2.5 border-l border-zinc-200 pl-2 text-sm">
                {group.posts.map((post) => {
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
            </section>
          ))}
        </div>
      </nav>
    </aside>
  );
}
