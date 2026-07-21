/** 공개 블로그 공통 푸터 */
export function SiteFooter() {
  return (
    <footer className="border-t border-zinc-200 py-8 text-sm text-zinc-500">
      <p>
        © {new Date().getFullYear()} {process.env.SITE_NAME ?? "jini-log"}
      </p>
    </footer>
  );
}
