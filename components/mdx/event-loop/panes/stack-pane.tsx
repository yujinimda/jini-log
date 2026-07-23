// 콜스택 패널 — 배열 끝이 최상단 (data-model §1), 시각화는 아래에서 위로 쌓인다
export function StackPane({ items }: { items: string[] }) {
  return (
    <section className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
      <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">콜스택</div>
      <div className="mt-2 flex min-h-24 flex-col-reverse justify-start gap-1">
        {items.length === 0 ? (
          <p className="text-xs text-zinc-400 dark:text-zinc-500">비어 있어요</p>
        ) : (
          items.map((name, i) => (
            <div
              key={`${i}-${name}`}
              className={`animate-in fade-in rounded border px-2 py-1 text-xs motion-reduce:animate-none ${
                i === items.length - 1
                  ? "border-zinc-400 bg-zinc-100 font-medium text-zinc-900 dark:border-zinc-500 dark:bg-zinc-700 dark:text-zinc-100"
                  : "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              }`}
            >
              {name}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
