import Link from "next/link";
import { AdminLink } from "@/components/blog/admin-link";
import { SearchButton } from "@/components/blog/search-command";
import { siteName } from "@/components/blog/site";

/** 공개 블로그 공통 헤더 (002 T010 — B1) — 세리프 로고 + [태그 · 검색 · RSS], 얇고 조용한 크롬 */
export function SiteHeader() {
  return (
    <header className="border-b border-zinc-200">
      <div className="flex items-baseline justify-between gap-4 py-5">
        <Link href="/" className="font-serif text-xl font-bold tracking-tight text-zinc-900">
          {/* 사이트 정체성의 단일 출처(SITE_NAME) — 하드코딩 금지 (codex-review 반영) */}
          {siteName()}
        </Link>
        <nav aria-label="사이트 메뉴" className="flex items-baseline gap-4 text-sm">
          <Link href="/tags" className="text-zinc-500 transition-colors hover:text-zinc-900">
            태그
          </Link>
          <SearchButton />
          <a href="/feed.xml" className="text-zinc-500 transition-colors hover:text-zinc-900">
            RSS
          </a>
          {/* 어드민 진입점 — 목적지는 항상 /admin이고 문구만 세션에 따라 바뀐다 (C4).
              세션 확인은 클라이언트에서 — 서버에서 auth()를 부르면 전 페이지가 SSG를 잃는다. */}
          <AdminLink className="text-zinc-500 transition-colors hover:text-zinc-900" />
        </nav>
      </div>
    </header>
  );
}
