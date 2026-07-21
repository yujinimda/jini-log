// 톤다운 파스텔 3색 (002 R7 — grilling 확정 예외): B1 무채색 톤 위에서 절제된 존재감.
// 채도 낮은 색상(sky·amber·rose)의 옅은 단계 + 알파로 배경·테두리를 가라앉히고,
// 텍스트는 거의 무채색에 가까운 950 계열로 유지한다.
const styles = {
  info: "border-sky-200/70 bg-sky-50/50 text-sky-950/80",
  warn: "border-amber-200/70 bg-amber-50/50 text-amber-950/80",
  error: "border-rose-200/70 bg-rose-50/50 text-rose-950/80",
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
