// 에디터 로컬 타입 — 소유: 레인 C
import type { PostFrontmatter } from "@/lib/types";

/** 폼 상태 — tags는 입력 편의상 콤마 구분 문자열로 다룬다 */
export interface FrontmatterForm {
  title: string;
  description: string;
  date: string;
  tags: string;
}

export function emptyForm(): FrontmatterForm {
  return {
    title: "",
    description: "",
    date: new Date().toISOString().slice(0, 10),
    tags: "",
  };
}

/** 폼 상태 → API frontmatter (서버 zod 스키마가 최종 판정) */
export function toFrontmatter(form: FrontmatterForm): PostFrontmatter {
  return {
    title: form.title,
    description: form.description,
    date: form.date,
    tags: form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
  };
}

/** API frontmatter(원본 — invalid 초안이면 임의 형태) → 폼 상태 */
export function fromFrontmatter(data: Record<string, unknown>): FrontmatterForm {
  return {
    title: typeof data.title === "string" ? data.title : "",
    description: typeof data.description === "string" ? data.description : "",
    date:
      typeof data.date === "string"
        ? data.date.slice(0, 10)
        : new Date().toISOString().slice(0, 10),
    tags: Array.isArray(data.tags) ? data.tags.join(", ") : "",
  };
}

export interface ApiErrorInfo {
  status: number;
  code: string;
  message: string;
  detail?: unknown;
}

/** 실패 응답 → 표시용 에러 정보 */
export async function readApiError(res: Response): Promise<ApiErrorInfo> {
  try {
    const body = (await res.json()) as { error?: { code?: string; message?: string; detail?: unknown } };
    return {
      status: res.status,
      code: body.error?.code ?? "unknown",
      message: body.error?.message ?? `요청 실패 (${res.status})`,
      detail: body.error?.detail,
    };
  } catch {
    return { status: res.status, code: "unknown", message: `요청 실패 (${res.status})` };
  }
}
