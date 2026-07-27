// 유입 출처 분포 (C4) — lib/referrers의 getReferrerTotals 데이터를 받아 비율 막대로 렌더.
// 서버 컴포넌트. 소유: 레인 C
import { referrerLabel, type ReferrerTotal } from "@/lib/referrers";

export function ReferrerList({ data, days }: { data: ReferrerTotal[]; days: number }) {
  const total = data.reduce((sum, d) => sum + d.total, 0);

  if (total === 0) {
    return (
      <p className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-6 text-center text-xs text-zinc-500">
        아직 집계된 유입이 없습니다. 기록은 프로덕션 배포에서만 쌓입니다.
      </p>
    );
  }

  return (
    <div>
      <p className="mb-2 text-xs text-zinc-500">
        최근 {days}일 합계 <span className="font-semibold text-zinc-700">{total}</span>회
      </p>
      <ul className="space-y-1.5 rounded-md border border-zinc-200 bg-zinc-50 p-3">
        {data.map((row) => {
          const pct = Math.round((row.total / total) * 100);
          return (
            <li key={row.source} className="flex items-center gap-3 text-xs">
              {/* DB에는 안정 키(google·direct…)가 들어가고 한글은 여기서만 붙인다 */}
              <span className="w-20 shrink-0 truncate text-zinc-600">
                {referrerLabel(row.source)}
              </span>
              <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-zinc-200">
                <span
                  className="block h-full rounded-full bg-zinc-700"
                  style={{ width: `${Math.max(2, pct)}%` }}
                />
              </span>
              <span className="w-14 shrink-0 text-right tabular-nums text-zinc-500">
                {row.total}회 · {pct}%
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-1.5 text-[10px] leading-relaxed text-zinc-400">
        검색어는 표시할 수 없습니다 — 검색엔진이 Referrer-Policy로 쿼리를 제거해 보냅니다. 실제
        검색어는 Google Search Console·네이버 서치어드바이저 연동이 필요합니다.
      </p>
    </div>
  );
}
