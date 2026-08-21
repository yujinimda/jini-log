import type { Metadata } from "next";
import localFont from "next/font/local";
import { SITE_DESCRIPTION, siteName } from "@/components/blog/site";
import "./globals.css";

// self-host 폰트 (research R2) — 소유: 레인 A
// 웹은 woff2(next/font/local), OG 이미지는 같은 서체의 OTF(assets/fonts/og/)를 fs로 읽는다.
// 출처: pretendard 패키지(dist/web/variable/woff2).
// Noto Serif KR은 C16에서 제거 — 제목 세리프 철회로 사용처가 없어졌고,
// 매 페이지 싣던 한글 가변 woff2가 빠져 전 페이지가 가벼워졌다.
const pretendard = localFont({
  src: "../assets/fonts/web/PretendardVariable.woff2",
  display: "swap",
  weight: "45 920",
  variable: "--font-pretendard",
});

// 사이트 정체성의 단일 출처는 components/blog/site.ts다 (SITE_NAME 주입).
// 여기에 이름을 하드코딩하면 검색 결과 제목만 갈린다 — 실제로 헤더·og:site_name은
// "지니로그"인데 <title>만 "jini-log"로 나가고 있었다. 브랜드가 쪼개진다.
export const metadata: Metadata = {
  title: {
    default: siteName(),
    template: `%s | ${siteName()}`,
  },
  description: SITE_DESCRIPTION,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={pretendard.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
