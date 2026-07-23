// 사용자 직접 작성 파트 (tasks.md T019, 소유권: A가 스텁 생성 후 레인 C/사용자로 이관)
// 채점: pnpm test — FR-009(실제 실행 출력 = 마지막 스텝 output) + FR-010(불변식 I1~I5) + FR-014(await 표현)
import type { SimExample } from "./types";

// 작성 형식 안내 — examples.ts의 callstack-only가 형식 시범 예제예요. 그대로 따라 하면 됩니다:
//   1. code: 실행 가능한 JS를 줄 단위 배열로. 허용 API는 console.log / setTimeout(지연 0만) /
//      Promise.resolve/then/catch / async·await / queueMicrotask 뿐 (I8).
//   2. steps: 각 스텝은 그 순간의 "완전한 스냅샷" — line(1-base, 틱 같은 순간은 null),
//      callstack(끝=최상단), webApis, micro(앞=다음 실행), task(앞=다음 실행),
//      output(누적, 이전 스텝의 output에 덧붙이기만), note(그 스텝에서 일어난 일 한 줄).
//   3. 첫/마지막 스텝은 callstack·micro·task 빈 배열 (마지막은 webApis도 빈 배열) — I4.
//   4. await 표현(FR-014): await에 도달하면 함수 프레임을 콜스택에서 내리고,
//      재개는 micro에 "함수명 이어서" 항목으로 넣었다가 콜스택으로 복귀시켜요.
//      프레임을 "일시정지"로 스택에 남겨두는 단순화는 금지.
//   5. 레코드 키와 id는 같아야 해요 (I6).

export const userExamples: Record<string, SimExample> = {
  // TODO(human): "microtask-priority" — 마이크로태스크 새치기 예제
  //   setTimeout과 queueMicrotask(또는 Promise.then)가 섞였을 때 마이크로태스크 큐가
  //   태스크 큐보다 먼저 비워지는 순간을 스텝으로 보여주세요. 패널은 풀 구성으로 쓰여요.
  //
  // TODO(human): "async-await-split" — async/await 분리 예제
  //   async 함수가 await에서 끊겼다가 마이크로태스크 큐를 거쳐 재개되는 과정을
  //   FR-014 규칙대로 표현해 주세요. 패널은 풀 구성으로 쓰여요.
};
