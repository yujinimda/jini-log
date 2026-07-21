/** YYYY-MM-DD → "2026년 7월 21일" (타임존 영향 없이 UTC 고정) */
export function formatDate(date: string): string {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`),
  );
}
