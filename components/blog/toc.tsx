"use client";
// 목차 (002 T012 — FR-008) — lib/toc의 getToc(공유 파이프라인) 결과를 렌더. 소유: 레인 B
// ≥1280px: 본문 우측 고정 + IntersectionObserver 현재 절 하이라이트 / 미만: 상단 접이식(details).
// 점진적 향상 — JS 실패해도 앵커 링크는 동작한다.
import { useEffect, useRef, useState } from "react";
import type { TocEntry } from "@/lib/toc";

/** 현재 절 추적 — 화면 상단 영역(뷰포트 위 40%)에 들어온 제목 중 문서 순서상 첫 항목 */
function useActiveHeading(entries: TocEntry[]): string | null {
  const [activeId, setActiveId] = useState<string | null>(entries[0]?.id ?? null);
  const inZone = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (entries.length === 0) return;
    const headings = entries
      .map((entry) => document.getElementById(entry.id))
      .filter((el): el is HTMLElement => el !== null);

    const observer = new IntersectionObserver(
      (observed) => {
        for (const record of observed) {
          if (record.isIntersecting) inZone.current.add(record.target.id);
          else inZone.current.delete(record.target.id);
        }
        // 영역 안 제목이 있으면 그중 문서 순서 첫 항목, 없으면 직전 하이라이트 유지
        const first = entries.find((entry) => inZone.current.has(entry.id));
        if (first) setActiveId(first.id);
      },
      // 상단 0~40% 구간을 "현재 읽는 위치"로 본다
      { rootMargin: "0px 0px -60% 0px" },
    );
    headings.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [entries]);

  return activeId;
}

function TocLinks({ entries, activeId }: { entries: TocEntry[]; activeId: string | null }) {
  return (
    <ul className="space-y-2 text-sm">
      {entries.map((entry) => {
        const active = entry.id === activeId;
        return (
          <li key={entry.id} className={entry.depth === 3 ? "pl-4" : undefined}>
            <a
              href={`#${entry.id}`}
              aria-current={active ? "true" : undefined}
              data-active={active ? "true" : undefined}
              className={
                active
                  ? "font-medium text-zinc-900"
                  : "text-zinc-500 transition-colors hover:text-zinc-900"
              }
            >
              {entry.text}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

/** 목차 — entries가 비면 렌더하지 않는다 (h2/h3 없는 글) */
export function Toc({ entries }: { entries: TocEntry[] }) {
  const activeId = useActiveHeading(entries);

  if (entries.length === 0) return null;

  return (
    <>
      {/* 데스크톱(≥1280px): 본문 42rem 컬럼 우측에 고정 */}
      <aside className="fixed top-40 left-[calc(50%+23rem)] hidden w-56 xl:block">
        <nav aria-label="목차">
          <p className="mb-3 text-xs font-semibold tracking-wide text-zinc-400">목차</p>
          <TocLinks entries={entries} activeId={activeId} />
        </nav>
      </aside>
      {/* 모바일·태블릿(<1280px): 본문 상단 접이식 */}
      <details className="mb-10 border-y border-zinc-200 py-3 xl:hidden">
        <summary className="cursor-pointer text-sm font-medium text-zinc-600 select-none">
          목차
        </summary>
        <nav aria-label="목차" className="mt-3">
          <TocLinks entries={entries} activeId={activeId} />
        </nav>
      </details>
    </>
  );
}
