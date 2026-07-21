// 공개 블로그 공통 레이아웃 (T032 → 002 T017: ⌘K 검색 마운트) — 반응형, 타이포 중심. 소유: 레인 B
// SearchCommand는 공개 레이아웃에만 마운트한다 — 어드민 미마운트 (에디터 단축키 충돌 방지, 계약).
import type { Metadata } from "next";
import { SearchCommand } from "@/components/blog/search-command";
import { SiteFooter } from "@/components/blog/site-footer";
import { SiteHeader } from "@/components/blog/site-header";
import { siteUrl } from "@/components/blog/site";
import "./blog.css";

// OG 이미지 등 상대 경로 메타데이터의 절대 URL 기준 (T035) + RSS 자동 발견 (T038)
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  alternates: {
    types: { "application/rss+xml": "/feed.xml" },
  },
};

export default function BlogLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-5 sm:px-6">
      <SiteHeader />
      <main className="flex-1 py-10 sm:py-12">{children}</main>
      <SiteFooter />
      <SearchCommand />
    </div>
  );
}
