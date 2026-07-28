"use client";
// 마크다운 편집 명령 (C8) — 툴바와 단축키가 **같은 명령**을 호출한다.
//
// 원칙 (codex-review 반영):
// - body 문자열을 밖에서 조작하지 않고 CodeMirror transaction 하나로 dispatch한다.
//   그래야 명령 하나 = undo 하나가 되고, onChange를 통해 React 상태도 자연히 동기화된다.
// - 다중 선택을 고려해 changeByRange를 쓴다.
// - 한글 IME 조합 중(view.composing)에는 실행하지 않는다 — 조합이 깨진다.
import { EditorSelection } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";

/** 조합 중이면 명령을 건너뛴다 (한글 입력 보호) */
function guard(view: EditorView | null): view is EditorView {
  return !!view && !view.composing;
}

const cursorAt = (pos: number) => EditorSelection.cursor(pos);
const selectRange = (from: number, to: number) => EditorSelection.range(from, to);

/**
 * 선택을 앞뒤로 감싼다. 선택이 없으면 placeholder를 넣고 그 부분을 선택 상태로 둔다 —
 * 바로 이어서 타이핑하면 덮어써진다.
 */
export function wrapSelection(
  view: EditorView | null,
  before: string,
  after: string,
  placeholder: string,
) {
  if (!guard(view)) return;
  view.dispatch(
    view.state.changeByRange((range) => {
      const selected = view.state.sliceDoc(range.from, range.to);
      const inner = selected || placeholder;
      const innerStart = range.from + before.length;
      return {
        changes: { from: range.from, to: range.to, insert: `${before}${inner}${after}` },
        // 선택이 있었으면 감싼 뒤로 커서를 보내고, 없었으면 placeholder를 선택해 둔다 —
        // 바로 타이핑하면 덮어써진다.
        range: selected
          ? cursorAt(innerStart + inner.length + after.length)
          : selectRange(innerStart, innerStart + inner.length),
      };
    }),
    { scrollIntoView: true },
  );
  view.focus();
}

/**
 * 선택이 걸친 줄들의 앞에 prefix를 붙인다(제목·인용·목록).
 * 이미 같은 prefix면 제거해 토글로 동작한다.
 */
export function toggleLinePrefix(view: EditorView | null, prefix: string) {
  if (!guard(view)) return;
  const { state } = view;
  view.dispatch(
    state.changeByRange((range) => {
      const startLine = state.doc.lineAt(range.from);
      const endLine = state.doc.lineAt(range.to);
      const changes = [];
      let delta = 0;

      for (let n = startLine.number; n <= endLine.number; n++) {
        const line = state.doc.line(n);
        // 다른 레벨의 제목이 이미 있으면 교체한다 (## → ###)
        const existing = /^(#{1,6}\s|>\s|-\s|\d+\.\s)/.exec(line.text);
        if (line.text.startsWith(prefix)) {
          changes.push({ from: line.from, to: line.from + prefix.length, insert: "" });
          delta -= prefix.length;
        } else if (existing) {
          changes.push({ from: line.from, to: line.from + existing[0].length, insert: prefix });
          delta += prefix.length - existing[0].length;
        } else {
          changes.push({ from: line.from, to: line.from, insert: prefix });
          delta += prefix.length;
        }
      }
      return { changes, range: cursorAt(Math.max(startLine.from, range.to + delta)) };
    }),
    { scrollIntoView: true },
  );
  view.focus();
}

/**
 * 블록을 삽입한다 — 앞뒤 빈 줄을 보장한다.
 * 선택이 있으면 body 자리에 넣고, 커서는 cursorMarker 위치로 보낸다.
 */
export function insertBlock(
  view: EditorView | null,
  build: (selected: string) => { text: string; cursorOffset: number },
) {
  if (!guard(view)) return;
  const { state } = view;
  const range = state.selection.main;
  const selected = state.sliceDoc(range.from, range.to);
  const { text, cursorOffset } = build(selected);

  // 앞뒤 빈 줄 보장 — 마크다운 블록이 앞 문단에 붙어버리지 않게
  const before = state.sliceDoc(Math.max(0, range.from - 2), range.from);
  const after = state.sliceDoc(range.to, Math.min(state.doc.length, range.to + 2));
  const lead = range.from === 0 || before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
  const trail = range.to === state.doc.length || after.startsWith("\n\n") ? "" : after.startsWith("\n") ? "\n" : "\n\n";

  const insert = `${lead}${text}${trail}`;
  view.dispatch(
    {
      changes: { from: range.from, to: range.to, insert },
      selection: cursorAt(range.from + lead.length + cursorOffset),
      scrollIntoView: true,
    },
  );
  view.focus();
}

/** 코드 블록 — 언어 자리에 커서를 둔다 */
export function insertCodeBlock(view: EditorView | null) {
  insertBlock(view, (selected) => {
    const body = selected || "";
    return { text: "```ts\n" + body + "\n```", cursorOffset: 3 };
  });
}

/** 링크 — 선택이 있으면 표시 텍스트로 쓰고 URL 자리에 커서 */
export function insertLink(view: EditorView | null) {
  if (!guard(view)) return;
  const { state } = view;
  const range = state.selection.main;
  const selected = state.sliceDoc(range.from, range.to);
  const label = selected || "링크 텍스트";
  const insert = `[${label}](url)`;
  const urlStart = range.from + label.length + 3;
  view.dispatch({
    changes: { from: range.from, to: range.to, insert },
    selection: selectRange(urlStart, urlStart + 3),
    scrollIntoView: true,
  });
  view.focus();
}

/**
 * 삽입 가능한 MDX 블록 카탈로그 (C8).
 *
 * 레지스트리(components/mdx/registry.ts)에서 자동 생성하지 않는다 — 렌더 가능 여부와
 * "툴바에서 손으로 넣을 만한가"는 다른 문제다. EventLoopSimulator·EventLoopQuiz는
 * 이벤트 루프 글 전용이고 필수 props가 특수해서 뺐다 (codex-review 반영).
 */
export interface BlockTemplate {
  id: string;
  label: string;
  hint: string;
  build: (selected: string) => { text: string; cursorOffset: number };
}

export const BLOCK_TEMPLATES: BlockTemplate[] = [
  {
    id: "callout-info",
    label: "Callout · 정보",
    hint: "파란 안내 상자",
    build: (s) => ({ text: `<Callout type="info">\n${s || "안내 문구"}\n</Callout>`, cursorOffset: 23 }),
  },
  {
    id: "callout-warn",
    label: "Callout · 주의",
    hint: "주의 환기",
    build: (s) => ({ text: `<Callout type="warn">\n${s || "주의할 점"}\n</Callout>`, cursorOffset: 23 }),
  },
  {
    id: "collapse",
    label: "Collapse",
    hint: "접었다 펴는 영역",
    build: (s) => ({
      text: `<Collapse summary="제목">\n${s || "펼치면 보이는 내용"}\n</Collapse>`,
      cursorOffset: 19,
    }),
  },
];
