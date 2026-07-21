import Link from "next/link";

/** 공개 블로그 공통 헤더 (002 T010 — B1) — 세리프 로고 + [태그 · 검색 · RSS], 얇고 조용한 크롬 */
export function SiteHeader() {
  return (
    <header className="border-b border-zinc-200">
      <div className="flex items-baseline justify-between gap-4 py-5">
        <Link href="/" className="font-serif text-xl font-bold tracking-tight text-zinc-900">
          지니로그
        </Link>
        <nav aria-label="사이트 메뉴" className="flex items-baseline gap-4 text-sm">
          <Link href="/tags" className="text-zinc-500 transition-colors hover:text-zinc-900">
            태그
          </Link>
          {/* 검색 버튼 자리 — US1(T017)에서 ⌘K 다이얼로그와 연결 */}
          <button type="button" className="text-zinc-500 transition-colors hover:text-zinc-900">
            검색
          </button>
          <a href="/feed.xml" className="text-zinc-500 transition-colors hover:text-zinc-900">
            RSS
          </a>
        </nav>
      </div>
    </header>
  );
}
