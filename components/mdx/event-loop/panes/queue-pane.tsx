// webApis·micro·task 공용 큐 패널 — 배열 앞이 다음 실행 (data-model §1), 라벨만 다르다
export function QueuePane({
  label,
  items,
  ordered = true,
}: {
  label: string;
  items: string[];
  /** false = 순서 없는 대기 목록 (webApis — 큐가 아니라 "다음 실행" 표시 없음) */
  ordered?: boolean;
}) {
  return (
    <section className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
      <h4 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{label}</h4>
      <div className="mt-2 flex min-h-9 flex-wrap items-start gap-1">
        {items.length === 0 ? (
          <p className="text-xs text-zinc-400 dark:text-zinc-500">비어 있어요</p>
        ) : (
          items.map((name, i) => (
            <div
              key={`${i}-${name}`}
              className={`animate-in fade-in rounded border px-2 py-1 text-xs motion-reduce:animate-none ${
                ordered && i === 0
                  ? "border-zinc-400 bg-zinc-100 font-medium text-zinc-900 dark:border-zinc-500 dark:bg-zinc-700 dark:text-zinc-100"
                  : "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              }`}
            >
              {ordered && i === 0 && (
                <span className="mr-1 text-[10px] text-zinc-500 dark:text-zinc-400">다음</span>
              )}
              {name}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
