import { describe, expect, it } from "vitest";
import {
  draftFrontmatterSchema,
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
        category: "테스트",
        tags: ["mdx", "blog"],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          title: "테스트 글",
          description: "SEO 요약",
          date: "2026-07-21",
          category: "테스트",
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
        category: "테스트",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tags).toEqual([]);
      }
    });

    it("필수 필드 title, description, date, category가 누락되면 해당 필드 이슈로 실패한다", () => {
      // FR-003
      for (const field of ["title", "description", "date", "category"] as const) {
        const base = {
          title: "테스트 글",
          description: "SEO 요약",
          date: "2026-07-21",
          category: "테스트",
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
          category: "테스트",
        }).success,
      ).toBe(true);

      const tooLong = frontmatterSchema.safeParse({
        title: "a".repeat(121),
        description: "SEO 요약",
        date: "2026-07-21",
        category: "테스트",
      });
      expect(tooLong.success).toBe(false);
      if (!tooLong.success) {
        expect(tooLong.error.issues.some((issue) => issue.path[0] === "title")).toBe(true);
      }

      const empty = frontmatterSchema.safeParse({
        title: "",
        description: "SEO 요약",
        date: "2026-07-21",
        category: "테스트",
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
          category: "테스트",
        }).success,
      ).toBe(true);

      const tooLong = frontmatterSchema.safeParse({
        title: "테스트 글",
        description: "a".repeat(201),
        date: "2026-07-21",
        category: "테스트",
      });
      expect(tooLong.success).toBe(false);
      if (!tooLong.success) {
        expect(tooLong.error.issues.some((issue) => issue.path[0] === "description")).toBe(true);
      }

      const empty = frontmatterSchema.safeParse({
        title: "테스트 글",
        description: "",
        date: "2026-07-21",
        category: "테스트",
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
          category: "테스트",
        }).success,
      ).toBe(true);

      for (const date of ["2026/07/21", "2026-7-1", "21-07-2026", 20260721]) {
        const result = frontmatterSchema.safeParse({
          title: "테스트 글",
          description: "SEO 요약",
          date,
          category: "테스트",
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
        category: "테스트",
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
          category: "테스트",
          tags: ["a", "b".repeat(30)],
        }).success,
      ).toBe(true);

      for (const tags of [["a".repeat(31)], [""]]) {
        const result = frontmatterSchema.safeParse({
          title: "테스트 글",
          description: "SEO 요약",
          date: "2026-07-21",
          category: "테스트",
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
        category: "테스트",
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

  describe("category — 좌측 레일의 그룹 기준", () => {
    const base = { title: "테스트 글", description: "SEO 요약", date: "2026-07-21" };

    it("발행 글은 category가 필수다", () => {
      // 분류 없는 글이 생기면 레일에 '미분류' 그룹이 생기고 구조가 무너진다
      const missing = frontmatterSchema.safeParse({ ...base });
      expect(missing.success).toBe(false);

      const empty = frontmatterSchema.safeParse({ ...base, category: "" });
      expect(empty.success).toBe(false);
      if (!empty.success) {
        expect(empty.error.issues.some((i) => i.path[0] === "category")).toBe(true);
      }
    });

    it("category는 30자까지 허용한다", () => {
      expect(frontmatterSchema.safeParse({ ...base, category: "가".repeat(30) }).success).toBe(
        true,
      );
      expect(frontmatterSchema.safeParse({ ...base, category: "가".repeat(31) }).success).toBe(
        false,
      );
    });

    it("공백만 있는 값은 거부한다 — trim이 min(1)보다 먼저 걸려야 한다", () => {
      // 순서가 반대면 "   "가 통과하고, 그룹핑에서 trim한 순간 이름 없는 분류가 생긴다
      const blank = frontmatterSchema.safeParse({ ...base, category: "   " });
      expect(blank.success).toBe(false);
    });

    it("앞뒤 공백은 저장 전에 털어낸다 — ' JS'와 'JS'가 다른 분류가 되지 않게", () => {
      const result = frontmatterSchema.safeParse({ ...base, category: "  JavaScript  " });

      expect(result.success).toBe(true);
      if (result.success) expect(result.data.category).toBe("JavaScript");
    });

    it("초안은 category를 비워 저장할 수 있다 — title·description과 같은 완화 방식", () => {
      const result = draftFrontmatterSchema.safeParse({ ...base, category: "", tags: [] });

      expect(result.success).toBe(true);
      if (result.success) expect(result.data.category).toBe("");
    });

    it("초안이라도 길이 제한은 그대로 강제한다", () => {
      const tooLong = draftFrontmatterSchema.safeParse({
        ...base,
        category: "가".repeat(31),
        tags: [],
      });
      expect(tooLong.success).toBe(false);
    });
  });
});
