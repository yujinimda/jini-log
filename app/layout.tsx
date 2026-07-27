import type { Metadata } from "next";
import localFont from "next/font/local";
import { SITE_DESCRIPTION, siteName } from "@/components/blog/site";
import "./globals.css";

// self-host 폰트 (research R2) — 소유: 레인 A
// 웹은 woff2(next/font/local), OG 이미지는 같은 서체의 TTF/OTF(assets/fonts/og/)를 fs로 읽는다.
// 출처: pretendard 패키지(dist/web/variable/woff2), Noto Serif KR은 google/fonts 공식 가변
// TTF를 KS X 1001 한글 2,350자 + Latin·문장부호 범위로 서브셋한 woff2 (OG용 TTF와 동일 범위).
const pretendard = localFont({
  src: "../assets/fonts/web/PretendardVariable.woff2",
  display: "swap",
  weight: "45 920",
  variable: "--font-pretendard",
});

const notoSerifKr = localFont({
  src: "../assets/fonts/web/NotoSerifKRVariable-korean.woff2",
  display: "swap",
  weight: "200 900",
  variable: "--font-noto-serif-kr",
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
    <html lang="ko" className={`${pretendard.variable} ${notoSerifKr.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
