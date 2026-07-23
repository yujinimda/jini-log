# Contracts: MDX 컴포넌트 사용 계약 (003)

글 작성자(MDX)와 컴포넌트 구현 사이의 계약. 이 계약이 지켜지는 한 서로의 내부 변경은 자유다.

## EventLoopSimulator

```mdx
<EventLoopSimulator example="callstack-only" />
<EventLoopSimulator example="task-queue-loop" panels="stack,webapis,task" />
```

| prop | 타입 | 필수 | 의미 |
| --- | --- | --- | --- |
| `example` | string | 필수 | `examples.ts` 레코드 키. 미존재 시 에러 박스 렌더 (조용한 실패 금지) |
| `panels` | string (콤마 구분) | 선택 | 표시 패널: `stack`, `webapis`, `micro`, `task`. 생략 = 풀 구성. `output`·코드·note·컨트롤은 항상 표시. 알 수 없는 이름 = 에러 박스 |

동작 보장:

- 이전/다음/처음부터 버튼 + 포커스 시 ←/→ 키 (경계에서 버튼 비활성)
- 스텝마다 코드 현재 줄 하이라이트, 각 패널 상태, 누적 출력, note 표시
- note는 `aria-live="polite"`, 루트는 `role="group"` + aria-label
- 라이트/다크 테마, 모바일(세로 스택), `motion-reduce` 대응

## EventLoopQuiz

```mdx
<EventLoopQuiz quiz="intro" />
```

| prop | 타입 | 필수 | 의미 |
| --- | --- | --- | --- |
| `quiz` | string | 필수 | `examples.ts`의 `quizzes` 레코드 키 (`intro`, `final`). 미존재 시 에러 박스 |

동작 보장:

- 제출 전: 보기 선택 가능, 시뮬레이터는 잠금 플레이스홀더 (정답 비노출 — FR-012/013)
- 제출 후: 맞음/틀림 + 정답 표시, 결합된 예제의 시뮬레이터 열림
- 보기·정답 데이터는 `quizzes` 레코드에 있으므로 단위 테스트가 "정답 보기 = 예제 최종 출력" 일치를 검증한다 (I10)

## registry.ts 등록 (계약 변경점)

```ts
export const mdxComponents: MDXComponents = {
  pre: CodeBlock,
  Callout,
  Collapse,
  EventLoopSimulator,   // 신규
  EventLoopQuiz,        // 신규
};
```

- 두 컴포넌트 모두 `"use client"` — 기존 CodeBlock과 동일 패턴이며 RSC 파이프라인(compileMDX)과 호환
- validateMdx의 미등록 컴포넌트 검사(`registeredComponentNames`)는 자동으로 두 이름을 인식한다 (파이프라인 코드 수정 없음)

## examples.ts 데이터 계약

```ts
export const examples: Record<string, SimExample>;
export const quizzes: Record<string, SimQuiz>;
```

- 키 목록과 불변식은 data-model.md §2·§4. 테스트가 이 export를 직접 import해 검증하므로, 데이터 파일은 React 의존성이 없어야 한다(node 환경 Vitest에서 import 가능할 것)
