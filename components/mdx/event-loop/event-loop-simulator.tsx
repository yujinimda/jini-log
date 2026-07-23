"use client";

// 스텝 실행 시뮬레이터 (contracts/mdx-components.md — FR-002/003/004/008).
// 상태는 stepIndex 하나 (R1) — 각 스텝이 완전한 스냅샷이라 파생 상태 불필요.
import { useState } from "react";
import { ErrorBox } from "./error-box";
import { examples } from "./examples";
import { CodePane } from "./panes/code-pane";
import { Controls } from "./panes/controls";
import { OutputPane } from "./panes/output-pane";
import { QueuePane } from "./panes/queue-pane";
import { StackPane } from "./panes/stack-pane";

const PANEL_NAMES = ["stack", "webapis", "micro", "task", "output"] as const;
type PanelName = (typeof PANEL_NAMES)[number];

export function EventLoopSimulator({
  example,
  panels,
}: {
  /** examples.ts 레코드 키 — 미존재 시 에러 박스 (조용한 실패 금지) */
  example: string;
  /** 콤마 구분 패널 목록 (생략 = 풀 구성). output·코드·note·컨트롤은 항상 표시 */
  panels?: string;
}) {
  const [stepIndex, setStepIndex] = useState(0);

  const data = examples[example];
  if (!data) {
    return (
      <ErrorBox
        title={`시뮬레이터 예제 "${example}"을(를) 찾을 수 없어요`}
        detail={`components/mdx/event-loop/examples.ts의 등록 키를 확인하세요. 등록된 예제: ${Object.keys(examples).join(", ")}`}
      />
    );
  }

  const requested = panels
    ? panels.split(",").map((name) => name.trim()).filter(Boolean)
    : [...PANEL_NAMES];
  const unknown = requested.filter(
    (name) => !(PANEL_NAMES as readonly string[]).includes(name),
  );
  if (unknown.length > 0) {
    return (
      <ErrorBox
        title={`알 수 없는 패널 이름: ${unknown.join(", ")}`}
        detail={`panels에는 ${PANEL_NAMES.join(", ")}만 쓸 수 있어요. MDX의 panels 속성을 확인하세요.`}
      />
    );
  }
  const show = new Set(requested as PanelName[]);
  show.add("output"); // 출력 없이는 서사가 성립 안 함 (data-model §3)

  const lastIndex = data.steps.length - 1;
  const step = data.steps[stepIndex];
  const prev = () => setStepIndex((i) => Math.max(0, i - 1));
  const next = () => setStepIndex((i) => Math.min(lastIndex, i + 1));
  const reset = () => setStepIndex(0);

  // 포커스 스코프 키보드 조작 (R8) — 전역 keydown은 다중 인스턴스에서 모호해 금지
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      prev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      next();
    }
  }

  return (
    <div
      role="group"
      aria-label={`이벤트 루프 시뮬레이터: ${data.title}`}
      tabIndex={0}
      onKeyDown={onKeyDown}
      className="my-6 flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 focus:outline-2 focus:outline-offset-2 focus:outline-zinc-400 dark:border-zinc-700 dark:bg-zinc-900"
    >
      <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">{data.title}</p>
      <CodePane code={data.code} line={step.line} />
      {/* 모바일(sm 미만)은 세로 스택, 이상은 2열 (FR-008) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {show.has("stack") && <StackPane items={step.callstack} />}
        {show.has("webapis") && (
          <QueuePane label="Web APIs" items={step.webApis} ordered={false} />
        )}
        {show.has("micro") && <QueuePane label="마이크로태스크 큐" items={step.micro} />}
        {show.has("task") && <QueuePane label="태스크 큐" items={step.task} />}
        <OutputPane items={step.output} />
      </div>
      <p
        aria-live="polite"
        className="rounded-lg bg-zinc-100 px-3 py-2 text-sm leading-6 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
      >
        {step.note}
      </p>
      <Controls
        stepIndex={stepIndex}
        stepCount={data.steps.length}
        onPrev={prev}
        onNext={next}
        onReset={reset}
      />
    </div>
  );
}
