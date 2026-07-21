import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// FR-003, T020
interface SearchEntry {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  excerpt: string;
}

const repoRoot = path.resolve(__dirname, "../..");
const indexFile = path.resolve(repoRoot, "generated/search-index.json");
const publishedDir = path.resolve(repoRoot, "content/posts");
const draftsDir = path.resolve(repoRoot, "content/drafts");

// prebuild 산출물 — pnpm build/dev 후 활성화
const describeSearchIndex = describe.skipIf(!existsSync(indexFile));

function listMdxSlugs(directory: string): string[] {
  if (!existsSync(directory)) {
    return [];
  }

  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".mdx"))
    .map((entry) => entry.name.replace(/\.mdx$/u, ""))
    .sort();
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isSearchEntry(value: unknown): value is SearchEntry {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.slug === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.description === "string" &&
    isStringArray(candidate.tags) &&
    typeof candidate.excerpt === "string"
  );
}

function readSearchIndex(): unknown {
  return JSON.parse(readFileSync(indexFile, "utf8")) as unknown;
}

/** 배열 확인 후 SearchEntry만 추출 — unknown 위에서 바로 filter를 호출하지 않기 위한 헬퍼 */
function readSearchEntries(): SearchEntry[] {
  const index = readSearchIndex();
  expect(Array.isArray(index)).toBe(true);
  return (index as unknown[]).filter(isSearchEntry);
}

describeSearchIndex("generated/search-index.json", () => {
  it("SearchEntry 배열 형식을 만족한다", () => {
    // FR-003, T020
    const index = readSearchIndex();

    expect(Array.isArray(index)).toBe(true);
    expect((index as unknown[]).every((entry) => isSearchEntry(entry))).toBe(true);
  });

  it("초안 slug를 어떤 경우에도 포함하지 않는다", () => {
    // FR-003, T020
    const entries = readSearchEntries();
    const draftSlugs = new Set(listMdxSlugs(draftsDir));

    expect(entries.some((entry) => draftSlugs.has(entry.slug))).toBe(false);
  });

  it("발행 글 slug 전체와 인덱스 slug 집합이 정확히 일치한다", () => {
    // FR-003, T020
    const entries = readSearchEntries();
    const entrySlugs = entries.map((entry) => entry.slug).sort();
    const publishedSlugs = listMdxSlugs(publishedDir);

    expect(entrySlugs).toEqual(publishedSlugs);
  });

  it("모든 excerpt는 500자 이하이다", () => {
    // FR-003, T020
    const entries = readSearchEntries();

    for (const entry of entries) {
      expect(entry.excerpt.length).toBeLessThanOrEqual(500);
    }
  });
});
