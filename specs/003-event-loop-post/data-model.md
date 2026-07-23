# Data Model: 003 이벤트 루프 인터랙티브 글

모든 타입은 `components/mdx/event-loop/types.ts`에 정의한다. 저장소는 없고, 예제 데이터는 `examples.ts`의 정적 객체다.

## 1. SimStep — 한 순간의 완전한 스냅샷

```ts
interface SimStep {
  /** 하이라이트할 코드 줄 (1-base). null = 특정 줄이 아닌 순간(이벤트 루프 틱 등) */
  line: number | null;
  /** 콜스택 — 배열 끝이 스택 최상단 */
  callstack: string[];
  /** 런타임이 대신 처리 중인 작업 (대기 중 타이머 등) */
  webApis: string[];
  /** 마이크로태스크 큐 — 배열 앞이 다음 실행 */
  micro: string[];
  /** 태스크(매크로태스크) 큐 — 배열 앞이 다음 실행 */
  task: string[];
  /** 누적 콘솔 출력 (append-only) */
  output: string[];
  /** 이 스텝에서 일어난 일 한 줄 설명 */
  note: string;
}
```

**불변식 (FR-010 — `tests/unit/event-loop-examples.test.ts`에서 기계 검증)**:

- I1. `line`은 null이거나 `1 <= line <= code.length`
- I2. `output`은 append-only: `steps[i].output`은 `steps[i+1].output`의 접두사(prefix)
- I3. 콜스택 정합: 스텝 0의 callstack부터 시작해 인접 스텝 간 변화가 "끝에서의 push/pop 조합"으로 설명 가능해야 한다. 혼합 굵기(grilling Q4)이므로 한 스텝에서 여러 push/pop 허용 — 검증은 LCS가 아니라 "공통 접두사 이후 pop들 + push들" 형태인지 확인
- I4. 첫 스텝과 마지막 스텝의 callstack·micro·task는 비어 있어야 한다 (프로그램 시작 전/종료 후 — webApis도 마지막엔 빈 배열)
- I5. 항목 문자열은 비어 있지 않다

## 2. SimExample — 재생 가능한 예제 하나

```ts
interface SimExample {
  /** MDX에서 참조하는 식별자 (kebab-case) */
  id: string;
  title: string;
  /** 표시용이자 실행용 코드 — 반드시 실행 가능한 JS (FR-009 전제) */
  code: string[];
  steps: SimStep[];  // 최소 1개
}
```

**불변식**:

- I6. `id`는 `examples.ts` 레코드의 키와 일치
- I7. `steps.at(-1).output` === 코드 실제 실행 시 콘솔 출력 (FR-009 — 테스트가 실제 실행해 비교)
- I8. 코드는 화이트리스트 API만 사용: `console.log`, `setTimeout`, `Promise.resolve/then/catch`, `async/await`, `queueMicrotask` (grilling Q3). 화이트리스트 검사는 리뷰 책임(기계 검증은 실행 대조로 충분)

**예제 목록 (FR-005, 서사 순서)**:

| id | 등장 섹션 | 패널 구성 | 작성자 |
| --- | --- | --- | --- |
| `intro-quiz` | 도입 퀴즈 | 풀 구성 | 위임 |
| `callstack-only` | 싱글스레드와 콜스택 | stack | 위임 (형식 시범 예제) |
| `settimeout-webapi` | 기다리는 동안 누가 일하나 | stack, webapis | 위임 |
| `task-queue-loop` | 태스크 큐와 이벤트 루프 | stack, webapis, task | 위임 |
| `microtask-priority` | 마이크로태스크 큐 | 풀 구성 | **사용자 직접** |
| `async-await-split` | 프로미스로 합치기 | 풀 구성 | **사용자 직접** |
| `final-quiz` | 마무리 퀴즈 | 풀 구성 | 위임 |

- `intro-quiz`와 `final-quiz`는 퀴즈(EventLoopQuiz)로만 사용된다. `intro-quiz` 예제는 6번 섹션에서 일반 시뮬레이터로 재등장(서사 회수, SC-003).
- await 표현은 FR-014를 따른다: await 도달 스텝에서 프레임 pop, 재개는 micro에 "`함수명 이어서`" 항목으로 진입 후 콜스택 복귀.

## 3. Panel — 표시 패널 식별자

```ts
type Panel = "stack" | "webapis" | "micro" | "task" | "output";
```

- MDX에서는 콤마 구분 문자열로 받는다: `panels="stack,webapis"` (MDX에서 배열 리터럴보다 실수가 적음)
- 생략 시 풀 구성. `output`은 항상 표시(생략 불가 — 출력 없이는 서사가 성립 안 함)라 지정 목록에 없어도 포함한다. 코드·note·컨트롤은 패널이 아니라 항상 표시.
- 알 수 없는 패널 이름은 무시하지 않고 에러 박스 표시 (FR-004와 동일 원칙)

## 4. Quiz 데이터 — EventLoopQuiz의 props (별도 저장 없음)

```ts
interface EventLoopQuizProps {
  /** 결합할 예제 id — 제출 후 이 예제의 시뮬레이터가 열린다 */
  example: string;
  /** 출력 순서 보기 — 예: ["A → B → C → D", "A → C → D → B"] */
  choices: string[];
  /** 정답 보기 인덱스 (0-base) */
  answerIndex: number;
}
```

**불변식**:

- I9. `2 <= choices.length <= 4`, `0 <= answerIndex < choices.length`
- I10. `choices[answerIndex]`를 구분자로 분해한 결과 === 해당 예제 `steps.at(-1).output` (`tests/unit/event-loop-quiz-data.test.ts`) — 단, 퀴즈 데이터가 MDX props에 있으므로 테스트는 글 MDX에서 EventLoopQuiz 사용부의 props를 파싱해 검증하거나, 보기 문안을 examples.ts에 상수로 두고 MDX는 참조만 한다. **채택: 보기·정답을 examples.ts의 `quizzes` 레코드에 두고 MDX에서는 `<EventLoopQuiz quiz="intro" />`로 참조** — 검증 가능성이 우선, props는 quiz id 하나로 축소.

```ts
/* 채택안 반영 최종 형태 */
interface SimQuiz {
  id: string;          // "intro" | "final"
  example: string;     // 결합 예제 id
  question: string;
  choices: string[];
  answerIndex: number;
}
interface EventLoopQuizProps { quiz: string; }
```

## 5. 상태 전이 (컴포넌트 런타임)

- **EventLoopSimulator**: `stepIndex: number` (0 ≤ i < steps.length). 전이: 다음(+1, 최댓값 clamp·버튼 비활성), 이전(-1, 0 clamp·버튼 비활성), 처음부터(0). 파생 UI는 전부 `steps[stepIndex]`에서 계산.
- **EventLoopQuiz**: `selected: number | null` → `submitted: boolean`. 제출 전: 시뮬레이터 잠금 플레이스홀더. 제출 후: 맞음/틀림 + 정답 + 시뮬레이터 렌더. 재제출 없음(다시 풀기는 페이지 새로고침 — YAGNI).
