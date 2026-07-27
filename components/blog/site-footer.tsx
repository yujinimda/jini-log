import { siteName } from "@/components/blog/site";

/** 공개 블로그 공통 푸터 */
export function SiteFooter() {
  return (
    <footer className="flex items-center justify-between border-t border-zinc-200 py-8 text-sm text-zinc-500">
      {/* 폴백을 여기서 다시 쓰지 않는다 — siteName()이 단일 출처 */}
      <p>
        © {new Date().getFullYear()} {siteName()}
      </p>
      <a href="/feed.xml" className="transition-colors hover:text-zinc-900">
        RSS
      </a>
    </footer>
  );
}
