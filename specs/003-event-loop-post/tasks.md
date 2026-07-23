# Tasks: 이벤트 루프 인터랙티브 글 (스텝 실행 시뮬레이터)

**Input**: specs/003-event-loop-post/ (spec.md, plan.md, research.md, data-model.md, contracts/, quickstart.md)

**Tests**: 스펙이 검증을 FR-009/010/011로 명시 → 테스트 태스크 포함 (US3 자체가 테스트 스토리)

## 레인 소유권 · 머지 순서 (프로세스 v3 §6 — 이 단계에서 확정)

| 레인 | 브랜치 | 소유 파일 | 스토리 |
| --- | --- | --- | --- |
| A 컴포넌트 | `lane/003-a-simulator` | `components/mdx/event-loop/**` 전체, `components/mdx/registry.ts` | US1 |
| B 테스트 | `lane/003-b-tests` | `tests/unit/event-loop-*.test.ts`, `tests/e2e/event-loop.spec.ts`, `tests/helpers/event-loop-runner.ts` | US3 |
| C 글+사용자 예제 | `lane/003-c-post` | `content/posts/js-event-loop.mdx`, `components/mdx/event-loop/examples-user.ts`의 **내용**(파일 생성은 A가 스텁으로) | US2 + 사용자 직접 파트 |

- **공유 지점 규칙**: `registry.ts`·`examples.ts`·`types.ts`는 A 단독 소유 — B·C는 참조만. **유일한 예외는 `examples-user.ts`**: A가 스텁을 생성해 머지한 뒤 소유권이 C(사용자)로 이관된다 — 시점이 순차라 동시 수정은 없지만, 소유권 이동 파일임을 명시한다 (codex W2).
- **머지 순서**: A → B → C. B의 글 의존 테스트(post·E2E)는 **파일 존재를 런타임에 검사해 skip**하는 패턴으로 작성한다 — 글 파일을 모듈 최상위에서 eager import/read하면 B 머지 시점(글 없음)에 크래시하므로 금지, 존재 검사 후 lazy read (001 skipIf 관례, codex B2). C는 **B 머지 직후 main을 rebase로 흡수한 뒤** T019를 시작한다 (채점 테스트 확보, codex W1).
- **역할 역전(테스트 레인)**: B는 codex가 스펙·계약을 보고 테스트를 작성하고 클코가 통과시킨다. codex 15분+ 무응답 시 역전 해제(클코 직접 작성, skipIf·계약 대조·경계 케이스 패턴 준수).
- **사용자 직접 (TODO(human))**: C의 T017(핵심 예제 2개 스텝 작성)·T020(글 검수). 형식 시범(`callstack-only`)과 채점 테스트(FR-009/010)가 먼저 머지되어 있어 즉각 피드백 가능.

## Phase 1: Setup

- [ ] T001 레인 브랜치 3개 생성 (`lane/003-a-simulator`, `lane/003-b-tests`, `lane/003-c-post` — main 기준, worktree 격리)

## Phase 2: Foundational (레인 A 선행분 — 모든 스토리의 전제)

- [ ] T002 [A] `components/mdx/event-loop/types.ts` — SimStep·SimExample·SimQuiz·Panel 타입 (data-model.md §1~4, React 의존 금지)
- [ ] T003 [A] `components/mdx/event-loop/examples-user.ts` — 빈 스텁 먼저 (microtask-priority, async-await-split 자리에 TODO(human) 주석 + 형식 안내, 빈 레코드 export로 병합 무해) — T004가 import하므로 선행 (codex B1)
- [ ] T004 [A] `components/mdx/event-loop/examples.ts` — 위임 예제 5개(intro-quiz, callstack-only, settimeout-webapi, task-queue-loop, final-quiz) + quizzes 레코드(intro·final) + `examples-user.ts` 병합 export. 형식 시범 예제는 callstack-only. FR-014 await 규칙·I1~I8 준수, note는 한 줄 설명

## Phase 3: User Story 1 — 시뮬레이터 (P1, 레인 A)

**Goal**: 글 어디서든 `<EventLoopSimulator example panels>` 삽입 시 스텝 탐색 가능
**Independent Test**: 임의 예제를 처음~끝 스텝 이동하며 패널 갱신 확인 (quickstart §2)

- [ ] T005 [P] [US1] `components/mdx/event-loop/panes/code-pane.tsx` — 줄 렌더 + 현재 줄 하이라이트 (R2: 구문 강조 없음, zinc-900 톤)
- [ ] T006 [P] [US1] `components/mdx/event-loop/panes/stack-pane.tsx` — 콜스택 (끝=최상단 시각화)
- [ ] T007 [P] [US1] `components/mdx/event-loop/panes/queue-pane.tsx` — webApis/micro/task 공용 (라벨·앞=다음 실행 표시)
- [ ] T008 [P] [US1] `components/mdx/event-loop/panes/output-pane.tsx` — 누적 출력
- [ ] T009 [P] [US1] `components/mdx/event-loop/panes/controls.tsx` — 이전/다음/처음부터 (경계 비활성, aria-label)
- [ ] T010 [US1] `components/mdx/event-loop/event-loop-simulator.tsx` — "use client", stepIndex useState, panels 콤마 문자열 파싱, 미존재 example/panel 에러 박스(FR-004), 키보드 ←/→(R8: tabIndex+포커스 스코프), note aria-live, 모바일 세로 스택, dark:·motion-reduce: 대응 (contracts/mdx-components.md 계약 전체)
- [ ] T011 [US1] `components/mdx/event-loop/event-loop-quiz.tsx` — "use client", quiz id 참조, 제출 전 시뮬레이터 잠금 플레이스홀더 → 제출 후 맞음/틀림+시뮬레이터 (FR-012/013, R3)
- [ ] T012 [US1] `components/mdx/registry.ts` — EventLoopSimulator·EventLoopQuiz 등록 (contracts 계약)
- [ ] T013 [US1] 레인 A 자체 검증: `pnpm lint && pnpm build` + dev 서버에서 임시 MDX로 두 컴포넌트 수동 스모크 → codex-review → PR #A

## Phase 4: User Story 3 — 정확성 검증 (P3이지만 머지 2순위 — C의 채점자, 레인 B)

**Goal**: 시뮬레이션 거짓말·참조 오타를 커밋 전에 기계 검출
**Independent Test**: 스텝 하나를 의도적으로 틀리게 → 실패, 원복 → 통과 (quickstart §1)

- [ ] T014 [US3] `tests/helpers/event-loop-runner.ts` — quiescence 러너 (R4: console/setTimeout/queueMicrotask 주입+대기 카운터, 비화이트리스트 글로벌 undefined shadowing, 1000턴 상한)
- [ ] T015 [P] [US3] `tests/unit/event-loop-examples.test.ts` — 전 예제 FR-009 실행 대조 + FR-010 불변식 I1~I5 + I8 금지 식별자 정적 스캔 (examples-user 병합분 포함 — 스텁이면 해당 id skip)
- [ ] T016 [P] [US3] `tests/unit/event-loop-quiz-data.test.ts` + `tests/unit/event-loop-post.test.ts` — I9/I10 퀴즈 정합, 글 MDX example/quiz/panels 참조·Callout 2종·Collapse 부록·"지금은 이해 안 되는 게 정상" 카피(US2-AC4) 정적 검증, `tests/e2e/event-loop.spec.ts` — 렌더·조작·퀴즈 해금 스모크 (FR-011). **글 의존 테스트는 전부 존재 검사 후 lazy read + skip — eager import 금지** (B 머지 시점 그린 보장)
- [ ] T017 [US3] 레인 B 검증: `pnpm lint && pnpm build && pnpm test`(글 부재 skip 동작 확인 포함) → codex-review → PR #B

## Phase 5: User Story 2 — 글 + 사용자 파트 (P2, 레인 C, 머지 3순위)

**Goal**: 서사 완결된 글 게시, 핵심 예제 2개는 작성자가 직접
**Independent Test**: quickstart §2 수동 체크리스트 전체

- [ ] T018 [US2] `content/posts/js-event-loop.mdx` 초안 — 서사 7단계(FR-001), 섹션별 "실무에서는"/"생각해볼 점" Callout(FR-006), Node 심화 Collapse(FR-007), 시뮬레이터 점진 패널·퀴즈 2개 삽입, 도입 퀴즈 해설에 "지금은 이해 안 되는 게 정상" 카피(US2-AC4). **말투: 사용자 구어체 해요체, 이모지 금지, AI 상투구 금지 (R9)**
- [ ] T019 [US2] **사용자 직접(TODO-human)**: 시작 전 레인 C에 main rebase(B 머지분 흡수 — 채점 테스트 확보). `components/mdx/event-loop/examples-user.ts`에 microtask-priority·async-await-split 스텝 작성 — 형식은 callstack-only 참고, `pnpm test`가 채점 (FR-009/010/014). 막히면 클코가 힌트(정답 아닌 방향) 제공
- [ ] T020 [US2] **사용자 직접**: 글 초안 검수·수정 (말투·내용), 완료 선언
- [ ] T021 [US2] 레인 C 검증: `pnpm lint && pnpm build && pnpm test && pnpm test:e2e` 전체 그린 → codex-review → PR #C

## Phase 6: Polish & 배포

- [ ] T022 스토리 순서대로 PR 머지 (A→B→C, 머지마다 main rebase+테스트 재확인), 머지 후 통합 E2E 1회
- [ ] T023 Vercel 프리뷰에서 quickstart §2·§5 확인(다크·모바일 포함) → 프로덕션 확인 → 완료 보고

## Dependencies

- T002~T004(Foundational) → US1(T005~T013)의 전제. US1 내 T005~T009는 [P] 병렬, T010이 T005~T009 통합
- 레인 B(T014~T017)는 A의 types/examples **계약**(data-model.md)만 참조 — A 머지 전 병렬 작성 가능, 실행 확인은 A 머지 후
- 레인 C(T018~T021)는 A 머지 후 시작(컴포넌트 렌더 필요), T019는 B 머지 후가 이상적(채점 테스트 즉시 사용) — T018 초안 작성은 A만 있어도 가능
- MVP = US1 (T001~T013): 시뮬레이터가 도는 것만으로 데모 가능

## Parallel Example

- A 작업 중 B가 계약 기반 테스트 작성 (병렬), C 초안 집필도 텍스트 부분은 병렬 가능
- US1 내부: T005~T009 pane 5개 동시 작성 → T010 통합
