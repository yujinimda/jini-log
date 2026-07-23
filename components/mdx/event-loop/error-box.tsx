// 참조 오류용 에러 박스 (FR-004 — 조용한 실패 금지). Callout error와 같은 rose 톤.
export function ErrorBox({ title, detail }: { title: string; detail: string }) {
  return (
    <div
      role="alert"
      className="my-4 rounded-lg border border-rose-200/70 bg-rose-50/50 px-4 py-3 text-sm text-rose-950/80 dark:border-rose-500/30 dark:bg-rose-950/30 dark:text-rose-200"
    >
      <p className="font-semibold">{title}</p>
      <p className="mt-1">{detail}</p>
    </div>
  );
}
