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
  tags: z.array(z.string().min(1).max(30)).default([]),
});

export type Frontmatter = z.infer<typeof frontmatterSchema>;

/** 검증 실패 시 필드별 메시지를 한 줄로 요약 */
export function formatFrontmatterErrors(error: z.ZodError): string {
  return error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ");
}
