import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// FR-002, T020
interface SearchEntry {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  excerpt: string;
}

type SearchModule = {
  searchPosts: (entries: SearchEntry[], query: string) => SearchEntry[];
};

// 레인 A가 아직 모듈을 구현하지 않음 — 모듈 부재 시 skip (구현 머지 후 자동 활성화)
// specifier를 변수로 우회: tsc가 미존재 모듈을 정적 해석하지 않게 함 (vitest는 런타임에 alias 해석)
const searchFile = path.resolve(__dirname, "../../lib/search.ts");
const searchSpecifier: string = "@/lib/search";
const searchModule = existsSync(searchFile) ? ((await import(searchSpecifier)) as SearchModule) : null;
const describeSearch = describe.skipIf(!searchModule);

function entry(overrides: Partial<SearchEntry> = {}): SearchEntry {
  return {
    slug: "default-slug",
    title: "기본 제목",
    description: "기본 설명",
    tags: ["basic"],
    excerpt: "기본 본문",
    ...overrides,
  };
}

describeSearch("searchPosts", () => {
  it("빈 쿼리면 엔트리가 있어도 빈 배열을 반환한다", () => {
    // FR-002, T020
    const result = searchModule!.searchPosts([entry()], "");

    expect(result).toEqual([]);
  });

  it("아무것도 매칭되지 않으면 빈 배열을 반환한다", () => {
    // FR-002, T020
    const entries = [
      entry({
        slug: "alpha",
        title: "알파",
        description: "첫 글",
        tags: ["one"],
        excerpt: "본문 A",
      }),
      entry({
        slug: "beta",
        title: "베타",
        description: "둘째 글",
        tags: ["two"],
        excerpt: "본문 B",
      }),
    ];

    const result = searchModule!.searchPosts(entries, "없는검색어");

    expect(result).toEqual([]);
  });

  it("영문 대소문자를 구분하지 않고 제목 substring으로 찾는다", () => {
    // FR-002, T020
    const entries = [
      entry({
        slug: "hello-world",
        title: "Hello World",
      }),
    ];

    expect(searchModule!.searchPosts(entries, "hello").map((item) => item.slug)).toEqual([
      "hello-world",
    ]);
    expect(searchModule!.searchPosts(entries, "HELLO").map((item) => item.slug)).toEqual([
      "hello-world",
    ]);
  });

  it("한글도 제목 substring으로 매칭한다", () => {
    // FR-002, T020
    const entries = [
      entry({
        slug: "jini-log-start",
        title: "지니로그 시작",
      }),
    ];

    const result = searchModule!.searchPosts(entries, "니로그");

    expect(result.map((item) => item.slug)).toEqual(["jini-log-start"]);
  });

  it("제목, 태그, 설명, 본문 발췌 어느 필드로 매칭돼도 결과에 포함한다", () => {
    // FR-002, T020
    const query = "needle";
    const entries = [
      entry({
        slug: "title-only",
        title: `제목 ${query}`,
        description: "설명",
        tags: ["tag"],
        excerpt: "본문",
      }),
      entry({
        slug: "tags-only",
        title: "제목",
        description: "설명",
        tags: [query],
        excerpt: "본문",
      }),
      entry({
        slug: "description-only",
        title: "제목",
        description: `설명 ${query}`,
        tags: ["tag"],
        excerpt: "본문",
      }),
      entry({
        slug: "excerpt-only",
        title: "제목",
        description: "설명",
        tags: ["tag"],
        excerpt: `본문 ${query}`,
      }),
    ];

    const result = searchModule!.searchPosts(entries, query);

    expect(result).toHaveLength(4);
    expect(result.map((item) => item.slug)).toEqual(
      expect.arrayContaining(["title-only", "tags-only", "description-only", "excerpt-only"]),
    );
  });

  it("가중 순서대로 제목, 태그, 설명, 본문 매치를 우선 정렬한다", () => {
    // FR-002, T020
    const query = "needle";
    const entries = [
      entry({
        slug: "excerpt-only",
        title: "본문 엔트리",
        description: "설명",
        tags: ["tag"],
        excerpt: `본문에만 ${query}`,
      }),
      entry({
        slug: "description-only",
        title: "설명 엔트리",
        description: `설명에만 ${query}`,
        tags: ["tag"],
        excerpt: "본문",
      }),
      entry({
        slug: "tags-only",
        title: "태그 엔트리",
        description: "설명",
        tags: [query],
        excerpt: "본문",
      }),
      entry({
        slug: "title-only",
        title: `${query} 제목 엔트리`,
        description: "설명",
        tags: ["tag"],
        excerpt: "본문",
      }),
    ];

    const result = searchModule!.searchPosts(entries, query);

    expect(result.map((item) => item.slug)).toEqual([
      "title-only",
      "tags-only",
      "description-only",
      "excerpt-only",
    ]);
  });

  it("매칭되지 않은 엔트리는 결과에 포함하지 않는다", () => {
    // FR-002, T020
    const entries = [
      entry({
        slug: "matched",
        title: "검색 대상",
        description: "설명",
        tags: ["tag"],
        excerpt: "본문",
      }),
      entry({
        slug: "unmatched",
        title: "다른 글",
        description: "다른 설명",
        tags: ["misc"],
        excerpt: "다른 본문",
      }),
    ];

    const result = searchModule!.searchPosts(entries, "검색");

    expect(result.map((item) => item.slug)).toEqual(["matched"]);
    expect(result.some((item) => item.slug === "unmatched")).toBe(false);
  });
});
