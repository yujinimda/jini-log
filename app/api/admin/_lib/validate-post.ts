// frontmatter+MDX 판정 로직 — validate 라우트와 posts 저장 라우트가 공유 (T018).
// 판정이 한 곳에서만 나오므로 "검증 통과 = 저장 가능"이 어긋나지 않는다. 소유: 레인 C
import { formatFrontmatterErrors, frontmatterSchema } from "@/lib/content-schema";
import { validateMdx } from "@/lib/mdx";
import type { PostFrontmatter } from "@/lib/types";

export type PostValidation =
  | { ok: true; frontmatter: PostFrontmatter }
  | {
      ok: false;
      code: "invalid-frontmatter" | "invalid-mdx";
      message: string;
      detail?: unknown;
    };

/**
 * 저장·발행 전 검증 (contracts 처리 순서 3~4단계):
 * frontmatter zod 검증(필드별 메시지) → MDX 컴파일 검증(오류 위치 포함).
 * 상태 코드 매핑(400/422)은 각 라우트 책임 — validate는 둘 다 422, posts는 400/422.
 */
export async function validatePostInput(
  frontmatter: unknown,
  body: string,
): Promise<PostValidation> {
  const parsed = frontmatterSchema.safeParse(frontmatter);
  if (!parsed.success) {
    return {
      ok: false,
      code: "invalid-frontmatter",
      message: formatFrontmatterErrors(parsed.error),
      detail: parsed.error.issues.map((i) => ({
        field: i.path.join(".") || "(root)",
        message: i.message,
      })),
    };
  }

  const mdx = await validateMdx(body);
  if (!mdx.valid) {
    return {
      ok: false,
      code: "invalid-mdx",
      message: mdx.errors.map((e) => e.message).join("; "),
      detail: mdx.errors,
    };
  }

  return { ok: true, frontmatter: parsed.data };
}
