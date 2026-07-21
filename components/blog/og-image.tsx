// OG 이미지 공용 템플릿 (T036) — 사이트 기본·글별 이미지가 같은 디자인을 쓴다. 소유: 레인 B
import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

/**
 * 한글 글리프 폰트 로드 — Google Fonts css2의 text 서브셋으로 필요한 글자만.
 * (ImageResponse 기본 폰트에는 한글이 없다.) 실패 시 null — 기본 폰트로 렌더.
 */
async function loadKoreanFont(text: string): Promise<ArrayBuffer | null> {
  try {
    const cssUrl = `https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@700&text=${encodeURIComponent(text)}`;
    const cssRes = await fetch(cssUrl);
    if (!cssRes.ok) return null;
    const css = await cssRes.text();
    // 브라우저 UA 없이 요청하면 ttf/otf 소스를 반환한다 (ImageResponse는 woff2 미지원)
    const fontUrl = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    if (!fontUrl) return null;
    const fontRes = await fetch(fontUrl);
    if (!fontRes.ok) return null;
    return await fontRes.arrayBuffer();
  } catch {
    return null;
  }
}

/** 타이포 중심 카드: 큰 제목 + 하단 라벨 (블로그 톤과 일치하는 zinc 다크) */
export async function ogImage({ title, label }: { title: string; label: string }) {
  const font = await loadKoreanFont(`${title}${label}`);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          backgroundColor: "#18181b",
          color: "#fafafa",
          fontFamily: '"Noto Sans KR", sans-serif',
        }}
      >
        <div
          style={{
            marginTop: 96,
            fontSize: 64,
            fontWeight: 700,
            lineHeight: 1.3,
            letterSpacing: "-0.02em",
            wordBreak: "keep-all",
            display: "block",
            lineClamp: 4,
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 30, color: "#a1a1aa" }}>{label}</div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: font
        ? [{ name: "Noto Sans KR", data: font, weight: 700, style: "normal" }]
        : undefined,
    },
  );
}
