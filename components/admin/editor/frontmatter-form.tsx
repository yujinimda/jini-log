"use client";
// frontmatter 입력 폼 (T023) — 제목·요약·발행일·태그·slug. 발행 글은 slug 잠금 (FR-016). 소유: 레인 C
//
// 설계 의도 (C7): 예전에는 제목·요약·태그·slug 네 입력이 모두 같은 크기·같은 테두리라
// 제목과 slug의 중요도가 구분되지 않았다. 크기로 위계를 만든다 —
// 제목(큰 입력) > 요약(중간) > 발행일·태그·slug(작은 유틸리티 행).
//
// 세리프는 쓰지 않는다: 002 스펙의 "어드민은 도구적 명료함 우선, 세리프는 콘텐츠 미리보기
// 영역에만" 규칙 때문. 발행 모습의 세리프 제목은 오른쪽 프리뷰 헤더가 보여준다
// (codex-review 반영 — 입력까지 세리프로 두는 안은 규칙 충돌로 기각).
import type { FrontmatterForm } from "./types";

const TITLE_MAX = 120;
const DESCRIPTION_MAX = 200;

/** 유틸리티 행 입력 — 작고 조용하게 */
const utilInputClass =
  "w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-sm text-zinc-800 " +
  "placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10 focus:outline-none";

const utilLabelClass = "mb-1.5 block text-xs font-medium text-zinc-500";

/** 남은 글자수 — 입력을 시작한 뒤에만 보여준다 (빈 화면에서 숫자가 먼저 말 걸지 않게) */
function CharCount({ value, max }: { value: string; max: number }) {
  if (!value) return null;
  const over = value.length > max;
  return (
    <span
      className={`text-xs tabular-nums ${over ? "font-medium text-red-600" : "text-zinc-400"}`}
      aria-live="polite"
    >
      {value.length}/{max}
    </span>
  );
}

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
    <div>
      {/* 제목 — 가장 큰 입력. 무테가 아니라 아래 밑줄 + 뚜렷한 포커스 상태를 준다
          (codex-review: 완전 무테는 입력 가능 영역이 어디까지인지 알기 어렵다) */}
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor="post-title" className={utilLabelClass}>
            제목
          </label>
          <CharCount value={form.title} max={TITLE_MAX} />
        </div>
        <input
          id="post-title"
          className="w-full rounded-md border border-transparent border-b-zinc-200 bg-transparent px-1 py-1.5 text-2xl leading-snug font-semibold tracking-tight text-zinc-900 placeholder:text-xl placeholder:font-normal placeholder:tracking-normal placeholder:text-zinc-300 hover:border-b-zinc-300 focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-900/10 focus:outline-none"
          value={form.title}
          onChange={(e) => onChange({ ...form, title: e.target.value })}
          placeholder="무엇에 대한 글인가요?"
        />
      </div>

      {/* 요약 — 제목보다 작고 유틸리티보다 크다. 200자라 한 줄 입력은 좁다 */}
      <div className="mt-5">
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor="post-description" className={utilLabelClass}>
            요약
          </label>
          <CharCount value={form.description} max={DESCRIPTION_MAX} />
        </div>
        <textarea
          id="post-description"
          rows={2}
          className="w-full resize-none rounded-md border border-zinc-200 bg-white px-2.5 py-2 text-sm leading-relaxed text-zinc-700 placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10 focus:outline-none"
          value={form.description}
          onChange={(e) => onChange({ ...form, description: e.target.value })}
          placeholder="목록 카드와 검색 결과에 쓰입니다"
        />
      </div>

      {/* 유틸리티 행 — 발행일·태그·slug */}
      <div className="mt-6 grid grid-cols-1 gap-4 border-t border-zinc-100 pt-5 sm:grid-cols-[10rem_1fr_1fr]">
        <label className="block">
          {/* 예전에는 date가 폼 상태에만 있고 입력 UI가 없어 항상 오늘로 고정됐다 — 백데이팅 불가였다 */}
          <span className={utilLabelClass}>발행일</span>
          <input
            type="date"
            className={utilInputClass}
            value={form.date}
            onChange={(e) => onChange({ ...form, date: e.target.value })}
          />
        </label>

        <label className="block">
          <span className={utilLabelClass}>태그</span>
          <input
            className={utilInputClass}
            value={form.tags}
            onChange={(e) => onChange({ ...form, tags: e.target.value })}
            placeholder="javascript, async"
          />
          <span className="mt-1 block text-xs text-zinc-400">콤마로 구분</span>
        </label>

        <label className="block">
          <span className={utilLabelClass}>
            slug
            {slugLocked && <span className="ml-1.5 font-normal text-zinc-400">· 발행 후 잠김</span>}
          </span>
          <input
            className={`${utilInputClass} font-mono ${slugLocked ? "cursor-not-allowed bg-zinc-50 text-zinc-400" : ""}`}
            value={slug}
            onChange={(e) => onSlugChange(e.target.value)}
            disabled={slugLocked}
            placeholder="my-post-slug"
          />
          <span className="mt-1 block text-xs text-zinc-400">
            {slugLocked ? "주소가 바뀌면 링크가 깨집니다" : "영문 소문자·숫자·하이픈"}
          </span>
        </label>
      </div>
    </div>
  );
}
