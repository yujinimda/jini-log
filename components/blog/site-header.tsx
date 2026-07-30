import Link from "next/link";
import { AdminLink } from "@/components/blog/admin-link";
import { LogoMark } from "@/components/blog/logo-mark";
import { SearchButton } from "@/components/blog/search-command";
import { siteName } from "@/components/blog/site";

/**
 * 공개 블로그 공통 헤더 (002 T010 — B1) — 마스코트 + 세리프 로고 + [태그 · 검색 · RSS]
 *
 * 여백은 `--header-py`, 마스코트 크기는 `--mascot-h`에서 온다 (blog.css 단일 출처).
 * 예전 `py-5`(20px)는 로고가 화면 꼭대기에 붙어 답답했다.
 *
 * 마스코트를 텍스트로 대체하지 않고 **함께** 두는 이유: siteName()이 사이트 정체성의
 * 단일 출처라 화면에서 사라지면 안 되고, 검색결과·스크린리더에도 이름이 남아야 한다.
 */
export function SiteHeader() {
  return (
    <header className="border-b border-zinc-200">
      <div
        className="flex items-center justify-between gap-4"
        style={{ paddingBlock: "var(--header-py)" }}
      >
        <Link href="/" className="flex items-center gap-3">
          <LogoMark className="w-auto shrink-0" style={{ height: "var(--mascot-h)" }} />
          {/* 사이트 정체성의 단일 출처(SITE_NAME) — 하드코딩 금지 (codex-review 반영) */}
          <span className="font-serif text-xl font-bold tracking-tight text-zinc-900">
            {siteName()}
          </span>
        </Link>
        <nav aria-label="사이트 메뉴" className="flex items-center gap-4 text-sm">
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
