// POST /api/admin/images — 이미지 업로드 (research R8). 소유: 레인 C
// base64 수신 → 매직 바이트로 실제 형식 검증(png/jpg/jpeg/gif/webp, SVG 금지)
// → public/images/{slug}/{filename} 커밋. 충돌 시 -1, -2 접미사.
import { NextResponse } from "next/server";
import { isValidSlug } from "@/lib/content-schema";
import { getFile, GitHubError, putFile } from "@/lib/github";
import { apiError } from "../_lib/http";

const MAX_BYTES = 4 * 1024 * 1024; // 4MB — Vercel 요청 바디 한도 내 (R8)

const ALLOWED_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp"]);

/** 매직 바이트로 실제 형식 판별 — 확장자 위장·SVG(텍스트) 차단 (R8) */
function detectImageType(bytes: Buffer): "png" | "jpg" | "gif" | "webp" | null {
  if (bytes.length < 12) return null;
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "png";
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  const head6 = bytes.subarray(0, 6).toString("latin1");
  if (head6 === "GIF87a" || head6 === "GIF89a") return "gif";
  if (
    bytes.subarray(0, 4).toString("latin1") === "RIFF" &&
    bytes.subarray(8, 12).toString("latin1") === "WEBP"
  ) {
    return "webp";
  }
  return null;
}

/** 파일명 정리 — 경로 조작 차단, 소문자·영숫자·하이픈으로 정규화 */
function sanitizeFilename(filename: string): { base: string; ext: string } | null {
  const name = filename.split(/[/\\]/).pop() ?? "";
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return null;
  const ext = name.slice(dot + 1).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) return null;
  const base = name
    .slice(0, dot)
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return { base: base || "image", ext };
}

export async function POST(req: Request) {
  let payload: { slug?: unknown; filename?: unknown; data?: unknown };
  try {
    payload = await req.json();
  } catch {
    return apiError(400, "invalid-image", "JSON 본문이 필요합니다");
  }

  const { slug, filename, data } = payload;
  if (typeof slug !== "string" || typeof filename !== "string" || typeof data !== "string") {
    return apiError(400, "invalid-image", "slug, filename, data(base64)가 필요합니다");
  }
  if (!isValidSlug(slug)) {
    return apiError(400, "invalid-image", "slug 형식이 올바르지 않습니다");
  }

  const named = sanitizeFilename(filename);
  if (!named) {
    return apiError(
      400,
      "invalid-image",
      "허용되지 않는 파일 형식입니다 (png/jpg/jpeg/gif/webp만 가능, SVG 불가)",
    );
  }

  let bytes: Buffer;
  try {
    bytes = Buffer.from(data, "base64");
  } catch {
    return apiError(400, "invalid-image", "base64 데이터가 올바르지 않습니다");
  }
  if (bytes.length === 0) {
    return apiError(400, "invalid-image", "빈 파일입니다");
  }
  if (bytes.length > MAX_BYTES) {
    return apiError(400, "invalid-image", "이미지는 4MB 이하여야 합니다");
  }

  const detected = detectImageType(bytes);
  if (!detected) {
    return apiError(
      400,
      "invalid-image",
      "이미지 형식을 확인할 수 없습니다 (png/jpg/jpeg/gif/webp만 가능, SVG 불가)",
    );
  }

  try {
    // 파일명 충돌 시 -1, -2 접미사 자동 부여 (R8)
    let finalName = `${named.base}.${named.ext}`;
    for (let i = 1; await getFile(`public/images/${slug}/${finalName}`); i++) {
      finalName = `${named.base}-${i}.${named.ext}`;
    }

    const path = `public/images/${slug}/${finalName}`;
    await putFile({
      path,
      content: bytes.toString("base64"),
      base64: true,
      message: `content: image ${slug}/${finalName}`,
    });

    return NextResponse.json({ ok: true, path: `/images/${slug}/${finalName}` });
  } catch (err) {
    if (err instanceof GitHubError) {
      return apiError(502, "github-error", err.message);
    }
    throw err;
  }
}
