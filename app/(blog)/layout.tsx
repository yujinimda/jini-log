// 공개 블로그 공통 레이아웃 (T032 → 002 T017: ⌘K 검색 마운트) — 반응형, 타이포 중심. 소유: 레인 B
// SearchCommand는 공개 레이아웃에만 마운트한다 — 어드민 미마운트 (에디터 단축키 충돌 방지, 계약).
import type { Metadata } from "next";
import { PostSidebar } from "@/components/blog/post-sidebar";
import { SearchCommand } from "@/components/blog/search-command";
import { SiteFooter } from "@/components/blog/site-footer";
import { SiteHeader } from "@/components/blog/site-header";
import { siteUrl } from "@/components/blog/site";
import { getPublishedPosts } from "@/lib/content";
import "./blog.css";

// OG 이미지 등 상대 경로 메타데이터의 절대 URL 기준 (T035) + RSS 자동 발견 (T038)
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  alternates: {
    types: { "application/rss+xml": "/feed.xml" },
  },
};

export default async function BlogLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // 좌측 전체 글 목록 — 서버에서 읽어 정적 HTML에 포함시킨다 (SSG 유지, C4).
  // slug·title만 추려 넘긴다 — 본문·발췌가 클라이언트 번들에 실리지 않도록.
  const posts = (await getPublishedPosts()).map(({ slug, title }) => ({ slug, title }));

  return (
    // 컨테이너 폭 = 본문 48rem + 좌우 패딩. max-w-3xl(48rem)에 px-5를 더하면
    // 실제 본문이 45.5rem으로 줄어 .prose의 48rem이 무의미해진다 (codex-review 반영).
    // --content-w / --gutter는 blog.css의 단일 출처 — 목차·사이드바 위치도 여기서 파생된다.
    <div className="mx-auto flex min-h-dvh w-full max-w-[calc(var(--content-w)+2*var(--gutter))] flex-col px-[var(--gutter)]">
      <PostSidebar posts={posts} />
      <SiteHeader />
      <main className="flex-1 py-10 sm:py-12">{children}</main>
      <SiteFooter />
      <SearchCommand />
    </div>
  );
}
