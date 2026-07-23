// quiescence 러너 (research R4, data-model I8) — 소유: 레인 B
// "몇 틱 기다리기" 추정 없이 종료를 판정한다: 비동기 진입점(setTimeout·queueMicrotask)을
// 전부 계측 버전으로 주입해 대기 카운터를 세고, 매크로태스크 턴마다 0인지 확인한다.
// 판정 전 반드시 매크로태스크 경계를 한 번 넘는다 — 프로미스만 쓰는 예제(await 체인 등)는
// 동기 실행 직후 pending이 0이지만 마이크로태스크가 남아 있을 수 있어서, 경계를 넘어야
// 체인이 전부 소진된 상태에서 판정할 수 있다 (codex-review P1 반영).

const MAX_TURNS = 1000; // 무한 setTimeout 스케줄 방어 (research R4)
const MAX_MICROTASKS = 10_000; // queueMicrotask 자기 재등록(기아) 방어 — 이벤트 루프가 굶으면 턴 상한이 영영 안 오므로 스케줄 시점에 끊는다

export async function runExample(id: string, code: string[]): Promise<string[]> {
  const output: string[] = [];
  let pending = 0;
  let microtaskCount = 0;

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
    microtaskCount += 1;
    if (microtaskCount > MAX_MICROTASKS) {
      throw new Error(`[${id}] queueMicrotask ${MAX_MICROTASKS}회 초과 — 자기 재등록(기아) 의심`);
    }
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
  // 잔여 리스크: Promise.then만으로 자기 재등록하는 코드는 계측 밖이라 여기서 못 끊는다(리뷰 책임).
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

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    // 판정보다 경계 넘기가 먼저 — 이 await가 돌아온 시점엔 그전에 쌓인 마이크로태스크가 전부 소진돼 있다
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    if (pending === 0) return output;
  }
  throw new Error(`[${id}] ${MAX_TURNS}턴이 지나도 대기 작업이 남아 있어요 — 무한 스케줄 의심`);
}
