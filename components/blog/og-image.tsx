// OG 이미지 공용 템플릿 (T036 → 002 T014) — 사이트 기본·글별 이미지가 같은 디자인을 쓴다. 소유: 레인 B
// 폰트는 assets/fonts/og/의 self-host TTF/OTF를 fs로 읽는다 (research R2) —
// ImageResponse(Satori)는 woff2 미지원이라 웹(woff2)과 "같은 서체, 포맷별 파일"로 통일.
// 구글 폰트 런타임 fetch 없음 — 오프라인·빌드 환경에서도 항상 같은 렌더.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

const OG_FONT_DIR = path.join(process.cwd(), "assets", "fonts", "og");

type OgFont = { name: string; data: Buffer; weight: 400 | 700; style: "normal" };

let fontsPromise: Promise<OgFont[]> | null = null;

/**
 * 제목용 세리프(Noto Serif KR Bold — B1 톤) + 라벨용 산세리프(Pretendard Regular).
 * 자산이 누락된 배포(파일 트레이싱 실수 등)에서도 OG 라우트가 500이 되지 않도록
 * 실패 시 기본 폰트로 폴백한다 — 한글 글리프는 깨지지만 이미지는 응답한다 (codex-review 반영).
 */
function loadOgFonts(): Promise<OgFont[]> {
  fontsPromise ??= Promise.all([
    readFile(path.join(OG_FONT_DIR, "NotoSerifKR-Bold.ttf")).then(
      (data): OgFont => ({ name: "Noto Serif KR", data, weight: 700, style: "normal" }),
    ),
    readFile(path.join(OG_FONT_DIR, "Pretendard-Regular.otf")).then(
      (data): OgFont => ({ name: "Pretendard", data, weight: 400, style: "normal" }),
    ),
  ]).catch((err) => {
    console.error("OG 폰트 로드 실패 — 기본 폰트로 폴백:", err);
    fontsPromise = null; // 다음 호출에서 재시도
    return [] as OgFont[];
  });
  return fontsPromise;
}

/** 타이포 중심 카드: 세리프 큰 제목 + 하단 라벨 (블로그 톤과 일치하는 zinc 다크) */
export async function ogImage({ title, label }: { title: string; label: string }) {
  const fonts = await loadOgFonts();
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
          fontFamily: '"Noto Serif KR", serif',
        }}
      >
        <div
          style={{
            marginTop: 96,
            fontSize: 64,
            fontWeight: 700,
            lineHeight: 1.35,
            letterSpacing: "-0.01em",
            wordBreak: "keep-all",
            display: "block",
            lineClamp: 4,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 30,
            color: "#a1a1aa",
            fontFamily: '"Pretendard", sans-serif',
            fontWeight: 400,
          }}
        >
          {label}
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts },
  );
}
