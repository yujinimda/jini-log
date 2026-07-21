// POST /api/admin/validate — 저장 없이 frontmatter+MDX 검증만 (contracts, research R2).
// 에디터가 디바운스 호출해 서버 판정을 표시한다. 판정 로직은 posts 저장과 공유 (T018).
import { NextResponse } from "next/server";
import { apiError } from "../_lib/http";
import { validatePostInput } from "../_lib/validate-post";

export async function POST(req: Request) {
  let payload: { frontmatter?: unknown; body?: unknown };
  try {
    payload = await req.json();
  } catch {
    return apiError(400, "invalid-request", "JSON 본문이 필요합니다");
  }

  if (typeof payload.body !== "string") {
    return apiError(400, "invalid-request", "body(문자열)가 필요합니다");
  }

  const result = await validatePostInput(payload.frontmatter, payload.body);
  if (!result.ok) {
    // 계약: 검증 실패는 422 + invalid-frontmatter | invalid-mdx 상세
    return apiError(422, result.code, result.message, result.detail);
  }

  return NextResponse.json({ valid: true });
}
