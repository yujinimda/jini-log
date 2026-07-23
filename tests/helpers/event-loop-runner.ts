// quiescence 러너 (research R4, data-model I8) — 소유: 레인 B
// "몇 틱 기다리기" 추정 없이 종료를 판정한다: 비동기 진입점(setTimeout·queueMicrotask)을
// 전부 계측 버전으로 주입해 대기 카운터를 세고, 매크로태스크 턴마다 0인지 확인한다.
// 확인 자체가 매크로태스크라서, 마지막 콜백이 유발한 마이크로태스크 체인은 판정 전에 반드시 소진된다.

const MAX_TURNS = 1000; // 무한 스케줄 방어 (research R4)

export async function runExample(id: string, code: string[]): Promise<string[]> {
  const output: string[] = [];
  let pending = 0;

  const fakeConsole = {
    log: (...args: unknown[]) => {
      output.push(args.map(String).join(" "));
    },
  };

  const fakeSetTimeout = (fn: () => void, delay?: number) => {
    if (delay !== undefined && delay !== 0) {
      throw new Error(`[${id}] setTimeout 지연은 0만 허용돼요 (I8): ${delay}`);
    }
    pending += 1;
    setTimeout(() => {
      try {
        fn();
      } finally {
        pending -= 1;
      }
    }, 0);
  };

  const fakeQueueMicrotask = (fn: () => void) => {
    pending += 1;
    queueMicrotask(() => {
      try {
        fn();
      } finally {
        pending -= 1;
      }
    });
  };

  // 비화이트리스트 글로벌은 undefined로 shadowing — Node 전역(fetch 등)이 카운터 밖에서 도는 경로 차단 (I8)
  const run = new Function(
    "console",
    "setTimeout",
    "queueMicrotask",
    "setInterval",
    "fetch",
    "setImmediate",
    code.join("\n"),
  );
  run(fakeConsole, fakeSetTimeout, fakeQueueMicrotask, undefined, undefined, undefined);

  // 매크로태스크 턴마다 카운터 확인 — 0이 되는 순간이 정확한 완료 시점
  for (let turn = 0; turn < MAX_TURNS; turn++) {
    if (pending === 0) return output;
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  throw new Error(`[${id}] ${MAX_TURNS}턴이 지나도 대기 작업이 남아 있어요 — 무한 스케줄 의심`);
}
