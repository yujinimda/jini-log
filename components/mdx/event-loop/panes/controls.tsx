// 이전/다음/처음부터 + 스텝 표시 — 경계에서 버튼 비활성 (US1-AC3, data-model §5)
const buttonClass =
  "rounded border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800";

export function Controls({
  stepIndex,
  stepCount,
  onPrev,
  onNext,
  onReset,
}: {
  stepIndex: number;
  stepCount: number;
  onPrev: () => void;
  onNext: () => void;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onReset}
        disabled={stepIndex === 0}
        aria-label="처음부터"
        className={buttonClass}
      >
        처음부터
      </button>
      <button
        type="button"
        onClick={onPrev}
        disabled={stepIndex === 0}
        aria-label="이전 스텝"
        className={buttonClass}
      >
        ← 이전
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={stepIndex === stepCount - 1}
        aria-label="다음 스텝"
        className={buttonClass}
      >
        다음 →
      </button>
      <span className="ml-auto text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
        {stepIndex + 1} / {stepCount}
      </span>
    </div>
  );
}
