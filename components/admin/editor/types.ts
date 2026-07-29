// 에디터 로컬 타입 — 소유: 레인 C
import type { PostFrontmatter } from "@/lib/types";

/** 폼 상태 — tags는 입력 편의상 콤마 구분 문자열로 다룬다 */
export interface FrontmatterForm {
  title: string;
  description: string;
  date: string;
  /** 좌측 레일의 그룹 기준 — 글당 1개. 발행 시 필수, 초안 저장 시에는 비워도 된다 */
  category: string;
  tags: string;
}

export function emptyForm(): FrontmatterForm {
  return {
    title: "",
    description: "",
    date: new Date().toISOString().slice(0, 10),
    category: "",
    tags: "",
  };
}

/** 폼 상태 → API frontmatter (서버 zod 스키마가 최종 판정) */
export function toFrontmatter(form: FrontmatterForm): PostFrontmatter {
  return {
    title: form.title,
    description: form.description,
    date: form.date,
    // 앞뒤 공백은 여기서 턴다 — " JavaScript"가 별도 분류로 갈라지지 않게.
    // 대소문자는 건드리지 않는다: 표기는 사용자 의도다.
    category: form.category.trim(),
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
    category: typeof data.category === "string" ? data.category : "",
    tags: Array.isArray(data.tags) ? data.tags.join(", ") : "",
  };
}

export interface ApiErrorInfo {
  status: number;
  code: string;
  message: string;
  detail?: unknown;
}

/**
 * 서버 검증 메시지 → 사람 말.
 *
 * 서버는 zod 경로를 그대로 붙여 `title: title은 비울 수 없습니다`처럼 필드명을 두 번 말하고,
 * 소비처는 여기에 코드까지 얹어 `서버 검증 실패 (invalid-frontmatter): ...`로 보여줬다.
 * 운영자에게 필요한 건 "무엇을 어떻게 고치면 되는가"뿐이다 — 코드와 내부 필드명은 지운다.
 */
const FIELD_LABELS: Record<string, string> = {
  title: "제목",
  description: "요약",
  date: "발행일",
  category: "분류",
  tags: "태그",
  slug: "slug",
};

/** 한글 마지막 글자에 받침이 있는가 — 조사 선택 기준 */
function hasFinalConsonant(word: string): boolean {
  const last = word.trim().at(-1);
  if (!last) return false;
  const code = last.charCodeAt(0);
  // 한글 음절 영역이 아니면(영문·숫자 등) 판정하지 않고 받침 없음으로 둔다
  if (code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
}

/**
 * 라벨을 바꾸면 뒤에 붙은 조사가 어긋난다.
 * "date는" → "발행일는"(X) → "발행일은"(O). 받침 유무로 교정한다.
 */
const PARTICLE_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ["은", "는"],
  ["이", "가"],
  ["을", "를"],
  ["과", "와"],
];

function fixParticle(label: string, rest: string): string {
  const withFinal = hasFinalConsonant(label);
  for (const [withBatchim, withoutBatchim] of PARTICLE_PAIRS) {
    if (rest.startsWith(withBatchim) || rest.startsWith(withoutBatchim)) {
      const correct = withFinal ? withBatchim : withoutBatchim;
      return correct + rest.slice(1);
    }
  }
  return rest;
}

export function humanizeValidationMessage(raw: string): string {
  return raw
    .split(";")
    .map((part) => {
      const trimmed = part.trim();
      if (!trimmed) return "";
      // "title: title은 비울 수 없습니다" → 앞의 경로 라벨 제거
      const m = /^([a-zA-Z_][\w.]*)\s*:\s*(.+)$/.exec(trimmed);
      if (!m) return trimmed;
      const [, field, rest] = m;
      const label = FIELD_LABELS[field];
      // 본문에 이미 필드명이 들어 있으면 라벨을 다시 붙이지 않고 자리만 바꾼다
      if (rest.startsWith(field)) {
        const tail = rest.slice(field.length);
        return label ? `${label}${fixParticle(label, tail)}` : rest;
      }
      return label ? `${label}: ${rest}` : rest;
    })
    .filter(Boolean)
    .join(" · ");
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
