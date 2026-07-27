"use client";
// 글별 누적 조회수를 브라우저에서 가져온다 (SSG 유지 + 항상 최신).
// 목록 페이지에는 <ViewCount />가 글 수만큼 마운트되므로, 요청은 반드시 1번으로 합쳐야 한다.
import { useEffect, useState } from "react";

export type ViewTotals = Record<string, number>;

// 모듈 스코프 변수 — 이 모듈은 페이지당 한 번만 평가되므로,
// 여기 담긴 값은 모든 <ViewCount /> 인스턴스가 공유한다.
let inflight: Promise<ViewTotals> | null = null;

/**
 * 목록 페이지에서 <ViewCount />가 N개 동시에 마운트돼도 요청은 1번만 나간다.
 *
 * 핵심은 `await` 없이 프로미스 자체를 즉시 inflight에 넣는 것 — 응답을 기다린 뒤
 * 저장하면 그 사이 마운트된 나머지가 전부 각자 fetch를 시작한다(경쟁 조건).
 *
 * 실패 시 inflight를 비워 다음 마운트에서 재시도할 수 있게 한다 —
 * 일시적 네트워크 오류가 새로고침 전까지 영구 빈 값으로 굳는 것 방지.
 */
export function fetchTotals(): Promise<ViewTotals> {
  inflight ??= (async () => {
    const res = await fetch("/api/views", { cache: "no-store" });
    if (!res.ok) throw new Error(`조회수 조회 실패: ${res.status}`);
    return (await res.json()) as ViewTotals;
  })().catch(() => {
    // 이 시점은 ??= 대입이 끝난 뒤(다음 마이크로태스크)라 null 대입이 안전하다
    inflight = null;
    return {} as ViewTotals;
  });
  return inflight;
}

/** 테스트 전용 — 모듈 스코프 캐시가 케이스 간에 새지 않도록 초기화 */
export function resetViewTotalsCache(): void {
  inflight = null;
}

/** 조회수 맵 — 로딩 중에는 null */
export function useViewTotals(): ViewTotals | null {
  const [totals, setTotals] = useState<ViewTotals | null>(null);

  useEffect(() => {
    // 언마운트 후 setState 방지 (React 경고)
    let alive = true;
    void fetchTotals().then((next) => {
      if (alive) setTotals(next);
    });
    return () => {
      alive = false;
    };
  }, []);

  return totals;
}
