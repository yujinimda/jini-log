"use client";
// ⌘K 검색 (002 T016 — FR-001~004, R3·R4) — 공개 레이아웃에만 마운트(어드민 제외 — 계약). 소유: 레인 B
// 결과 패널(인덱스 dynamic import 포함)은 next/dynamic으로 분리 — 다이얼로그를 처음 열 때 청크가 로드되고,
// 첫 페이지 로드에는 인덱스가 딸려오지 않는다 (FR-004). "네트워크 왕복 없음"(정적 청크)은 유지.
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
} from "@/components/ui/command";

// ssr:false — 다이얼로그가 처음 열릴 때만 이 청크(+ 검색 인덱스)를 로드한다
const SearchResults = dynamic(() => import("@/components/blog/search-results"), {
  ssr: false,
  loading: () => (
    <p className="py-6 text-center text-sm text-muted-foreground">검색 인덱스를 불러오는 중…</p>
  ),
});

/** 헤더 버튼 → 다이얼로그 오픈 브로드캐스트 (버튼과 다이얼로그가 다른 트리에 있어 이벤트로 연결) */
const OPEN_SEARCH_EVENT = "jini-log:open-search";

/** 헤더의 검색 버튼 — SearchCommand 다이얼로그를 연다 (T017) */
export function SearchButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_SEARCH_EVENT))}
      className="flex items-baseline gap-1.5 text-zinc-500 transition-colors hover:text-zinc-900"
    >
      검색
      <kbd className="hidden rounded border border-zinc-200 px-1 font-sans text-[0.6875rem] text-zinc-400 sm:inline-block">
        ⌘K
      </kbd>
    </button>
  );
}

/** ⌘K/Ctrl+K·헤더 버튼으로 여는 사이트 내 검색 다이얼로그 */
export function SearchCommand() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  // 첫 오픈 이후 결과 패널을 계속 마운트 유지 — 닫아도 인덱스 재로드 방지 (오픈 의도가 있을 때만 true)
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    function onKeydown(event: KeyboardEvent) {
      // cmdk류 관례와 동일하게 소문자 k 기준 — Shift 조합(대문자 K)도 허용
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpened(true);
        setOpen((prev) => !prev);
      }
    }
    const onOpenEvent = () => {
      setOpened(true);
      setOpen(true);
    };
    window.addEventListener("keydown", onKeydown);
    window.addEventListener(OPEN_SEARCH_EVENT, onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKeydown);
      window.removeEventListener(OPEN_SEARCH_EVENT, onOpenEvent);
    };
  }, []);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setQuery("");
  }

  function goTo(slug: string) {
    handleOpenChange(false);
    router.push(`/posts/${slug}`);
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="사이트 내 검색"
      description="제목·태그·설명·본문으로 발행 글을 찾습니다"
    >
      {/* cmdk 자체 필터는 끈다 — 매칭은 searchPosts에 위임 */}
      <Command shouldFilter={false}>
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="검색어를 입력하세요…"
        />
        <CommandList>{opened ? <SearchResults query={query} onSelect={goTo} /> : null}</CommandList>
      </Command>
    </CommandDialog>
  );
}
