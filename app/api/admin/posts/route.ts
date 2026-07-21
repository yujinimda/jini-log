// GET /api/admin/posts — 콘텐츠 목록 (GitHub 최신본, invalid 초안 포함). 소유: 레인 C
import { NextResponse } from "next/server";
import { getContentList, GitHubError } from "@/lib/github";
import { apiError } from "../_lib/http";

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
