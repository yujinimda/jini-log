"use client";

// 선택형 퀴즈 + 시뮬레이터 해금 결합 (FR-012/013, R3).
// 잠금은 퀴즈의 책임 — 제출 전에는 시뮬레이터 대신 플레이스홀더, 제출 후 풀 패널 렌더.
import { useId, useState } from "react";
import { ErrorBox } from "./error-box";
import { EventLoopSimulator } from "./event-loop-simulator";
import { examples, quizzes } from "./examples";
import { CodePane } from "./panes/code-pane";

export function EventLoopQuiz({
  quiz,
}: {
  /** examples.ts의 quizzes 레코드 키 — 미존재 시 에러 박스 */
  quiz: string;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const groupName = useId();

  const data = quizzes[quiz];
  if (!data) {
    return (
      <ErrorBox
        title={`퀴즈 "${quiz}"을(를) 찾을 수 없어요`}
        detail={`components/mdx/event-loop/examples.ts의 quizzes 레코드 키를 확인하세요. 등록된 퀴즈: ${Object.keys(quizzes).join(", ")}`}
      />
    );
  }
  const exampleData = examples[data.example];
  const correct = submitted && selected === data.answerIndex;

  return (
    <div className="my-6 flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
      {/* 제출 전에는 퀴즈가 코드를 직접 보여준다 (시뮬레이터는 잠금 — 출력 패널로 정답 유출 방지) */}
      {!submitted && exampleData && <CodePane code={exampleData.code} line={null} />}
      <fieldset disabled={submitted}>
        <legend className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          {data.question}
        </legend>
        <div className="mt-2 flex flex-col gap-1.5">
          {data.choices.map((choice, i) => {
            const isAnswer = submitted && i === data.answerIndex;
            const isWrongPick = submitted && selected === i && i !== data.answerIndex;
            return (
              <label
                key={choice}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                  isAnswer
                    ? "border-sky-200/70 bg-sky-50/50 text-sky-950/80 dark:border-sky-500/30 dark:bg-sky-950/30 dark:text-sky-200"
                    : isWrongPick
                      ? "border-rose-200/70 bg-rose-50/50 text-rose-950/80 dark:border-rose-500/30 dark:bg-rose-950/30 dark:text-rose-200"
                      : "border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                } ${submitted ? "cursor-default" : ""}`}
              >
                <input
                  type="radio"
                  name={groupName}
                  checked={selected === i}
                  onChange={() => setSelected(i)}
                  className="accent-zinc-700"
                />
                <span className="font-mono text-[13px]">{choice}</span>
                {isAnswer && <span className="ml-auto text-xs font-medium">정답</span>}
                {isWrongPick && <span className="ml-auto text-xs font-medium">내 선택</span>}
              </label>
            );
          })}
        </div>
      </fieldset>
      {!submitted ? (
        <>
          <button
            type="button"
            onClick={() => setSubmitted(true)}
            disabled={selected === null}
            className="self-start rounded border border-zinc-300 px-4 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            예측 제출
          </button>
          <div className="rounded-lg border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500 dark:border-zinc-600 dark:text-zinc-400">
            예측을 제출하면 시뮬레이터가 열려요. 먼저 순서를 골라 보세요.
          </div>
        </>
      ) : (
        <>
          <p
            aria-live="polite"
            className="text-sm font-medium text-zinc-800 dark:text-zinc-100"
          >
            {correct
              ? "맞았어요. 아래 시뮬레이터로 왜 이 순서인지 한 스텝씩 확인해 보세요."
              : `틀렸어요. 정답은 "${data.choices[data.answerIndex]}"예요. 아래 시뮬레이터로 직접 확인해 보세요.`}
          </p>
          {/* 제출 후 결합 예제의 시뮬레이터 해금 — 풀 패널 (FR-013) */}
          <EventLoopSimulator example={data.example} />
        </>
      )}
    </div>
  );
}
