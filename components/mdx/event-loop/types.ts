// 003 데이터 모델 (specs/003-event-loop-post/data-model.md §1~4). 소유: 레인 A
// React 의존 금지 — 테스트가 node 환경(Vitest)에서 직접 import한다.

/** 한 순간의 완전한 스냅샷 — 스텝은 이전 스텝에 의존하지 않는다 (앞뒤 이동 대칭) */
export interface SimStep {
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
  /** 누적 콘솔 출력 (append-only, I2) */
  output: string[];
  /** 이 스텝에서 일어난 일 한 줄 설명 */
  note: string;
}

/** 재생 가능한 예제 하나 — code는 실제 실행 가능한 JS (FR-009 전제, I8 화이트리스트) */
export interface SimExample {
  /** MDX에서 참조하는 식별자 (kebab-case, 레코드 키와 일치 — I6) */
  id: string;
  title: string;
  /** 표시용이자 실행용 코드 — 줄 단위 */
  code: string[];
  /** 최소 1개 */
  steps: SimStep[];
}

/** 표시 패널 식별자 — MDX에서는 콤마 구분 문자열로 받는다 (data-model.md §3) */
export type Panel = "stack" | "webapis" | "micro" | "task" | "output";

/** 선택형 퀴즈 — 보기·정답을 데이터로 두어 I10(정답 보기 = 예제 최종 출력)을 기계 검증 */
export interface SimQuiz {
  id: string;
  /** 결합할 예제 id — 제출 후 이 예제의 시뮬레이터가 열린다 */
  example: string;
  question: string;
  /** 출력 순서 보기 — "A → B → C" 형식, I9: 2~4개 */
  choices: string[];
  /** 정답 보기 인덱스 (0-base) */
  answerIndex: number;
}
