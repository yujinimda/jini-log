import Link from "next/link";

/** 공개 블로그 공통 헤더 — 타이포 중심의 미니멀 구성 */
export function SiteHeader() {
  return (
    <header className="border-b border-zinc-200">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-6">
        <Link href="/" className="text-lg font-bold tracking-tight text-zinc-900">
          {process.env.SITE_NAME ?? "jini-log"}
        </Link>
        <p className="text-sm text-zinc-500">만지면서 이해하는 기술 블로그</p>
      </div>
    </header>
  );
}
