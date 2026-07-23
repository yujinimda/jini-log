// 현재 줄 하이라이트만, 구문 강조 없음 (R2) — 기존 CodeBlock 톤(zinc-900·zinc-100) 유지
export function CodePane({ code, line }: { code: string[]; line: number | null }) {
  return (
    <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-3 font-mono text-[13px] leading-6 text-zinc-100">
      {code.map((text, i) => {
        const current = i + 1 === line; // line은 1-base (data-model I1)
        return (
          <div
            key={i}
            className={`flex gap-3 px-1 ${current ? "rounded bg-zinc-600/60" : ""}`}
          >
            <span
              aria-hidden
              className={`w-5 shrink-0 text-right select-none ${current ? "text-zinc-200" : "text-zinc-500"}`}
            >
              {i + 1}
            </span>
            <span className="whitespace-pre">{text || " "}</span>
          </div>
        );
      })}
    </pre>
  );
}
