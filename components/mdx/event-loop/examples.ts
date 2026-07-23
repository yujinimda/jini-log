// 위임 예제 5개 + 퀴즈 레코드 (data-model.md §2·§4, FR-005). 소유: 레인 A
// 규칙: code는 실제 실행 가능한 JS(I8 화이트리스트: console.log·setTimeout 지연 0·Promise·async/await·queueMicrotask),
// 각 스텝은 완전한 스냅샷(I1~I5), 마지막 스텝 output = 실제 실행 출력(FR-009, 테스트가 대조).
// 사용자 직접 예제 2개(microtask-priority·async-await-split)는 examples-user.ts에서 병합 (T019).
import type { SimExample, SimQuiz } from "./types";
import { userExamples } from "./examples-user";

const delegatedExamples: Record<string, SimExample> = {
  // ── 형식 시범 예제 (T019에서 이 형식을 그대로 따라 하면 돼요) ─────────────────
  // 동기 함수 2단 호출 — 콜스택이 쌓였다 풀리는 것만 보여준다 (패널: stack).
  "callstack-only": {
    id: "callstack-only",
    title: "동기 함수 호출과 콜스택",
    // code: 1-base 줄 배열. steps의 line은 이 배열 범위 안이어야 한다 (I1).
    code: [
      "function greet(name) {",       // 1
      '  return "안녕, " + name;',    // 2
      "}",                            // 3
      "",                             // 4
      "function main() {",            // 5
      '  const message = greet("지니");', // 6
      "  console.log(message);",      // 7
      "}",                            // 8
      "",                             // 9
      "main();",                      // 10
      'console.log("끝");',           // 11
    ],
    steps: [
      // 첫 스텝: 실행 전 — callstack·micro·task는 빈 배열이어야 한다 (I4)
      {
        line: null,
        callstack: [],
        webApis: [],
        micro: [],
        task: [],
        output: [],
        note: "아직 아무것도 실행하기 전이에요. 콜스택이 비어 있어요.",
      },
      // 함수 선언(1~8줄)은 실행이 아니라서 건너뛰고, 첫 실행문인 10줄부터 시작해요.
      {
        line: 10,
        callstack: ["main"], // 배열 끝이 스택 최상단
        webApis: [],
        micro: [],
        task: [],
        output: [],
        note: "main()을 호출했어요. 콜스택에 main 프레임이 쌓여요.",
      },
      {
        line: 6,
        callstack: ["main", "greet"], // push는 끝에 — I3 (공통 접두사 + pop들 + push들)
        webApis: [],
        micro: [],
        task: [],
        output: [],
        note: "main 안에서 greet(\"지니\")를 호출해요. greet가 main 위에 쌓여요.",
      },
      {
        line: 2,
        callstack: ["main", "greet"],
        webApis: [],
        micro: [],
        task: [],
        output: [],
        note: "greet가 문자열을 만들어서 반환해요.",
      },
      {
        line: 6,
        callstack: ["main"], // 반환 = 끝에서 pop
        webApis: [],
        micro: [],
        task: [],
        output: [],
        note: "반환을 마친 greet는 스택에서 빠지고, 반환값이 message에 담겨요.",
      },
      {
        line: 7,
        callstack: ["main", "console.log"],
        webApis: [],
        micro: [],
        task: [],
        // output은 누적(append-only, I2) — 이전 스텝의 output 뒤에 덧붙이기만
        output: ["안녕, 지니"],
        note: "console.log도 함수라서 스택에 올라갔다가 출력을 남겨요.",
      },
      {
        line: 7,
        callstack: ["main"],
        webApis: [],
        micro: [],
        task: [],
        output: ["안녕, 지니"],
        note: "출력을 마친 console.log가 스택에서 빠져요.",
      },
      {
        line: 10,
        callstack: [],
        webApis: [],
        micro: [],
        task: [],
        output: ["안녕, 지니"],
        note: "main도 할 일이 끝나서 스택에서 빠졌어요.",
      },
      {
        line: 11,
        callstack: ["console.log"],
        webApis: [],
        micro: [],
        task: [],
        output: ["안녕, 지니", "끝"],
        note: "마지막 줄이 실행돼요. 위에서 아래로, 한 번에 하나씩이에요.",
      },
      // 마지막 스텝: callstack·micro·task에 webApis까지 전부 빈 배열 (I4)
      {
        line: null,
        callstack: [],
        webApis: [],
        micro: [],
        task: [],
        output: ["안녕, 지니", "끝"],
        note: "프로그램 끝. 콜스택이 다시 비었어요.",
      },
    ],
  },

  // setTimeout 1개 — 기다리는 동안 Web API(타이머)가 대신 일한다 (패널: stack, webapis)
  "settimeout-webapi": {
    id: "settimeout-webapi",
    title: "setTimeout과 Web API",
    code: [
      'console.log("첫 번째");', // 1
      "",                        // 2
      "setTimeout(() => {",      // 3
      '  console.log("타이머 콜백");', // 4
      "}, 0);",                  // 5
      "",                        // 6
      'console.log("두 번째");', // 7
    ],
    steps: [
      {
        line: null,
        callstack: [],
        webApis: [],
        micro: [],
        task: [],
        output: [],
        note: "실행 전이에요.",
      },
      {
        line: 1,
        callstack: ["console.log"],
        webApis: [],
        micro: [],
        task: [],
        output: ["첫 번째"],
        note: "첫 줄은 그냥 동기 코드라 바로 실행돼요.",
      },
      {
        line: 3,
        callstack: ["setTimeout"],
        webApis: ["타이머 (0ms)"],
        micro: [],
        task: [],
        output: ["첫 번째"],
        note: "setTimeout은 콜백을 타이머에 맡기고 바로 반환해요. 스택은 기다리지 않아요.",
      },
      {
        line: 7,
        callstack: ["console.log"],
        webApis: ["타이머 (0ms)"],
        micro: [],
        task: [],
        output: ["첫 번째", "두 번째"],
        note: "타이머가 도는 동안에도 코드는 멈추지 않고 다음 줄을 실행해요.",
      },
      {
        line: null,
        callstack: [],
        webApis: [],
        micro: [],
        task: ["setTimeout 콜백"],
        output: ["첫 번째", "두 번째"],
        note: "0ms가 지나 타이머가 끝났어요. 콜백은 스택으로 바로 못 가고 태스크 큐에 줄을 서요.",
      },
      {
        line: 3,
        callstack: ["setTimeout 콜백"],
        webApis: [],
        micro: [],
        task: [],
        output: ["첫 번째", "두 번째"],
        note: "콜스택이 비어 있으니 이벤트 루프가 콜백을 스택으로 올려요.",
      },
      {
        line: 4,
        callstack: ["setTimeout 콜백"],
        webApis: [],
        micro: [],
        task: [],
        output: ["첫 번째", "두 번째", "타이머 콜백"],
        note: "콜백 안의 console.log가 실행돼요. 0ms인데도 순서는 맨 마지막이죠.",
      },
      {
        line: null,
        callstack: [],
        webApis: [],
        micro: [],
        task: [],
        output: ["첫 번째", "두 번째", "타이머 콜백"],
        note: "콜백까지 끝났어요. 이제 정말 할 일이 없어요.",
      },
    ],
  },

  // setTimeout 2개 — 태스크 큐 FIFO + 이벤트 루프 틱 (패널: stack, webapis, task)
  "task-queue-loop": {
    id: "task-queue-loop",
    title: "태스크 큐와 이벤트 루프",
    code: [
      "setTimeout(() => {",      // 1
      '  console.log("콜백 A");', // 2
      "}, 0);",                  // 3
      "",                        // 4
      "setTimeout(() => {",      // 5
      '  console.log("콜백 B");', // 6
      "}, 0);",                  // 7
      "",                        // 8
      'console.log("동기 코드 끝");', // 9
    ],
    steps: [
      {
        line: null,
        callstack: [],
        webApis: [],
        micro: [],
        task: [],
        output: [],
        note: "실행 전이에요.",
      },
      {
        line: 1,
        callstack: ["setTimeout"],
        webApis: ["타이머 A (0ms)"],
        micro: [],
        task: [],
        output: [],
        note: "첫 번째 setTimeout이 콜백 A를 타이머에 맡겨요.",
      },
      {
        line: 5,
        callstack: ["setTimeout"],
        webApis: ["타이머 A (0ms)", "타이머 B (0ms)"],
        micro: [],
        task: [],
        output: [],
        note: "두 번째 setTimeout도 콜백 B를 맡겨요. 타이머 두 개가 같이 돌아요.",
      },
      {
        line: 9,
        callstack: ["console.log"],
        webApis: ["타이머 A (0ms)", "타이머 B (0ms)"],
        micro: [],
        task: [],
        output: ["동기 코드 끝"],
        note: "동기 코드가 먼저 다 실행돼요.",
      },
      {
        line: null,
        callstack: [],
        webApis: ["타이머 B (0ms)"],
        micro: [],
        task: ["콜백 A"],
        output: ["동기 코드 끝"],
        note: "타이머 A가 끝났어요. 콜백 A가 태스크 큐에 줄을 서요.",
      },
      {
        line: null,
        callstack: [],
        webApis: [],
        micro: [],
        task: ["콜백 A", "콜백 B"],
        output: ["동기 코드 끝"],
        note: "타이머 B도 끝났어요. 콜백 B는 A 뒤에 서요. 큐는 선착순이에요.",
      },
      {
        line: 1,
        callstack: ["콜백 A"],
        webApis: [],
        micro: [],
        task: ["콜백 B"],
        output: ["동기 코드 끝"],
        note: "이벤트 루프 틱: 스택이 비었으니 큐 맨 앞의 콜백 A를 스택으로 올려요.",
      },
      {
        line: 2,
        callstack: ["콜백 A"],
        webApis: [],
        micro: [],
        task: ["콜백 B"],
        output: ["동기 코드 끝", "콜백 A"],
        note: "콜백 A가 실행돼요.",
      },
      {
        line: null,
        callstack: [],
        webApis: [],
        micro: [],
        task: ["콜백 B"],
        output: ["동기 코드 끝", "콜백 A"],
        note: "콜백 A가 끝났어요. 큐에는 아직 B가 남아 있어요.",
      },
      {
        line: 5,
        callstack: ["콜백 B"],
        webApis: [],
        micro: [],
        task: [],
        output: ["동기 코드 끝", "콜백 A"],
        note: "다음 틱: 이벤트 루프가 콜백 B를 올려요. 한 번에 하나씩이에요.",
      },
      {
        line: 6,
        callstack: ["콜백 B"],
        webApis: [],
        micro: [],
        task: [],
        output: ["동기 코드 끝", "콜백 A", "콜백 B"],
        note: "콜백 B가 실행돼요.",
      },
      {
        line: null,
        callstack: [],
        webApis: [],
        micro: [],
        task: [],
        output: ["동기 코드 끝", "콜백 A", "콜백 B"],
        note: "큐도 스택도 비었어요. 끝이에요.",
      },
    ],
  },

  // 도입 퀴즈 예제 — setTimeout vs Promise.then 고전 (퀴즈 + 6번 섹션에서 재등장, SC-003)
  "intro-quiz": {
    id: "intro-quiz",
    title: "출력 순서 맞히기",
    code: [
      'console.log("A");',       // 1
      "",                        // 2
      "setTimeout(() => {",      // 3
      '  console.log("B");',     // 4
      "}, 0);",                  // 5
      "",                        // 6
      "Promise.resolve().then(() => {", // 7
      '  console.log("C");',     // 8
      "});",                     // 9
      "",                        // 10
      'console.log("D");',       // 11
    ],
    steps: [
      {
        line: null,
        callstack: [],
        webApis: [],
        micro: [],
        task: [],
        output: [],
        note: "실행 전이에요.",
      },
      {
        line: 1,
        callstack: ["console.log"],
        webApis: [],
        micro: [],
        task: [],
        output: ["A"],
        note: "동기 코드는 바로 실행. \"A\"가 먼저예요.",
      },
      {
        line: 3,
        callstack: ["setTimeout"],
        webApis: ["타이머 (0ms)"],
        micro: [],
        task: [],
        output: ["A"],
        note: "setTimeout이 \"B\" 콜백을 타이머에 맡겨요.",
      },
      {
        line: 7,
        callstack: ["Promise.then"],
        webApis: ["타이머 (0ms)"],
        micro: ["then 콜백"],
        task: [],
        output: ["A"],
        note: "이미 이행된 프로미스라 then 콜백이 곧장 마이크로태스크 큐에 들어가요.",
      },
      {
        line: 11,
        callstack: ["console.log"],
        webApis: ["타이머 (0ms)"],
        micro: ["then 콜백"],
        task: [],
        output: ["A", "D"],
        note: "마지막 동기 코드. \"D\"가 \"B\", \"C\"보다 먼저 나왔어요.",
      },
      {
        line: null,
        callstack: [],
        webApis: [],
        micro: ["then 콜백"],
        task: ["setTimeout 콜백"],
        output: ["A", "D"],
        note: "동기 코드 끝. 타이머 콜백은 태스크 큐로 갔고, 두 큐에 하나씩 대기 중이에요.",
      },
      {
        line: 7,
        callstack: ["then 콜백"],
        webApis: [],
        micro: [],
        task: ["setTimeout 콜백"],
        output: ["A", "D"],
        note: "이벤트 루프는 태스크보다 마이크로태스크를 먼저 비워요. then 콜백이 올라가요.",
      },
      {
        line: 8,
        callstack: ["then 콜백"],
        webApis: [],
        micro: [],
        task: ["setTimeout 콜백"],
        output: ["A", "D", "C"],
        note: "\"C\" 출력. 프로미스가 setTimeout을 새치기했어요.",
      },
      {
        line: null,
        callstack: [],
        webApis: [],
        micro: [],
        task: ["setTimeout 콜백"],
        output: ["A", "D", "C"],
        note: "마이크로태스크 큐가 비었어요. 이제서야 태스크 큐 차례예요.",
      },
      {
        line: 3,
        callstack: ["setTimeout 콜백"],
        webApis: [],
        micro: [],
        task: [],
        output: ["A", "D", "C"],
        note: "이벤트 루프가 setTimeout 콜백을 스택에 올려요.",
      },
      {
        line: 4,
        callstack: ["setTimeout 콜백"],
        webApis: [],
        micro: [],
        task: [],
        output: ["A", "D", "C", "B"],
        note: "\"B\"가 마지막이에요.",
      },
      {
        line: null,
        callstack: [],
        webApis: [],
        micro: [],
        task: [],
        output: ["A", "D", "C", "B"],
        note: "끝. 출력 순서는 A → D → C → B였어요.",
      },
    ],
  },

  // 마무리 퀴즈 예제 — async/await + setTimeout + then 종합 (FR-014 await 표현)
  "final-quiz": {
    id: "final-quiz",
    title: "종합: async/await까지 섞으면",
    code: [
      "async function run() {",  // 1
      '  console.log("A");',     // 2
      "  await Promise.resolve();", // 3
      '  console.log("B");',     // 4
      "}",                       // 5
      "",                        // 6
      "setTimeout(() => {",      // 7
      '  console.log("C");',     // 8
      "}, 0);",                  // 9
      "",                        // 10
      "run().then(() => {",      // 11
      '  console.log("D");',     // 12
      "});",                     // 13
      "",                        // 14
      'console.log("E");',       // 15
    ],
    steps: [
      {
        line: null,
        callstack: [],
        webApis: [],
        micro: [],
        task: [],
        output: [],
        note: "실행 전이에요. 함수 선언은 실행이 아니라 7줄부터 시작해요.",
      },
      {
        line: 7,
        callstack: ["setTimeout"],
        webApis: ["타이머 (0ms)"],
        micro: [],
        task: [],
        output: [],
        note: "setTimeout이 \"C\" 콜백을 타이머에 맡겨요.",
      },
      {
        line: 11,
        callstack: ["run"],
        webApis: ["타이머 (0ms)"],
        micro: [],
        task: [],
        output: [],
        note: "run()을 호출해요. async 함수도 호출되면 일단 보통 함수처럼 실행돼요.",
      },
      {
        line: 2,
        callstack: ["run"],
        webApis: ["타이머 (0ms)"],
        micro: [],
        task: [],
        output: ["A"],
        note: "await 전까지는 전부 동기예요. \"A\" 출력.",
      },
      {
        line: 3,
        callstack: [],
        webApis: ["타이머 (0ms)"],
        micro: ["run 이어서"],
        task: [],
        output: ["A"],
        note: "await를 만나면 run은 스택에서 내려가요. 이미 이행된 프로미스라 \"이어서 할 일\"이 바로 마이크로태스크 큐에 들어가요.",
      },
      {
        line: 11,
        callstack: ["Promise.then"],
        webApis: ["타이머 (0ms)"],
        micro: ["run 이어서"],
        task: [],
        output: ["A"],
        note: "run이 반환한 프로미스에 then으로 \"D\" 콜백을 예약해요. 프로미스가 아직 대기 중이라 예약만 해둬요.",
      },
      {
        line: 15,
        callstack: ["console.log"],
        webApis: ["타이머 (0ms)"],
        micro: ["run 이어서"],
        task: [],
        output: ["A", "E"],
        note: "마지막 동기 코드. \"E\" 출력.",
      },
      {
        line: null,
        callstack: [],
        webApis: [],
        micro: ["run 이어서"],
        task: ["setTimeout 콜백"],
        output: ["A", "E"],
        note: "동기 코드 끝. 타이머 콜백은 태스크 큐에서, run 재개는 마이크로태스크 큐에서 기다려요.",
      },
      {
        line: 3,
        callstack: ["run"],
        webApis: [],
        micro: [],
        task: ["setTimeout 콜백"],
        output: ["A", "E"],
        note: "마이크로태스크가 태스크보다 먼저예요. run이 await 지점부터 스택으로 복귀해요.",
      },
      {
        line: 4,
        callstack: ["run"],
        webApis: [],
        micro: [],
        task: ["setTimeout 콜백"],
        output: ["A", "E", "B"],
        note: "await 다음 줄이 이어져요. \"B\" 출력.",
      },
      {
        line: 5,
        callstack: [],
        webApis: [],
        micro: ["then 콜백"],
        task: ["setTimeout 콜백"],
        output: ["A", "E", "B"],
        note: "run이 끝나면서 반환했던 프로미스가 이행돼요. 예약해 둔 then 콜백이 마이크로태스크 큐에 들어가요.",
      },
      {
        line: 12,
        callstack: ["then 콜백"],
        webApis: [],
        micro: [],
        task: ["setTimeout 콜백"],
        output: ["A", "E", "B", "D"],
        note: "\"D\" 출력. 마이크로태스크 큐를 다 비울 때까지 태스크는 못 끼어들어요.",
      },
      {
        line: null,
        callstack: [],
        webApis: [],
        micro: [],
        task: ["setTimeout 콜백"],
        output: ["A", "E", "B", "D"],
        note: "마이크로태스크 큐가 비었어요. 드디어 태스크 큐 차례예요.",
      },
      {
        line: 7,
        callstack: ["setTimeout 콜백"],
        webApis: [],
        micro: [],
        task: [],
        output: ["A", "E", "B", "D"],
        note: "이벤트 루프가 setTimeout 콜백을 스택에 올려요.",
      },
      {
        line: 8,
        callstack: ["setTimeout 콜백"],
        webApis: [],
        micro: [],
        task: [],
        output: ["A", "E", "B", "D", "C"],
        note: "\"C\"가 마지막이에요.",
      },
      {
        line: null,
        callstack: [],
        webApis: [],
        micro: [],
        task: [],
        output: ["A", "E", "B", "D", "C"],
        note: "끝. 출력 순서는 A → E → B → D → C였어요.",
      },
    ],
  },
};

/** 위임 예제 + 사용자 직접 예제 병합 — 키 충돌 없음 (id 집합이 분리, data-model.md §2 표) */
export const examples: Record<string, SimExample> = {
  ...delegatedExamples,
  ...userExamples,
};

/** 퀴즈 레코드 — 정답 보기를 " → "로 분해하면 예제 마지막 스텝 output과 일치해야 한다 (I10) */
export const quizzes: Record<string, SimQuiz> = {
  intro: {
    id: "intro",
    example: "intro-quiz",
    question: "이 코드를 실행하면 어떤 순서로 출력될까요?",
    choices: [
      "A → B → C → D",
      "A → D → B → C",
      "A → D → C → B",
      "A → C → D → B",
    ],
    answerIndex: 2,
  },
  final: {
    id: "final",
    example: "final-quiz",
    question: "이번엔 async/await까지 섞였어요. 출력 순서는?",
    choices: [
      "A → B → E → D → C",
      "A → E → B → D → C",
      "A → E → D → B → C",
      "A → E → C → B → D",
    ],
    answerIndex: 1,
  },
};
