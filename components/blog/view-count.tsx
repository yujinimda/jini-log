"use client";
// 글 메타 줄의 조회수 — 읽기시간을 대체 (SSG 페이지라 값은 마운트 후 채워진다).
import { useViewTotals } from "./use-view-totals";

/** 1204 → "1,204" — 자릿수 구분 */
const nf = new Intl.NumberFormat("ko-KR");

export function ViewCount({ slug }: { slug: string }) {
  const totals = useViewTotals();

  // 로딩 중에도 자리를 잡아두어 레이아웃이 튀는 폭을 줄인다 (tabular-nums = 숫자 등폭)
  return (
    <span className="tabular-nums">
      조회 {totals === null ? "–" : nf.format(totals[slug] ?? 0)}
    </span>
  );
}
