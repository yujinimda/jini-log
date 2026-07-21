"use client";

import { useRef, useState } from "react";

/** MDX의 pre를 대체 — 코드블록에 복사 버튼 (US2 시나리오 3) */
export function CodeBlock(props: React.HTMLAttributes<HTMLPreElement>) {
  const preRef = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  async function copy() {
    const text = preRef.current?.textContent ?? "";
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="group relative">
      <pre
        ref={preRef}
        {...props}
        className="overflow-x-auto rounded-lg bg-zinc-900 p-4 text-sm text-zinc-100"
      />
      <button
        type="button"
        onClick={copy}
        aria-label="코드 복사"
        className="absolute top-2 right-2 rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-xs text-zinc-300 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
      >
        {copied ? "복사됨" : "복사"}
      </button>
    </div>
  );
}
