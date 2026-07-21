// 검색 매칭 (research R3·contracts/ui.md) — 순수 함수, 클라이언트 번들 안전. 소유: 레인 A
// 인덱스 스키마(SearchEntry)는 scripts/generate-search-index.ts 산출물과 공유한다.

/** generated/search-index.json 항목 (data-model §1) */
export interface SearchEntry {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  excerpt: string;
}

/** 필드 가중치 — 제목 > 태그 > 설명 > 본문 발췌 */
const WEIGHT = { title: 8, tags: 4, description: 2, excerpt: 1 } as const;

/**
 * 소문자 정규화 포함 매칭. 빈 쿼리(공백만 포함)는 빈 배열 — 전체 노출 안 함.
 * 여러 필드에 걸치면 가중치를 합산하고, 점수 내림차순(동점은 입력 순서 유지)으로 반환한다.
 */
export function searchPosts(entries: SearchEntry[], query: string): SearchEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const scored: { entry: SearchEntry; score: number }[] = [];
  for (const entry of entries) {
    let score = 0;
    if (entry.title.toLowerCase().includes(q)) score += WEIGHT.title;
    if (entry.tags.some((tag) => tag.toLowerCase().includes(q))) score += WEIGHT.tags;
    if (entry.description.toLowerCase().includes(q)) score += WEIGHT.description;
    if (entry.excerpt.toLowerCase().includes(q)) score += WEIGHT.excerpt;
    if (score > 0) scored.push({ entry, score });
  }
  // Array.prototype.sort는 안정 정렬 — 동점이면 인덱스(최신순) 순서가 유지된다
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.entry);
}
