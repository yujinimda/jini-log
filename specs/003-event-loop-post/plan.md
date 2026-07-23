# Implementation Plan: 이벤트 루프 인터랙티브 글 (스텝 실행 시뮬레이터)

**Branch**: `spec/003-event-loop-post` (기획) → 개발은 레인 브랜치 | **Date**: 2026-07-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-event-loop-post/spec.md`

## Summary

이벤트 루프·태스크 큐·마이크로태스크 큐·프로미스를 하나의 서사로 설명하는 블로그 글 1편과, 글 안에서 독자가 직접 조작하는 스텝 실행 시뮬레이터·선택형 퀴즈를 만든다. 기술 접근: 기존 MDX 레지스트리 패턴에 클라이언트 컴포넌트 2종(`EventLoopSimulator`, `EventLoopQuiz`)을 추가하고, 예제는 손으로 작성한 스냅샷 스텝 배열(인터프리터 없음)로 정의하며, "실제 실행 출력 = 시뮬레이션 최종 출력" Vitest 검증으로 정확성을 보증한다.

## Technical Context

**Language/Version**: TypeScript 5.9, React 19, Next.js 16 (App Router)

**Primary Dependencies**: next-mdx-remote(기존 MDX 파이프라인), Tailwind CSS 4(디자인 토큰), 기존 `components/mdx/registry.ts` 레지스트리. 신규 외부 의존성 없음

**Storage**: 없음 — 예제 데이터는 코드(`components/mdx/event-loop/examples.ts`), 글은 `content/posts/*.mdx`

**Testing**: Vitest(`tests/unit/`, node 환경), Playwright(`tests/e2e/`)

**Target Platform**: 웹 (기존 블로그, Vercel 배포, 라이트/다크 테마, 모바일 대응)

**Project Type**: 기존 Next.js 블로그에 콘텐츠 + MDX 컴포넌트 추가

**Performance Goals**: 특별한 목표 없음 — 스텝 데이터는 정적 배열(예제당 ~25스텝, 직렬화 수 KB 수준), 시뮬레이터는 클라이언트 컴포넌트지만 글 페이지의 나머지는 기존 RSC 렌더 유지

**Constraints**: MDX 본문에서 import/export 금지(기존 파이프라인) → 예제는 이름 문자열로 참조. 등록된 컴포넌트만 사용 가능 → registry 등록 필수. `prefers-reduced-motion` 존중, 키보드 조작 지원

**Scale/Scope**: 컴포넌트 2종(+내부 pane 5종), 예제 6~7개, 글 1편, 단위 테스트 2종 + E2E 1종

## Constitution Check

`.specify/memory/constitution.md`는 템플릿 상태(프로젝트 원칙 미정의) — 적용할 게이트 없음. 대신 프로젝트 관례를 게이트로 사용:

- [x] 등록 컴포넌트만 MDX에서 사용 (registry 등록) — 준수
- [x] 렌더·검증 동일 옵션 계약(lib/mdx.ts) 유지 — 컴포넌트 추가만, 파이프라인 무변경
- [x] 기존 디자인 토큰만 사용(새 팔레트 금지) — 준수 (research R6)
- [x] `.prose` 계약 변경 금지 — 컴포넌트는 .prose 내부 삽입물로만 동작

## Project Structure

### Documentation (this feature)

```text
specs/003-event-loop-post/
├── plan.md              # 이 파일
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── mdx-components.md  # MDX 사용 계약 (props·registry)
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
components/mdx/
├── registry.ts                    # [수정] EventLoopSimulator·EventLoopQuiz 등록
└── event-loop/
    ├── event-loop-simulator.tsx   # [신규] "use client" 시뮬레이터 진입점
    ├── event-loop-quiz.tsx        # [신규] "use client" 선택형 퀴즈 + 시뮬레이터 해금 결합
    ├── examples.ts                # [신규] 예제 6~7개 (SimExample[]) — 핵심 2개는 사용자 직접 작성
    ├── types.ts                   # [신규] SimExample·SimStep·SimQuiz 타입
    └── panes/                     # [신규] CodePane·StackPane·QueuePane·OutputPane·Controls
        ├── code-pane.tsx
        ├── stack-pane.tsx
        ├── queue-pane.tsx         # webApis/micro/task 공용 (라벨·강조만 다름)
        ├── output-pane.tsx
        └── controls.tsx

content/posts/
└── js-event-loop.mdx              # [신규] 글 본문 (사용자 말투 초안 → 사용자 검수)

tests/
├── unit/
│   ├── event-loop-examples.test.ts   # FR-009 출력 순서 대조 + FR-010 무결성
│   └── event-loop-quiz-data.test.ts  # 퀴즈 정답이 예제 최종 출력과 일치
└── e2e/
    └── event-loop.spec.ts            # FR-011 렌더·조작 스모크 + 퀴즈 해금
```

**Structure Decision**: 기존 관례를 그대로 따른다 — MDX 컴포넌트는 `components/mdx/` 아래 기능 폴더, 글은 `content/posts/`, 테스트는 `tests/unit|e2e/`. 신규 라우트·API 없음.

## Complexity Tracking

위반 없음 — 신규 의존성 0, 신규 인프라 0. 유일한 복잡도는 손 작성 스텝 데이터의 정확성인데, 이는 스펙에서 검증 전략(FR-009/010)으로 명시적으로 해소됨.
