# Research: 003 이벤트 루프 인터랙티브 글

Phase 0 — 기술 미지수 해소. 모든 결정은 spec.md의 FR/grilling 결정을 전제로 한다.

## R1. 시뮬레이터 상태 관리

- **Decision**: `useState<number>(stepIndex)` 하나. 각 스텝이 완전한 스냅샷(SimStep)이므로 파생 상태·리듀서 불필요. 이전/다음/처음부터는 인덱스 연산, 범위는 clamp.
- **Rationale**: 스냅샷 배열 설계(설계 문서 접근법 A)의 직접 귀결. 상태가 하나면 이전/다음 대칭(US1-AC2)이 구조적으로 보장된다.
- **Alternatives considered**: useReducer(이벤트 소싱형) — 스텝을 diff로 정의하면 되감기 로직이 필요해져 기각. XState — 과잉.

## R2. 코드 하이라이트 (CodePane)

- **Decision**: 구문 강조 없음. 코드는 `SimExample.code: string[]`을 줄 단위로 렌더하고, 현재 스텝의 `line`만 배경색으로 하이라이트. 스타일은 기존 코드블록 톤(zinc-900 배경·zinc-100 텍스트)을 따른다.
- **Rationale**: 블로그의 기존 MDX 코드블록도 구문 강조가 없다(rehype 하이라이터 미도입). 예제 코드는 10줄 내외라 구문 강조의 이득이 작고, 하이라이터 추가는 "신규 의존성 0" 원칙 위반.
- **Alternatives considered**: shiki/prism 도입 — 의존성·번들 증가 대비 이득 없음, 기각.

## R3. 퀴즈-시뮬레이터 결합 방식 (FR-013)

- **Decision**: `EventLoopQuiz`가 자신의 내부에서 `EventLoopSimulator`를 렌더한다. props: `example`(공유), `choices`, `answerIndex`. 제출 전에는 시뮬레이터 대신 잠금 플레이스홀더("예측을 제출하면 열려요")를 표시, 제출 후 맞음/틀림 피드백과 함께 시뮬레이터 렌더. 상태는 Quiz의 로컬 useState(제출 여부·선택 인덱스)로 충분 — 페이지 이탈 시 초기화되는 것은 허용.
- **Rationale**: 잠금이 퀴즈의 책임이라는 grilling Q1 결정의 직역. 별도 상태 공유 장치(context 등) 없이 부모-자식 합성으로 끝난다.
- **Alternatives considered**: 퀴즈와 시뮬레이터를 형제로 두고 context로 해금 신호 공유 — MDX에서 두 컴포넌트의 짝을 글 작성자가 맞춰야 해서 실수 여지, 기각. 제출 상태 localStorage 보존 — YAGNI.

## R4. 출력 순서 대조 테스트 실행 방법 (FR-009)

- **Decision**: Vitest(node)에서 각 예제의 `code.join("\n")`을 `new Function("console", src)`로 감싸 가짜 `console`(호출 인자를 배열에 수집)을 주입해 실행한다. 비동기 완료 대기는 매크로태스크 2틱 flush(`await new Promise(r => setTimeout(r, 0))` 반복 + 마지막에 여유 1회)로 처리하고, 수집된 출력을 `steps.at(-1).output`과 비교한다.
- **Rationale**: 예제 API가 결정적 화이트리스트(console.log, setTimeout, Promise, async/await, queueMicrotask — grilling Q3)로 한정되므로 실제 타이머로도 결정적이다. setTimeout 지연은 예제에서 0(또는 소수 ms)만 사용 → flush 대기가 짧고 안정적.
- **Alternatives considered**: vi.useFakeTimers — Promise/타이머 인터리빙이 실제 런타임과 미묘하게 달라질 수 있어(검증 대상이 바로 그 인터리빙) 실제 타이머 채택. Worker/자식 프로세스 격리 — 예제가 신뢰 코드(레포 내 데이터)라 불필요.

## R5. 예제 이름 참조와 오류 처리 (FR-004)

- **Decision**: `examples.ts`가 `Record<string, SimExample>`를 export. 시뮬레이터·퀴즈는 렌더 시 이름을 lookup하고, 없으면 눈에 띄는 에러 박스("예제 '<이름>'을 찾을 수 없습니다 — examples.ts 등록 목록 확인")를 렌더한다. 추가 방어선: 글에 쓰인 이름의 유효성은 E2E(FR-011)가 실제 글 페이지를 열며 함께 확인된다.
- **Rationale**: MDX 검증 파이프라인(validateMdx)은 컴포넌트 이름까지만 검사하므로 props 오타는 런타임 방어가 최선. 조용한 실패 금지는 스펙 명시.
- **Alternatives considered**: validateMdx를 확장해 example prop 값까지 검사 — 파이프라인 공용 코드 수정 범위가 커지고 이번 글 전용 로직이 공용 검증에 새는 구조라 기각(추후 필요 시 별도 피처).

## R6. 시각 스타일·테마 대응

- **Decision**: Tailwind 유틸리티 + 기존 시맨틱 토큰(`--color-border`, `--color-muted` 등)과 zinc 계열만 사용. 다크 대응은 기존 `@custom-variant dark`(`.dark` 클래스) 기준 `dark:` 유틸리티로 처리. 패널 강조(활성 항목·하이라이트 줄)는 무채색 농도 차 + Callout에서 확립된 톤다운 파스텔(sky/amber) 범위 내에서만.
- **Rationale**: "기존 디자인 토큰만, 새 팔레트 금지"(스펙 Assumption). 블로그가 next-themes + `.dark` 클래스 방식임을 확인.
- **Alternatives considered**: 없음 — 제약이 이미 결정.

## R7. 애니메이션·모션

- **Decision**: 스텝 전환은 상태 교체가 기본이고, 새로 들어온 항목에만 짧은 fade/slide-in(기존 tw-animate-css 유틸)을 준다. 큐→스택을 가로지르는 이동 궤적(FLIP) 애니메이션은 하지 않는다. `motion-reduce:` 유틸리티로 reduced-motion 시 애니메이션 제거(FR-008).
- **Rationale**: 이전/다음 양방향 이동에서 궤적 애니메이션은 역재생 정의가 모호하고 구현 비용이 큼. "어디서 왔는지"는 note 텍스트가 설명한다.
- **Alternatives considered**: FLIP 라이브러리(framer-motion) 도입 — 신규 의존성·범위 초과, 기각.

## R8. 키보드 조작 (US1-AC6)

- **Decision**: 시뮬레이터 루트에 `tabIndex={0}` + `onKeyDown`(←/→)을 달고, 포커스가 시뮬레이터 안에 있을 때만 동작시킨다. 버튼에는 aria-label, 루트에 `role="group"`과 `aria-label="이벤트 루프 시뮬레이터"`. 스텝 변경 시 note를 `aria-live="polite"` 영역으로 안내.
- **Rationale**: 포커스 없는 전역 키 가로채기는 페이지 스크롤(←/→는 아니지만)·다른 컴포넌트와 충돌 여지가 있고, 시뮬레이터가 한 페이지에 여러 개(6~7개) 있으므로 포커스 스코프가 필수.
- **Alternatives considered**: 전역 keydown — 다중 인스턴스에서 모호, 기각.

## R9. 글 말투 (사용자 위임 결정 반영)

- **Decision**: 구어체 해요체("~거예요", "~죠"), 이모지 금지, AI 상투 표현 금지(과장 감탄, 형식적 마무리 문단, 기계적 불릿 남발). 짧은 문장 위주, 독자에게 말 걸기("한번 눌러보세요")를 시뮬레이터 앞뒤에 배치. 기존 글(hello-world)과 사용자가 참고 이미지로 준 글 톤을 기준 삼는다. 초안은 사용자 검수를 전제로 한다.
- **Rationale**: 2026-07-23 사용자 지시("내 말투로, AI 티 안 나게, 이모지 쓰지 말고").

## R10. 글 슬러그·프론트매터

- **Decision**: slug `js-event-loop`(SLUG_PATTERN 준수), frontmatter는 기존 스키마(title/description/date/tags) 그대로, tags: `[javascript, async]`. title/description 문안은 글 초안 단계에서 확정.
- **Rationale**: content-schema.ts 확인 — 추가 필드 불필요.
