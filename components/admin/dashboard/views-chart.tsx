// 조회수 기간별 추이 표시 (T043, US4) — lib/views의 getDailyViews 데이터를 받아
// 의존성 없는 CSS 막대 차트로 렌더한다 (서버 컴포넌트 안전). 소유: 레인 C
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

export function ViewsChart({ data, days }: { data: DailyViews[]; days: number }) {
  const series = fillDays(data, days);
  const max = Math.max(1, ...series.map((d) => d.count));
  const total = series.reduce((sum, d) => sum + d.count, 0);

  return (
    <div>
      <p className="mb-2 text-xs text-zinc-500">
        최근 {days}일 합계 <span className="font-semibold text-zinc-700">{total}</span>회
      </p>
      <div
        role="img"
        aria-label={`최근 ${days}일 일자별 조회수 차트, 합계 ${total}회`}
        className="flex h-28 items-end gap-px rounded-md border border-zinc-200 bg-zinc-50 p-2"
      >
        {series.map((d) => (
          <div
            key={d.date}
            title={`${d.date}: ${d.count}회`}
            className="min-w-0 flex-1 rounded-t-sm bg-zinc-700"
            style={{ height: `${Math.max(2, (d.count / max) * 100)}%`, opacity: d.count === 0 ? 0.15 : 1 }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-zinc-400">
        <span>{series[0]?.date}</span>
        <span>{series[series.length - 1]?.date}</span>
      </div>
    </div>
  );
}
