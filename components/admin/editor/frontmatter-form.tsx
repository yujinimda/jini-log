"use client";
// frontmatter 입력 폼 (T023) — 제목·요약·태그·slug. 발행 글은 slug 잠금 (FR-016). 소유: 레인 C
import type { FrontmatterForm } from "./types";

const inputClass =
  "w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-zinc-500 focus:outline-none";

export function FrontmatterFields({
  form,
  onChange,
  slug,
  onSlugChange,
  slugLocked,
}: {
  form: FrontmatterForm;
  onChange: (next: FrontmatterForm) => void;
  slug: string;
  onSlugChange: (slug: string) => void;
  slugLocked: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <label className="block md:col-span-2">
        <span className="mb-1 block text-xs font-medium text-zinc-600">제목</span>
        <input
          className={inputClass}
          value={form.title}
          onChange={(e) => onChange({ ...form, title: e.target.value })}
          placeholder="글 제목 (1~120자)"
        />
      </label>
      <label className="block md:col-span-2">
        <span className="mb-1 block text-xs font-medium text-zinc-600">요약</span>
        <input
          className={inputClass}
          value={form.description}
          onChange={(e) => onChange({ ...form, description: e.target.value })}
          placeholder="SEO 요약 (1~200자)"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-zinc-600">태그 (콤마 구분)</span>
        <input
          className={inputClass}
          value={form.tags}
          onChange={(e) => onChange({ ...form, tags: e.target.value })}
          placeholder="react, nextjs"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-zinc-600">
          slug{" "}
          {slugLocked && (
            <span className="text-amber-600">(발행된 글 — 변경 불가)</span>
          )}
        </span>
        <input
          className={`${inputClass} ${slugLocked ? "cursor-not-allowed bg-zinc-100 text-zinc-500" : ""}`}
          value={slug}
          onChange={(e) => onSlugChange(e.target.value)}
          disabled={slugLocked}
          placeholder="my-post-slug (영문 소문자·숫자·하이픈)"
        />
      </label>
    </div>
  );
}
