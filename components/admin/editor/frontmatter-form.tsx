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
/** 이보다 짧으면 부드럽게 알린다 — 차단은 아니다. 검색 결과에 뜨는 길이를 채우고
    키워드가 들어갈 만한 최소선. 실제 발행 글들이 95~120자에 들어온다. */
const DESCRIPTION_MIN_USEFUL = 80;

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
  knownCategories = [],
}: {
  form: FrontmatterForm;
  onChange: (next: FrontmatterForm) => void;
  slug: string;
  onSlugChange: (slug: string) => void;
  slugLocked: boolean;
  /** 이미 쓰인 분류 — 자동완성 후보. 고정 목록이 아니라 새 값도 그냥 칠 수 있다 */
  knownCategories?: string[];
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

      {/* 요약 — 제목보다 작고 유틸리티보다 크다. 200자라 한 줄 입력은 좁다.
          이 값은 검색 결과에 그대로 노출된다 — 그래서 여기에 "사람이 검색창에 칠 말"이
          들어가야 한다. 제목은 문학적이어도 되지만 요약까지 그러면 검색에 안 걸린다.
          그 판단은 기계가 못 하므로 안내만 두고 막지는 않는다 (길이만 부드럽게 경고). */}
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
          placeholder="예) MySQL 외래키는 어느 테이블에 넣을까요. 가리키는 쪽이 상대 번호를 듭니다…"
        />
        <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
          검색 결과에 그대로 나옵니다 — <strong className="font-medium text-zinc-500">이 글을
          찾는 사람이 검색창에 칠 말</strong>을 넣으세요. 제목이 은유적일수록 여기서 받쳐줘야
          합니다.
        </p>
        {form.description.length > 0 && form.description.length < DESCRIPTION_MIN_USEFUL && (
          <p className="mt-1 text-xs text-amber-700">
            조금 짧아요. {DESCRIPTION_MIN_USEFUL}자쯤 되면 검색 결과에서 잘리지 않고 키워드도
            들어갑니다.
          </p>
        )}
      </div>

      {/* 유틸리티 행 — 발행일·분류·태그·slug */}
      <div className="mt-6 grid grid-cols-1 gap-4 border-t border-zinc-100 pt-5 sm:grid-cols-2 lg:grid-cols-[9rem_1fr_1fr_1fr]">
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
          {/* 자유 입력 + datalist 자동완성. select가 아닌 이유: 새 분류를 만들려고
              코드를 고쳐 배포하는 일이 없어야 한다. 대신 기존 값이 후보로 떠서
              JS/javascript처럼 표기가 갈라지는 걸 줄인다. */}
          <span className={utilLabelClass}>분류</span>
          <input
            className={utilInputClass}
            list="known-categories"
            value={form.category}
            onChange={(e) => onChange({ ...form, category: e.target.value })}
            placeholder="JavaScript"
          />
          <datalist id="known-categories">
            {knownCategories.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
          <span className="mt-1 block text-xs text-zinc-400">발행하려면 필요합니다</span>
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
