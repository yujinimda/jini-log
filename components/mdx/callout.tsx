const styles = {
  info: "border-blue-300 bg-blue-50 text-blue-900",
  warn: "border-amber-300 bg-amber-50 text-amber-900",
  error: "border-red-300 bg-red-50 text-red-900",
} as const;

export function Callout({
  type = "info",
  children,
}: {
  type?: keyof typeof styles;
  children: React.ReactNode;
}) {
  return (
    <aside role="note" className={`my-4 rounded-lg border px-4 py-3 ${styles[type]}`}>
      {children}
    </aside>
  );
}
