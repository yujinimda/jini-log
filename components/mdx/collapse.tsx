export function Collapse({
  summary,
  children,
}: {
  summary: string;
  children: React.ReactNode;
}) {
  return (
    <details className="my-4 rounded-lg border border-zinc-200 px-4 py-3">
      <summary className="cursor-pointer font-medium select-none">{summary}</summary>
      <div className="mt-2">{children}</div>
    </details>
  );
}
