// 공개 블로그 공통 레이아웃 (T032) — 반응형, 타이포 중심. 소유: 레인 B
import type { Metadata } from "next";
import { SiteFooter } from "@/components/blog/site-footer";
import { SiteHeader } from "@/components/blog/site-header";
import { siteUrl } from "@/components/blog/site";
import "./blog.css";

// OG 이미지 등 상대 경로 메타데이터의 절대 URL 기준 (T035)
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
};

export default function BlogLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-5 sm:px-6">
      <SiteHeader />
      <main className="flex-1 py-10 sm:py-12">{children}</main>
      <SiteFooter />
    </div>
  );
}
