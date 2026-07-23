# 003 — 이벤트 루프 인터랙티브 글 설계

- 날짜: 2026-07-23
- 상태: 브레인스토밍 완료, specify 대기
- 목표: "싱글스레드 JS가 어떻게 비동기를 처리하나"를 이벤트 루프 → 태스크 큐 → 마이크로태스크 큐 → 프로미스로 꿰어 설명하는 블로그 글 한 편 + 독자가 직접 만져보는 스텝 실행 시뮬레이터.
- 독자: 백엔드 스터디 모임 (JS가 주 언어가 아닌 개발자 포함). 개념의 실무 사용처와 토론 거리가 중요.

## 결정 요약

| 결정 | 선택 | 근거 |
| --- | --- | --- |
| 글 구성 | 한 편 + Collapse 심화 부록 | 주제가 하나의 서사로 모임. 편당 부담은 Collapse로 해소 |
| 데모 형태 | 스텝 실행 시뮬레이터 (이전/다음/리셋) | 학습 효과 최고, 구현 난도 중간 |
| Node.js 범위 | 본문은 공통 원리, Node 6페이즈·nextTick·setImmediate는 심화 부록 | 백엔드 니즈와 본문 복잡도의 균형 |
| 시각 스타일 | 블로그(Astryx) 토큰 기반 플랫 스타일 | 다크모드 자동 대응, 글과 통일감 |
| 실무 연결 | 개념마다 "실무에서는" + "생각해볼 점" Callout 2종 | 개념-사용처-함정이 붙어 있어야 기억에 남음. 스터디 토론 거리 제공 |
| 스텝 데이터 | 접근법 A: 손으로 쓴 스텝 스크립트 (인터프리터 없음) | 데모는 실행기가 아니라 설명 장치. 스텝별 note가 핵심 가치. 정확성은 테스트로 방어 |

### 기각한 접근법
- **B. 미니 인터프리터** — 제한된 JS 부분집합을 파싱해 스텝 자동 생성. 정확하지만 범위가 글 한 편 대비 3~4배. async/await의 마이크로태스크 분해를 정확히 구현하는 것 자체가 난제. YAGNI.
- **C. 실제 실행 계측** — 진짜 setTimeout/Promise를 실행하며 기록·재생. 콜스택·큐 내부는 JS에서 관찰 불가라 결국 절반은 손 주석. A의 단점에 복잡도만 추가.

## 1. 글의 서사 구조

미스터리 → 해소 구조. 같은 시뮬레이터가 패널을 하나씩 늘려가며 재등장해, 글이 진행될수록 독자의 머릿속 모델과 화면이 같이 자란다.

1. **도입 — 퀴즈**: `setTimeout(0)`과 `Promise.then`이 섞인 코드의 출력 순서 맞히기. 독자가 먼저 틀리게 만들고 시작. (시뮬레이터 첫 등장 — 정답 공개용. 풀 구성이 미리 보이지만 "지금은 이해 안 되는 게 정상, 글 끝에 이 화면을 읽을 수 있게 된다"고 명시해 궁금증 장치로 사용)
2. **싱글스레드와 콜스택** — "한 번에 하나만". (패널: 콜스택만)
3. **기다리는 동안 누가 일하나** — Web API / 런타임이 대신 함. (패널 추가: Web APIs)
4. **태스크 큐와 이벤트 루프** — 끝난 일이 돌아오는 대기줄. (패널 추가: 태스크 큐)
5. **마이크로태스크 큐** — 왜 큐가 하나 더 있고, 왜 항상 새치기하나. (풀 구성)
6. **프로미스로 합치기** — `.then` 콜백 = 마이크로태스크, `await` = `then`의 문법 설탕. 도입 퀴즈를 다시 풀며 회수.
7. **마무리 퀴즈** — async/await 섞인 어려운 예제.

### 섹션별 고정 요소 (Callout 2종)
- **실무에서는**: 이 개념을 실제로 만나는 곳.
  - 예: 태스크 큐 → setTimeout 디바운스·폴링·이벤트 핸들러 / 마이크로태스크 → fetch 응답 처리 체인, queueMicrotask / 콜스택 → 스택 트레이스 읽기, "Maximum call stack size exceeded"
- **생각해볼 점**: 함정·트레이드오프를 질문 형태로 (스터디 토론 거리).
  - 예: "`await`를 for문 안에서 쓰면 무슨 일이 생길까? 언제 `Promise.all`로 바꿔야 할까?" / "마이크로태스크가 자기 자신을 계속 다시 큐에 넣으면 화면은 어떻게 될까?" (기아 상태) / "CPU 무거운 작업이 이벤트 루프를 막으면 Node 서버에는 무슨 일이 일어날까?" / "setTimeout(fn, 0)은 정말 0ms 뒤에 실행될까?" (최소 지연·스로틀링)

### 심화 부록 (Collapse)
- Node.js 이벤트 루프 6페이즈, `process.nextTick` vs `setImmediate`, nextTick 기아
- async/await → then 체인 변환 상세 (스펙 수준: await 하나가 몇 개의 마이크로태스크인가)

## 2. 컴포넌트 아키텍처

```
components/mdx/event-loop/
├── event-loop-simulator.tsx   ← "use client", registry에 등록되는 진입점
├── examples.ts                ← 예제 데이터 (스텝 스크립트 6~7개)
├── types.ts                   ← SimExample, SimStep 타입
└── panes/                     ← CodePane, StackPane, QueuePane, OutputPane, Controls
```

- MDX 사용법: `<EventLoopSimulator example="intro-quiz" panels={["stack","micro","task"]} />`
  - **예제는 이름(문자열)으로 참조** — 이 블로그 MDX는 import/export 금지이므로 데이터 인라인 불가. 이름 참조가 검증 파이프라인과 정합.
  - 존재하지 않는 example 이름이면 렌더 시 명시적 에러 표시 (조용히 빈 화면 금지).
- `registry.ts`에는 `EventLoopSimulator` 1개만 등록 (레지스트리 오염 최소화).
- `panels` prop으로 표시 패널 제어 → 글 초반 콜스택만 → 후반 풀 구성 (점진적 복잡도).
- 상태 관리: `useState(stepIndex)` 하나. 각 스텝이 완전한 스냅샷이므로 인덱스만 이동 — 이전/다음이 공짜로 대칭.

## 3. 데이터 모델

```ts
interface SimExample {
  id: string;            // MDX에서 참조하는 이름
  title: string;
  code: string[];        // 표시용 코드 (줄 배열) — 실제 실행 가능한 JS일 것
  steps: SimStep[];
}

interface SimStep {
  line: number | null;   // 하이라이트할 코드 줄 (1-base, null=루프 대기)
  callstack: string[];
  webApis: string[];     // 대기 중 타이머·fetch — "setTimeout은 큐에 바로 안 들어간다" 오해 방지
  micro: string[];
  task: string[];
  output: string[];      // 누적 (append-only)
  note: string;          // 이 스텝에서 무슨 일이 일어났는지 한 줄 설명
}
```

## 4. 가독성·접근성

- Astryx 디자인 토큰만 사용 (색·폰트·라운드). 다크모드 자동 대응.
- 모바일: 패널 세로 스택.
- 키보드 ←/→로 스텝 이동, 버튼에 aria-label.
- 큐→콜스택 이동은 CSS transition으로 가볍게. `prefers-reduced-motion` 존중.

## 5. 테스트 (시뮬레이션 거짓말 방지)

손으로 쓴 스텝의 최대 리스크 = 시뮬레이션이 실제 JS 동작과 다른 것.

- **Vitest — 출력 순서 대조**: 각 예제의 `code`를 실제로 실행하고, 실제 출력 순서가 마지막 스텝의 `output`과 일치하는지 자동 검증. (예제 코드를 "실행 가능한 JS"로 유지하는 이유)
- **Vitest — 스텝 무결성**: 콜스택 push/pop 정합, `output`은 append-only, `line`이 code 범위 내 등 구조 규칙 검사.
- **Playwright**: 글 페이지에서 시뮬레이터 렌더 + 다음/이전/리셋 스모크.

## 6. 산출물 범위

- 새 인터랙티브 컴포넌트 1종(+하위 pane) 및 registry 등록
- 예제 스텝 스크립트 6~7개
- 블로그 글 1편 (content/posts/*.mdx)
- 테스트 (Vitest 2종 + Playwright 스모크)

범위 외: 독자 코드 입력 시뮬레이션(접근법 B), 손그림 스타일 일러스트, 시리즈 분할.
