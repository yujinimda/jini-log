// frontmatter 스키마·slug 규칙 — data-model.md §1. 소유: 레인 A
import { z } from "zod";

/** FR-016: 영문 소문자·숫자·하이픈 */
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug);
}

// YAML 파서가 날짜를 Date 객체로 넘기는 경우가 있어 문자열로 정규화한다
const dateField = z.preprocess(
  (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v),
  z
    .string({ error: "date는 필수입니다" })
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date는 YYYY-MM-DD 형식이어야 합니다"),
);

export const frontmatterSchema = z.object({
  title: z
    .string({ error: "title은 필수입니다" })
    .min(1, "title은 비울 수 없습니다")
    .max(120, "title은 120자 이하여야 합니다"),
  description: z
    .string({ error: "description은 필수입니다" })
    .min(1, "description은 비울 수 없습니다")
    .max(200, "description은 200자 이하여야 합니다"),
  date: dateField,
  // 좌측 레일의 그룹 기준 — 글당 정확히 1개. tags와 역할이 다르다:
  // category는 "큰 묶음"(구조), tags는 "세부 키워드"(/tags·검색).
  // tags로 그룹핑하면 [javascript, async] 같은 글이 두 그룹에 중복 등장한다.
  // trim을 min(1)보다 **먼저** 건다. 순서가 반대면 "   "(공백만)이 통과하고,
  // 그룹핑에서 trim한 순간 이름 없는 분류 그룹이 생긴다 (codex 지적).
  category: z
    .string({ error: "category는 필수입니다" })
    .trim()
    .min(1, "category는 비울 수 없습니다")
    .max(30, "category는 30자 이하여야 합니다"),
  tags: z.array(z.string().min(1).max(30)).default([]),
});

export type Frontmatter = z.infer<typeof frontmatterSchema>;

/**
 * 초안 저장용 완화 스키마 (C7).
 *
 * 초안은 작업 중인 글이다. 제목·요약을 다 채워야만 저장되면 "쓰다 만 상태로 잠깐 저장"이
 * 불가능해진다 — 실제로 그래서 미완성 글을 저장할 수 없었다.
 * 형식(최대 길이·날짜 포맷)은 그대로 강제하고 **필수 여부만 푼다**.
 *
 * 이 완화가 시스템 전체와 모순되지 않는 근거: lib/types.ts의 InvalidDraft와 FR-014가
 * 이미 "형식 오류가 있는 초안"의 존재를 전제하고 대시보드에 오류로 표시하도록 설계돼 있다.
 * 발행 경로는 frontmatterSchema를 그대로 쓰므로 공개 글의 품질 기준은 낮아지지 않는다.
 */
export const draftFrontmatterSchema = z.object({
  title: z.string({ error: "title은 필수입니다" }).max(120, "title은 120자 이하여야 합니다"),
  description: z
    .string({ error: "description은 필수입니다" })
    .max(200, "description은 200자 이하여야 합니다"),
  date: dateField,
  // 초안은 분류를 아직 안 정했을 수 있다 — title·description과 똑같이 "빈 문자열 허용"으로
  // 푼다(키 생략이 아니라).
  //
  // `.default("")`를 두려다 뺐다: "기존 초안이 안 열린다"는 근거가 틀렸기 때문이다.
  // 초안 목록은 lib/github.ts에서 **발행용** parsePostSource로 읽으므로 default가 있든
  // 없든 category 없는 옛 초안은 invalid 행이 되고, invalid 행도 편집 링크가 있어 열어서
  // 다시 저장할 수 있다 (codex 지적).
  category: z.string({ error: "category는 필수입니다" }).trim().max(30, "category는 30자 이하여야 합니다"),
  tags: z.array(z.string().min(1).max(30)).default([]),
});

/** 검증 실패 시 필드별 메시지를 한 줄로 요약 */
export function formatFrontmatterErrors(error: z.ZodError): string {
  return error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ");
}
