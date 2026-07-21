// GET /api/admin/posts — 콘텐츠 목록 (GitHub 최신본, invalid 초안 포함)
// POST /api/admin/posts — 저장·발행·발행취소·삭제 (계약의 검증 순서 6단계, T020)
// 소유: 레인 C
import { NextResponse } from "next/server";
import { getContentList, GitHubError } from "@/lib/github";
import type { PostActionRequest } from "@/lib/types";
import { apiError } from "../_lib/http";
import { executePostAction, PostActionError } from "../_lib/post-actions";

export async function GET() {
  try {
    const { posts, drafts } = await getContentList();
    return NextResponse.json({ posts, drafts });
  } catch (err) {
    if (err instanceof GitHubError) {
      return apiError(502, "github-error", err.message);
    }
    throw err;
  }
}

export async function POST(req: Request) {
  let payload: PostActionRequest;
  try {
    payload = await req.json();
  } catch {
    return apiError(400, "invalid-request", "JSON 본문이 필요합니다");
  }
  if (!payload || typeof payload.slug !== "string" || typeof payload.action !== "string") {
    return apiError(400, "invalid-request", "action과 slug가 필요합니다");
  }

  try {
    const result = await executePostAction(payload);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof PostActionError) {
      return apiError(err.status, err.code, err.message, err.detail);
    }
    if (err instanceof GitHubError) {
      return apiError(502, "github-error", err.message);
    }
    throw err;
  }
}
