// 검색 인덱스 생성기 (research R3) — prebuild/predev에서 실행. 소유: 레인 A
// 발행 로더(getPublishedPosts → PostDerived)만 사용하므로 초안은 구조적으로 미포함 (FR-003).
// 산출물: generated/search-index.json — SearchCommand가 첫 오픈 시 dynamic import (FR-004).
import fs from "node:fs/promises";
import path from "node:path";
import { getPublishedPosts } from "../lib/content";
import type { SearchEntry } from "../lib/search";

async function main() {
  const posts = await getPublishedPosts();
  const entries: SearchEntry[] = posts.map(({ slug, title, description, tags, excerpt }) => ({
    slug,
    title,
    description,
    tags,
    excerpt,
  }));

  const outDir = path.join(process.cwd(), "generated");
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(
    path.join(outDir, "search-index.json"),
    `${JSON.stringify(entries, null, 2)}\n`,
    "utf8",
  );
  console.log(`search-index: 발행 글 ${entries.length}건 → generated/search-index.json`);
}

main().catch((err) => {
  console.error("검색 인덱스 생성 실패:", err);
  process.exit(1);
});
