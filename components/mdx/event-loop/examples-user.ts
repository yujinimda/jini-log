// 핵심 예제 2개 (tasks.md T019 — 당초 사용자 직접 작성 예정이었으나 전체 위임으로 변경, 소유: 레인 C)
// 채점: pnpm test — FR-009(실제 실행 출력 = 마지막 스텝 output) + FR-010(불변식 I1~I5) + FR-014(await 표현)
import type { SimExample } from "./types";

export const userExamples: Record<string, SimExample> = {
  // 마이크로태스크 새치기 — then 체인이 태스크 큐를 계속 밀어내는 순간 (패널: 풀 구성)
  // 핵심: 큐를 비우는 도중 새로 들어온 마이크로태스크도 같은 차례에 처리된다 (drain 의미론)
  "microtask-priority": {
    id: "microtask-priority",
    title: "마이크로태스크는 다 비울 때까지 우선",
    code: [
      "setTimeout(() => {",           // 1
      '  console.log("태스크");',     // 2
      "}, 0);",                       // 3
      "",                             // 4
      "Promise.resolve()",            // 5
      "  .then(() => {",              // 6
      '    console.log("마이크로 1");', // 7
      "  })",                         // 8
      "  .then(() => {",              // 9
      '    console.log("마이크로 2");', // 10
      "  });",                        // 11
      "",                             // 12
      'console.log("동기");',         // 13
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
        webApis: ["타이머 (0ms)"],
        micro: [],
        task: [],
        output: [],
        note: "setTimeout이 콜백을 타이머에 맡겨요.",
      },
      {
        line: 6, // 콜백을 큐에 넣는 주체는 5줄의 resolve가 아니라 6줄의 .then 호출 (codex-review)
        callstack: ["Promise.then"],
        webApis: ["타이머 (0ms)"],
        micro: ["then 콜백 1"],
        task: [],
        output: [],
        note: "이미 이행된 프로미스라 첫 then 콜백은 바로 마이크로태스크 큐로. 두 번째 then은 앞 콜백이 끝나야 해서 예약만 돼요.",
      },
      {
        line: 13,
        callstack: ["console.log"],
        webApis: ["타이머 (0ms)"],
        micro: ["then 콜백 1"],
        task: [],
        output: ["동기"],
        note: "동기 코드가 먼저예요.",
      },
      {
        line: null,
        callstack: [],
        webApis: [],
        micro: ["then 콜백 1"],
        task: ["setTimeout 콜백"],
        output: ["동기"],
        note: "동기 코드 끝. 타이머 콜백은 태스크 큐에 줄을 섰어요. 두 큐에 하나씩 — 이벤트 루프는 어느 쪽부터 볼까요?",
      },
      {
        line: 7,
        callstack: ["then 콜백 1"],
        webApis: [],
        micro: [],
        task: ["setTimeout 콜백"],
        output: ["동기", "마이크로 1"],
        note: "마이크로태스크가 먼저예요. 첫 then 콜백이 새치기했어요.",
      },
      {
        line: 9,
        callstack: [],
        webApis: [],
        micro: ["then 콜백 2"],
        task: ["setTimeout 콜백"],
        output: ["동기", "마이크로 1"],
        note: "첫 콜백이 끝나자 두 번째 then 콜백이 마이크로태스크 큐에 들어와요. 비우는 도중에 들어와도 지금 차례에 같이 처리돼요.",
      },
      {
        line: 10,
        callstack: ["then 콜백 2"],
        webApis: [],
        micro: [],
        task: ["setTimeout 콜백"],
        output: ["동기", "마이크로 1", "마이크로 2"],
        note: "새치기가 이어져요. 마이크로태스크 큐가 빌 때까지 태스크는 계속 대기예요.",
      },
      {
        line: null,
        callstack: [],
        webApis: [],
        micro: [],
        task: ["setTimeout 콜백"],
        output: ["동기", "마이크로 1", "마이크로 2"],
        note: "이제야 마이크로태스크 큐가 비었어요.",
      },
      {
        line: 2,
        callstack: ["setTimeout 콜백"],
        webApis: [],
        micro: [],
        task: [],
        output: ["동기", "마이크로 1", "마이크로 2", "태스크"],
        note: "드디어 태스크 차례. 0ms짜리 타이머가 제일 늦게 실행됐어요.",
      },
      {
        line: null,
        callstack: [],
        webApis: [],
        micro: [],
        task: [],
        output: ["동기", "마이크로 1", "마이크로 2", "태스크"],
        note: "끝. 마이크로태스크 큐는 \"다 비울 때까지\" 우선이에요.",
      },
    ],
  },

  // async/await 분리 — await가 함수를 반으로 가르는 순간 (패널: 풀 구성, FR-014)
  "async-await-split": {
    id: "async-await-split",
    title: "await는 함수를 반으로 갈라요",
    code: [
      "async function order() {",     // 1
      '  console.log("주문 접수");',  // 2
      "  await Promise.resolve();",   // 3
      '  console.log("주문 처리");',  // 4
      "}",                            // 5
      "",                             // 6
      "order();",                     // 7
      'console.log("다음 손님");',    // 8
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
        callstack: ["order"],
        webApis: [],
        micro: [],
        task: [],
        output: [],
        note: "order()를 호출해요. async 함수라고 특별할 것 없이 일단 보통 함수처럼 실행돼요.",
      },
      {
        line: 2,
        callstack: ["order"],
        webApis: [],
        micro: [],
        task: [],
        output: ["주문 접수"],
        note: "await 전까지는 전부 동기예요.",
      },
      {
        // FR-014: await 도달 = 프레임 pop, 재개분은 micro에 "함수명 이어서"로
        line: 3,
        callstack: [],
        webApis: [],
        micro: ["order 이어서"],
        task: [],
        output: ["주문 접수"],
        note: "await에서 order가 반으로 잘려요. 앞부분은 여기서 끝 — 나머지는 \"이어서 할 일\"이 되어 마이크로태스크 큐로 가고, order는 스택에서 내려가요.",
      },
      {
        line: 8,
        callstack: ["console.log"],
        webApis: [],
        micro: ["order 이어서"],
        task: [],
        output: ["주문 접수", "다음 손님"],
        note: "order를 기다리지 않고 다음 코드가 실행돼요. 스레드는 하나인데 멈추지 않는 이유예요.",
      },
      {
        line: null,
        callstack: [],
        webApis: [],
        micro: ["order 이어서"],
        task: [],
        output: ["주문 접수", "다음 손님"],
        note: "동기 코드 끝. 마이크로태스크 큐에 order의 나머지 반쪽이 기다리고 있어요.",
      },
      {
        line: 3,
        callstack: ["order"],
        webApis: [],
        micro: [],
        task: [],
        output: ["주문 접수", "다음 손님"],
        note: "이벤트 루프가 order를 await 지점부터 다시 스택에 올려요.",
      },
      {
        line: 4,
        callstack: ["order"],
        webApis: [],
        micro: [],
        task: [],
        output: ["주문 접수", "다음 손님", "주문 처리"],
        note: "나머지 반이 이어서 실행돼요.",
      },
      {
        line: null,
        callstack: [],
        webApis: [],
        micro: [],
        task: [],
        output: ["주문 접수", "다음 손님", "주문 처리"],
        note: "끝. await는 함수를 반으로 갈라 뒷부분을 마이크로태스크로 보내는 문법 설탕이에요.",
      },
    ],
  },
};
