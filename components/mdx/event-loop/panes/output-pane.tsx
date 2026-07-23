// 누적 콘솔 출력 패널 — output은 append-only (data-model I2)
export function OutputPane({ items }: { items: string[] }) {
  return (
    <section className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
      <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">출력</div>
      <div className="mt-2 min-h-9 font-mono text-xs leading-5 text-zinc-800 dark:text-zinc-200">
        {items.length === 0 ? (
          <p className="font-sans text-zinc-400 dark:text-zinc-500">아직 출력이 없어요</p>
        ) : (
          items.map((text, i) => (
            <div key={`${i}-${text}`} className="animate-in fade-in motion-reduce:animate-none">
              {text}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
