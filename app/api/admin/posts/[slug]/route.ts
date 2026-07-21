// GET /api/admin/posts/[slug]?status= — 단건 조회 (편집 시작). 소유: 레인 C
// GitHub 최신본 + sha 반환 — sha는 이후 수정 커밋의 낙관적 잠금에 필수 (contracts).
import { NextResponse } from "next/server";
import matter from "gray-matter";
import { isValidSlug } from "@/lib/content-schema";
import { contentPath, getFile, GitHubError } from "@/lib/github";
import { apiError } from "../../_lib/http";
import { requireOperator } from "../../_lib/guard";

export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const denied = await requireOperator();
  if (denied) return denied;

  const { slug } = await ctx.params;
  const statusParam = new URL(req.url).searchParams.get("status");

  if (!isValidSlug(slug)) {
    return apiError(400, "invalid-slug", "slug은 영문 소문자·숫자·하이픈만 허용합니다");
  }
  if (statusParam !== "draft" && statusParam !== "published") {
    return apiError(400, "invalid-request", "status 쿼리는 draft 또는 published여야 합니다");
  }

  try {
    const file = await getFile(contentPath(statusParam, slug));
    if (!file) {
      return apiError(404, "not-found", `해당 위치에 파일이 없습니다: ${statusParam}/${slug}`);
    }
    // 형식 오류 초안도 편집을 시작할 수 있도록 스키마 검증 없이 원본 frontmatter를 반환한다.
    // 검증은 저장 시(POST /api/admin/posts) 서버가 최종 판정한다.
    const { data, content } = matter(file.content);
    // YAML 파서가 date를 Date 객체로 만드는 경우 문자열로 정규화 (스키마와 동일 규칙)
    if (data.date instanceof Date) {
      data.date = data.date.toISOString().slice(0, 10);
    }
    return NextResponse.json({ frontmatter: data, body: content, sha: file.sha });
  } catch (err) {
    if (err instanceof GitHubError) {
      return apiError(502, "github-error", err.message);
    }
    throw err;
  }
}
