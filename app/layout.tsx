import type { Metadata } from "next";
import localFont from "next/font/local";
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

export const metadata: Metadata = {
  title: {
    default: "jini-log",
    template: "%s | jini-log",
  },
  description: "만지면서 이해하는 기술 블로그",
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
