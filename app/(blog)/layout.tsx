// 공개 블로그 공통 레이아웃 (T032) — 반응형, 타이포 중심. 소유: 레인 B
import { SiteFooter } from "@/components/blog/site-footer";
import { SiteHeader } from "@/components/blog/site-header";
import "./blog.css";

export default function BlogLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-5 sm:px-6">
      <SiteHeader />
      <main className="flex-1 py-10 sm:py-12">{children}</main>
      <SiteFooter />
    </div>
  );
}
