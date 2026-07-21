"use client";
// 검색 결과 패널 (002 T016) — SearchCommand가 다이얼로그를 처음 열 때 next/dynamic으로 로드. 소유: 레인 B
// 검색 인덱스(dynamic import)는 이 모듈에만 존재한다 — 이 모듈 자체가 지연 청크라
// 첫 페이지 로드에는 인덱스가 포함되지 않는다 (FR-004). 매칭은 lib/search.searchPosts에 위임.
import { useEffect, useMemo, useState } from "react";
import { CommandEmpty, CommandItem } from "@/components/ui/command";
import { searchPosts, type SearchEntry } from "@/lib/search";

export default function SearchResults({
  query,
  onSelect,
}: {
  query: string;
  onSelect: (slug: string) => void;
}) {
  const [entries, setEntries] = useState<SearchEntry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("@/generated/search-index.json").then((mod) => {
      if (!cancelled) setEntries(mod.default as SearchEntry[]);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const results = useMemo(
    () => (entries ? searchPosts(entries, query) : []),
    [entries, query],
  );

  if (entries === null) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        검색 인덱스를 불러오는 중…
      </p>
    );
  }

  if (query.trim() === "") {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        제목·태그·설명·본문으로 발행 글을 찾습니다
      </p>
    );
  }

  return (
    <>
      <CommandEmpty>결과 없음</CommandEmpty>
      {results.map((entry) => (
        <CommandItem key={entry.slug} value={entry.slug} onSelect={() => onSelect(entry.slug)}>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate font-medium">{entry.title}</span>
            <span className="truncate text-xs text-muted-foreground">{entry.description}</span>
          </span>
        </CommandItem>
      ))}
    </>
  );
}
