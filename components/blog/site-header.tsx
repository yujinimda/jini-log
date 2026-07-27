import Link from "next/link";
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
          {/* 로그인 진입점 — /admin은 middleware가 보호하므로 비로그인이면 GitHub OAuth로,
              이미 운영자 세션이면 곧장 대시보드로 간다. 운영자 외 계정은 lib/auth의
              signIn 콜백에서 거부되므로 링크가 공개돼도 무방 (FR-008).
              세션 여부로 문구를 바꾸지 않는 이유: 헤더는 전 페이지 공용이라
              auth() 호출 시 사이트 전체가 SSG를 잃는다. */}
          <Link href="/admin" className="text-zinc-500 transition-colors hover:text-zinc-900">
            로그인
          </Link>
        </nav>
      </div>
    </header>
  );
}
