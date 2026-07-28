"use client";
// 마크다운 편집 툴바 (C8) — 버튼과 단축키가 commands.ts의 같은 명령을 호출한다.
//
// 범위 판단 (codex-review): 마크다운을 아는 1인 운영자에게 값이 있는 것만 남겼다.
// - 기울임은 ⌘I만 두고 버튼은 뺐다 (문법이 단순하고 빈도가 낮다)
// - 인용·목록·구분선도 후순위로 제외
// - H1은 frontmatter 제목과 중복이라 없다
// - EventLoopSimulator·EventLoopQuiz는 글 전용이라 카탈로그에서 제외
//
// 접근성: role="toolbar" + roving tabindex. 툴바 전체가 Tab 한 번을 차지하고
// 내부 이동은 ←→로 한다 — 버튼마다 Tab을 먹으면 에디터 진입이 멀어진다.
import { useRef, useState } from "react";
import type { EditorView } from "@codemirror/view";
import {
  BLOCK_TEMPLATES,
  insertBlock,
  insertCodeBlock,
  insertLink,
  toggleLinePrefix,
  wrapSelection,
} from "./commands";

interface ToolbarAction {
  id: string;
  label: string;
  /** 스크린리더용 — title만으로는 부족하다 (codex-review) */
  aria: string;
  shortcut?: string;
  run: (view: EditorView | null) => void;
}

const ACTIONS: ToolbarAction[] = [
  {
    id: "h2",
    label: "H2",
    aria: "2단계 제목",
    run: (v) => toggleLinePrefix(v, "## "),
  },
  {
    id: "h3",
    label: "H3",
    aria: "3단계 제목",
    run: (v) => toggleLinePrefix(v, "### "),
  },
  {
    id: "bold",
    label: "굵게",
    aria: "굵게",
    shortcut: "⌘B",
    run: (v) => wrapSelection(v, "**", "**", "굵은 텍스트"),
  },
  {
    id: "code",
    label: "코드",
    aria: "인라인 코드",
    run: (v) => wrapSelection(v, "`", "`", "code"),
  },
  {
    id: "link",
    label: "링크",
    aria: "링크 삽입",
    shortcut: "⌘K",
    run: (v) => insertLink(v),
  },
  {
    id: "codeblock",
    label: "코드블록",
    aria: "코드 블록 삽입",
    run: (v) => insertCodeBlock(v),
  },
];

function Divider() {
  return <span aria-hidden="true" className="mx-1 h-4 w-px shrink-0 bg-zinc-200" />;
}

export function EditorToolbar({
  getView,
  onPickImage,
}: {
  getView: () => EditorView | null;
  /** 파일 선택 업로드 — 붙여넣기 기능이 드러나지 않아 버튼의 가치가 크다 (codex-review) */
  onPickImage: () => void;
}) {
  const [focusIndex, setFocusIndex] = useState(0);
  const [blockMenuOpen, setBlockMenuOpen] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  // roving tabindex — 툴바 안에서는 ←→로 이동한다
  const itemCount = ACTIONS.length + 2; // + 이미지 + 블록삽입
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next =
      e.key === "ArrowRight"
        ? (focusIndex + 1) % itemCount
        : (focusIndex - 1 + itemCount) % itemCount;
    setFocusIndex(next);
    barRef.current?.querySelectorAll<HTMLElement>("[data-toolbar-item]")[next]?.focus();
  };

  const itemProps = (index: number) => ({
    "data-toolbar-item": true,
    tabIndex: focusIndex === index ? 0 : -1,
    onFocus: () => setFocusIndex(index),
    type: "button" as const,
    className:
      "shrink-0 rounded-md px-2 py-1.5 text-xs font-medium text-zinc-600 transition-colors " +
      "hover:bg-zinc-200/70 hover:text-zinc-900 focus:ring-2 focus:ring-zinc-900/20 focus:outline-none",
  });

  return (
    <div
      ref={barRef}
      role="toolbar"
      aria-label="본문 서식"
      aria-orientation="horizontal"
      onKeyDown={onKeyDown}
      className="flex flex-wrap items-center gap-0.5 border-b border-zinc-200 bg-zinc-50 px-[clamp(1rem,3%,2rem)] py-1.5"
    >
      {ACTIONS.map((action, i) => (
        <button
          key={action.id}
          {...itemProps(i)}
          aria-label={action.shortcut ? `${action.aria} (${action.shortcut})` : action.aria}
          title={action.shortcut ? `${action.label} ${action.shortcut}` : action.label}
          onClick={() => action.run(getView())}
        >
          {action.label}
        </button>
      ))}

      <Divider />

      <button
        {...itemProps(ACTIONS.length)}
        aria-label="이미지 올리기"
        title="이미지 — 붙여넣기·드래그도 됩니다"
        onClick={onPickImage}
      >
        이미지
      </button>

      {/* 블록 삽입 — 버튼 여러 개보다 메뉴 하나가 낫다 (codex-review).
          컴포넌트가 늘면 여기 카탈로그만 확장한다. */}
      <span className="relative">
        <button
          {...itemProps(ACTIONS.length + 1)}
          aria-label="컴포넌트 블록 삽입"
          aria-expanded={blockMenuOpen}
          aria-haspopup="menu"
          title="Callout·Collapse 삽입"
          onClick={() => setBlockMenuOpen((v) => !v)}
        >
          블록 +
        </button>
        {blockMenuOpen && (
          <>
            {/* 바깥 클릭으로 닫기 */}
            <span
              className="fixed inset-0 z-10"
              aria-hidden="true"
              onClick={() => setBlockMenuOpen(false)}
            />
            <span
              role="menu"
              className="absolute top-full left-0 z-20 mt-1 flex w-56 flex-col rounded-md border border-zinc-200 bg-white py-1 shadow-lg"
            >
              {BLOCK_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  role="menuitem"
                  type="button"
                  className="px-3 py-2 text-left text-xs hover:bg-zinc-50 focus:bg-zinc-50 focus:outline-none"
                  onClick={() => {
                    setBlockMenuOpen(false);
                    insertBlock(getView(), tpl.build);
                  }}
                >
                  <span className="block font-medium text-zinc-800">{tpl.label}</span>
                  <span className="block text-zinc-400">{tpl.hint}</span>
                </button>
              ))}
            </span>
          </>
        )}
      </span>

      <span className="ml-auto hidden shrink-0 pr-1 text-xs text-zinc-400 sm:block">
        이미지는 붙여넣거나 끌어다 놓아도 됩니다
      </span>
    </div>
  );
}

