import { describe, expect, it } from "vitest";
import {
  formatFrontmatterErrors,
  frontmatterSchema,
  isValidSlug,
  SLUG_PATTERN,
} from "@/lib/content-schema";

describe("content-schema", () => {
  describe("isValidSlug", () => {
    it("영문 소문자, 숫자, 단일 하이픈 조합의 slug를 허용한다", () => {
      // FR-016
      expect(SLUG_PATTERN.source).toBe("^[a-z0-9]+(-[a-z0-9]+)*$");

      for (const slug of ["a", "abc", "a-b", "abc-123", "2026-review"]) {
        expect(isValidSlug(slug)).toBe(true);
      }
    });

    it("대문자, 밑줄, 공백, 잘못된 하이픈, 빈 문자열, 한글, 점을 거부한다", () => {
      // FR-016
      for (const slug of ["A", "abc_DEF", "a b", "-a", "a-", "a--b", "", "한글", "a.b"]) {
        expect(isValidSlug(slug)).toBe(false);
      }
    });
  });

  describe("frontmatterSchema", () => {
    it("title, description, date, tags가 모두 있으면 통과한다", () => {
      // FR-003
      const result = frontmatterSchema.safeParse({
        title: "테스트 글",
        description: "SEO 요약",
        date: "2026-07-21",
        tags: ["mdx", "blog"],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          title: "테스트 글",
          description: "SEO 요약",
          date: "2026-07-21",
          tags: ["mdx", "blog"],
        });
      }
    });

    it("tags를 생략하면 기본값 []로 정규화한다", () => {
      // FR-003
      const result = frontmatterSchema.safeParse({
        title: "테스트 글",
        description: "SEO 요약",
        date: "2026-07-21",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tags).toEqual([]);
      }
    });

    it("필수 필드 title, description, date가 누락되면 해당 필드 이슈로 실패한다", () => {
      // FR-003
      for (const field of ["title", "description", "date"] as const) {
        const base = {
          title: "테스트 글",
          description: "SEO 요약",
          date: "2026-07-21",
        };
        const input = { ...base };
        delete input[field];

        const result = frontmatterSchema.safeParse(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.some((issue) => issue.path[0] === field)).toBe(true);
        }
      }
    });

    it("title은 1~120자만 허용한다", () => {
      // FR-003
      expect(
        frontmatterSchema.safeParse({
          title: "a".repeat(120),
          description: "SEO 요약",
          date: "2026-07-21",
        }).success,
      ).toBe(true);

      const tooLong = frontmatterSchema.safeParse({
        title: "a".repeat(121),
        description: "SEO 요약",
        date: "2026-07-21",
      });
      expect(tooLong.success).toBe(false);
      if (!tooLong.success) {
        expect(tooLong.error.issues.some((issue) => issue.path[0] === "title")).toBe(true);
      }

      const empty = frontmatterSchema.safeParse({
        title: "",
        description: "SEO 요약",
        date: "2026-07-21",
      });
      expect(empty.success).toBe(false);
      if (!empty.success) {
        expect(empty.error.issues.some((issue) => issue.path[0] === "title")).toBe(true);
      }
    });

    it("description은 1~200자만 허용한다", () => {
      // FR-003
      expect(
        frontmatterSchema.safeParse({
          title: "테스트 글",
          description: "a".repeat(200),
          date: "2026-07-21",
        }).success,
      ).toBe(true);

      const tooLong = frontmatterSchema.safeParse({
        title: "테스트 글",
        description: "a".repeat(201),
        date: "2026-07-21",
      });
      expect(tooLong.success).toBe(false);
      if (!tooLong.success) {
        expect(tooLong.error.issues.some((issue) => issue.path[0] === "description")).toBe(true);
      }

      const empty = frontmatterSchema.safeParse({
        title: "테스트 글",
        description: "",
        date: "2026-07-21",
      });
      expect(empty.success).toBe(false);
      if (!empty.success) {
        expect(empty.error.issues.some((issue) => issue.path[0] === "description")).toBe(true);
      }
    });

    it("date는 YYYY-MM-DD 문자열만 허용한다", () => {
      // FR-003
      expect(
        frontmatterSchema.safeParse({
          title: "테스트 글",
          description: "SEO 요약",
          date: "2026-07-21",
        }).success,
      ).toBe(true);

      for (const date of ["2026/07/21", "2026-7-1", "21-07-2026", 20260721]) {
        const result = frontmatterSchema.safeParse({
          title: "테스트 글",
          description: "SEO 요약",
          date,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.some((issue) => issue.path[0] === "date")).toBe(true);
        }
      }
    });

    it("Date 객체는 YYYY-MM-DD 문자열로 정규화해 허용한다", () => {
      // FR-003
      const result = frontmatterSchema.safeParse({
        title: "테스트 글",
        description: "SEO 요약",
        date: new Date(Date.UTC(2026, 6, 21, 12, 0, 0)),
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.date).toBe("2026-07-21");
      }
    });

    it("tags는 각 항목 1~30자만 허용한다", () => {
      // FR-003
      expect(
        frontmatterSchema.safeParse({
          title: "테스트 글",
          description: "SEO 요약",
          date: "2026-07-21",
          tags: ["a", "b".repeat(30)],
        }).success,
      ).toBe(true);

      for (const tags of [["a".repeat(31)], [""]]) {
        const result = frontmatterSchema.safeParse({
          title: "테스트 글",
          description: "SEO 요약",
          date: "2026-07-21",
          tags,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.some((issue) => issue.path[0] === "tags")).toBe(true);
        }
      }
    });
  });

  describe("formatFrontmatterErrors", () => {
    it("ZodError를 '필드: 메시지' 형식의 한 줄 요약으로 변환한다", () => {
      // FR-003
      const result = frontmatterSchema.safeParse({
        description: "",
        date: "2026/07/21",
        tags: [""],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const message = formatFrontmatterErrors(result.error);

        expect(message).toContain("title:");
        expect(message).toContain("description:");
        expect(message).toContain("date:");
        expect(message).toContain("tags.0:");
        expect(message).toContain("; ");
      }
    });
  });
});
