"use client";
// 좌측 전체 글 레일 (C4 → C13 분류 2단 → C14 접기) — 요약과 입구만 맡는다.
//
// C14에서 역할이 바뀌었다. 글이 늘면 12rem 레일 안에서 전부 보여주는 편한 방법이 없다.
// 그래서 레일은 "요즘 뭐 쓰는지 + 어디로 갈지"까지만 하고, 전체 목록은 분류 페이지
// (/categories/[category])가, 특정 글 찾기는 ⌘K 검색이 맡는다.
//
//   기본        전부 접힘 (분류명 + 개수만)
//   글 상세     지금 읽는 글의 분류만 자동으로 열림
//   열린 분류   최신 5개 (+ 현재 글이 그 밖이면 6번째로) + "전체 N개 →"
//
// 접기는 <details>/<summary> — 브라우저가 처리하므로 여닫는 데 JS가 필요 없고,
// 정적 HTML에 전체 구조가 그대로 들어가 SSG가 유지된다. "어느 분류를 열지"만
// 클라이언트 몫이다(공유 레이아웃은 현재 경로를 서버에서 알 수 없다 — aria-current와
// 같은 이유). 첫 페인트에는 전부 접혀 있다가 하이드레이션 후 현재 분류가 열린다.
//
// 데이터는 여전히 전 글의 slug·title을 받는다. 최신 5개만 그리면서도 전량을 받는 이유:
// "현재 글이 5개 밖이면 6번째로 보여주기"에 그 글의 제목이 필요한데, 현재 글이 뭔지는
// 클라이언트만 안다. slug·title뿐이라 글 200개여도 HTML 몇 KB 수준이다.
//
// 배치: 우측 목차(toc.tsx)와 좌우 대칭인 fixed 컬럼.
//   본문 48rem(절반 24rem) + 간격 2rem + 컬럼 12rem = 중앙에서 38rem
//   → 필요 폭 76rem(1216px). xl(1280px)에서 좌우 2rem씩 여유가 남는다.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { SidebarGroup } from "@/lib/content";

/** 열린 분류에서 항상 보여주는 최신 글 수 */
const RECENT_COUNT = 5;

export function PostSidebar({ groups }: { groups: SidebarGroup[] }) {
  const pathname = usePathname();

  // 사용자가 손으로 여닫은 분류 — 페이지를 이동하면 초기화한다.
  // 초기화하지 않으면 "글 상세에서 자동으로 열린 분류"가 toggle 이벤트를 통해 수동
  // 상태로 굳어서, 다른 분류의 글로 이동해도 이전 분류가 계속 열려 있게 된다.
  const [manual, setManual] = useState<Record<string, boolean>>({});
  // 렌더 중 상태 재설정 — React가 권장하는 파생 상태 초기화 패턴 (prev는 ref가 아니라 state)
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setManual({});
  }

  if (groups.length === 0) return null;

  const currentSlug = pathname.startsWith("/posts/") ? pathname.slice("/posts/".length) : null;
  const currentCategory = currentSlug
    ? (groups.find((g) => g.posts.some((p) => p.slug === currentSlug))?.category ?? null)
    : null;

  return (
    <aside className="fixed top-40 right-[calc(50%+var(--rail-offset))] hidden w-[var(--rail-w)] xl:block">
      {/* 글이 늘어나면 레일이 뷰포트 밖으로 잘린다 — 내부 스크롤 (codex-review 반영) */}
      <nav aria-label="전체 글" className="max-h-[calc(100dvh-12rem)] overflow-y-auto pr-1">
        {/* 위계: 전체 글(h2) > 분류(summary) > 글(li) */}
        <h2 className="mb-3 text-xs font-semibold tracking-wide text-zinc-400">전체 글</h2>
        <div className="space-y-1.5">
          {groups.map((group) => {
            const isCurrent = group.category === currentCategory;
            const open = manual[group.category] ?? isCurrent;
            const recent = group.posts.slice(0, RECENT_COUNT);
            const currentPost =
              isCurrent && currentSlug && !recent.some((p) => p.slug === currentSlug)
                ? group.posts.find((p) => p.slug === currentSlug)
                : null;

            return (
              <details
                key={group.category}
                open={open}
                onToggle={(e) => {
                  // currentTarget은 핸들러가 끝나면 null이 된다 — setState updater(나중에 실행)
                  // 안에서 읽으면 크래시. 동기적으로 먼저 읽는다.
                  // 브라우저는 open 속성이 **프로그램적으로** 바뀔 때도 toggle을 쏘므로
                  // (하이드레이션·페이지 이동) 값이 이미 같으면 상태를 만들지 않는다.
                  const isOpen = e.currentTarget.open;
                  setManual((m) =>
                    m[group.category] === isOpen ? m : { ...m, [group.category]: isOpen },
                  );
                }}
              >
                <summary className="flex cursor-pointer list-none items-baseline gap-1.5 rounded py-0.5 text-sm text-zinc-600 transition-colors select-none hover:text-zinc-900 [&::-webkit-details-marker]:hidden">
                  <span
                    aria-hidden
                    className={`text-[0.6rem] text-zinc-400 transition-transform ${open ? "rotate-90" : ""}`}
                  >
                    ▶
                  </span>
                  <span className="font-medium">{group.category}</span>
                  <span className="text-xs text-zinc-400 tabular-nums">{group.posts.length}</span>
                </summary>

                <ul className="mt-1.5 mb-2 space-y-2.5 border-l border-zinc-200 pl-2.5 text-sm">
                  {recent.map((post) => (
                    <RailLink
                      key={post.slug}
                      slug={post.slug}
                      title={post.title}
                      pathname={pathname}
                    />
                  ))}
                  {/* 현재 글이 최신 5개 밖이면 6번째로 — 자기 위치는 항상 레일에 보여야 한다 */}
                  {currentPost && (
                    <RailLink
                      slug={currentPost.slug}
                      title={currentPost.title}
                      pathname={pathname}
                    />
                  )}
                  {group.posts.length > RECENT_COUNT && (
                    <li>
                      <Link
                        href={`/categories/${encodeURIComponent(group.category)}`}
                        className="text-xs text-zinc-400 transition-colors hover:text-zinc-900"
                      >
                        {group.category} 글 {group.posts.length}개 전체 →
                      </Link>
                    </li>
                  )}
                </ul>
              </details>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}

function RailLink({ slug, title, pathname }: { slug: string; title: string; pathname: string }) {
  const href = `/posts/${slug}`;
  const active = pathname === href;
  return (
    <li>
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={
          active
            ? "line-clamp-2 font-medium text-zinc-900"
            : "line-clamp-2 text-zinc-500 transition-colors hover:text-zinc-900"
        }
      >
        {title}
      </Link>
    </li>
  );
}
