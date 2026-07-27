"use client";
// 조회수 기간별 추이 표시 (T043, US4) — lib/views의 getDailyViews 데이터를 받아
// 의존성 없는 CSS 막대 차트로 렌더한다. 소유: 레인 C
// C4: 막대 hover/focus 시 날짜·조회수 툴팁. 기존 HTML title 속성은 지연이 길고
// 스타일을 줄 수 없어 실질적으로 안 보였다 — 직접 렌더로 교체.
import { useState } from "react";
import type { DailyViews } from "@/lib/views";

/** 최근 days일을 빠짐없이 채운다 — 조회 없는 날은 0 */
function fillDays(data: DailyViews[], days: number): DailyViews[] {
  const byDate = new Map(data.map((d) => [d.date, d.count]));
  const out: DailyViews[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const date = d.toISOString().slice(0, 10);
    out.push({ date, count: byDate.get(date) ?? 0 });
  }
  return out;
}

/** "2026-07-27" → "7월 27일 (월)" */
function formatDay(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][new Date(y, m - 1, d).getDay()];
  return `${m}월 ${d}일 (${weekday})`;
}

export function ViewsChart({ data, days }: { data: DailyViews[]; days: number }) {
  const series = fillDays(data, days);
  const max = Math.max(1, ...series.map((d) => d.count));
  const total = series.reduce((sum, d) => sum + d.count, 0);
  const [hovered, setHovered] = useState<number | null>(null);
  const active = hovered === null ? null : series[hovered];

  return (
    <div>
      <p className="mb-2 text-xs text-zinc-500">
        최근 {days}일 합계 <span className="font-semibold text-zinc-700">{total}</span>회
      </p>
      <div className="relative">
        {/* 툴팁 — 막대 위 고정 높이에 띄우고, 양끝에서는 안쪽으로 당겨 잘리지 않게 한다 */}
        {active && (
          <div
            role="status"
            className="pointer-events-none absolute -top-1 z-10 -translate-y-full rounded-md bg-zinc-900 px-2 py-1 text-xs whitespace-nowrap text-white shadow-sm"
            style={{
              left: `${((hovered! + 0.5) / series.length) * 100}%`,
              transform: `translate(-50%, -100%)`,
              marginLeft:
                hovered! < 2 ? "1.5rem" : hovered! > series.length - 3 ? "-1.5rem" : undefined,
            }}
          >
            {formatDay(active.date)} · <span className="font-semibold">{active.count}</span>회
          </div>
        )}
        <ul
          aria-label={`최근 ${days}일 일자별 조회수, 합계 ${total}회`}
          className="flex h-28 items-end gap-px rounded-md border border-zinc-200 bg-zinc-50 p-2"
          onMouseLeave={() => setHovered(null)}
        >
          {series.map((d, i) => (
            <li
              key={d.date}
              className="flex h-full min-w-0 flex-1 items-end"
              onMouseEnter={() => setHovered(i)}
            >
              {/* 막대 자체는 짧아도 hover 영역은 컬럼 전체 — 0회인 날도 집어낼 수 있다 */}
              <button
                type="button"
                aria-label={`${formatDay(d.date)} ${d.count}회`}
                onFocus={() => setHovered(i)}
                onBlur={() => setHovered(null)}
                className="w-full rounded-t-sm bg-zinc-700 transition-opacity focus:ring-2 focus:ring-zinc-400 focus:outline-none"
                style={{
                  height: `${Math.max(2, (d.count / max) * 100)}%`,
                  opacity: hovered === i ? 1 : d.count === 0 ? 0.15 : 0.85,
                }}
              />
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-zinc-400">
        <span>{series[0]?.date}</span>
        <span>{series[series.length - 1]?.date}</span>
      </div>
    </div>
  );
}
