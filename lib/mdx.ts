// MDX 렌더·검증 공용 파이프라인 (research R1/R2) — 소유: 레인 A
// 렌더와 검증이 같은 옵션(lib/mdx-options.ts)을 쓰므로 "검증 통과 = 렌더 가능"이 보장된다.
import { compile } from "@mdx-js/mdx";
import { compileMDX } from "next-mdx-remote/rsc";
import { mdxComponents, registeredComponentNames } from "@/components/mdx/registry";
import { rehypePlugins, remarkCollectComponentNames, remarkPlugins } from "./mdx-options";

/** 공개 페이지·프리뷰가 쓰는 실제 렌더 */
export async function renderMdx(source: string) {
  const { content } = await compileMDX({
    source,
    components: mdxComponents,
    options: {
      mdxOptions: { remarkPlugins, rehypePlugins },
    },
  });
  return content;
}

export interface MdxError {
  message: string;
  line?: number;
  column?: number;
}

export interface MdxValidationResult {
  valid: boolean;
  errors: MdxError[];
}

/**
 * 커밋 전 검증 (SC-004의 핵심): 실제 렌더와 동일한 옵션으로 컴파일을 시도하고,
 * import/export 금지(mdx-options의 플러그인)와 미등록 컴포넌트 사용을 거부한다.
 */
export async function validateMdx(source: string): Promise<MdxValidationResult> {
  const usedComponents = new Set<string>();
  const errors: MdxError[] = [];

  try {
    await compile(source, {
      remarkPlugins: [...remarkPlugins, remarkCollectComponentNames(usedComponents)],
      rehypePlugins,
    });
  } catch (err) {
    const e = err as { message?: string; line?: number; column?: number };
    errors.push({
      message: e.message ?? "MDX 컴파일에 실패했습니다",
      line: e.line,
      column: e.column,
    });
    return { valid: false, errors };
  }

  for (const name of usedComponents) {
    if (!registeredComponentNames.has(name)) {
      errors.push({
        message: `등록되지 않은 컴포넌트입니다: <${name} /> — components/mdx/registry.ts에 등록된 컴포넌트만 사용할 수 있습니다`,
      });
    }
  }

  return { valid: errors.length === 0, errors };
}
