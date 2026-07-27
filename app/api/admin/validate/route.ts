// POST /api/admin/validate — 저장 없이 frontmatter+MDX 검증만 (contracts, research R2).
// 에디터가 디바운스 호출해 서버 판정을 표시한다. 판정 로직은 posts 저장과 공유 (T018).
import { NextResponse } from "next/server";
import { apiError } from "../_lib/http";
import { requireOperator } from "../_lib/guard";
import { validatePostInput, type ValidationMode } from "../_lib/validate-post";

export async function POST(req: Request) {
  const denied = await requireOperator();
  if (denied) return denied;

  let payload: { frontmatter?: unknown; body?: unknown; mode?: unknown };
  try {
    payload = await req.json();
  } catch {
    return apiError(400, "invalid-request", "JSON 본문이 필요합니다");
  }

  if (typeof payload.body !== "string") {
    return apiError(400, "invalid-request", "body(문자열)가 필요합니다");
  }

  // 에디터는 편집 중인 글의 상태에 맞는 기준으로 물어본다 (C7).
  // 초안을 쓰는 중에 "제목이 비었다"고 알리는 건 저장을 막지도 않으면서 방해만 한다.
  // 기본값은 publish — 모드를 안 보내는 호출자에게는 기존과 같은 엄격도가 유지된다.
  const mode: ValidationMode = payload.mode === "draft" ? "draft" : "publish";

  const result = await validatePostInput(payload.frontmatter, payload.body, mode);
  if (!result.ok) {
    // 계약: 검증 실패는 422 + invalid-frontmatter | invalid-mdx 상세
    return apiError(422, result.code, result.message, result.detail);
  }

  return NextResponse.json({ valid: true });
}
