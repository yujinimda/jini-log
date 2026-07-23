# Quickstart: 003 검증 가이드

기능이 끝까지 동작함을 증명하는 실행 시나리오. 전제: `pnpm install` 완료.

## 1. 단위 검증 — 시뮬레이션이 거짓말하지 않는가 (FR-009/010, US3)

```bash
pnpm test
```

기대 결과:

- `tests/unit/event-loop-examples.test.ts` — 예제 6~7개 전부: quiescence 러너로 실제 실행한 출력 = 마지막 스텝 output, 무결식 I1~I5 통과
- `tests/unit/event-loop-quiz-data.test.ts` — 퀴즈 2개: 정답 보기 = 예제 최종 출력 (I9/I10)
- `tests/unit/event-loop-post.test.ts` — 글 MDX의 example/quiz/panels 참조가 전부 examples.ts에 존재, 개념 섹션마다 "실무에서는"/"생각해볼 점" Callout, Node 부록 Collapse 존재

음성 케이스 확인(선택): `examples.ts`에서 아무 스텝의 output 항목 하나를 지우고 다시 실행 → 해당 예제 이름이 박힌 실패가 나야 정상. 원복 후 통과 확인.

## 2. 로컬 렌더 — 글과 시뮬레이터 (US1, US2)

```bash
pnpm dev
# http://localhost:3000/posts/js-event-loop
```

수동 체크:

- [ ] 도입 퀴즈: 보기 클릭 전에는 시뮬레이터 잠김 → 제출하면 맞음/틀림 + 시뮬레이터 열림
- [ ] 시뮬레이터: 다음/이전/처음부터, 포커스 후 ←/→, 경계에서 버튼 비활성
- [ ] 패널 점진 공개: 2번 섹션은 콜스택만, 5번 섹션부터 풀 구성
- [ ] 각 개념 섹션 끝에 "실무에서는" / "생각해볼 점" 박스
- [ ] Node 심화는 접힌 부록(Collapse)
- [ ] 다크모드 토글·모바일 뷰포트(세로 스택)에서 가독 (SC-005)

## 3. E2E — 게시 상태 스모크 (FR-011)

```bash
pnpm test:e2e -- event-loop
```

기대 결과: `tests/e2e/event-loop.spec.ts` — 글 페이지 렌더, 시뮬레이터 조작(다음→상태 변화→처음부터), 퀴즈 제출→해금 통과.

## 4. 전체 게이트 (9단계 검증 → 커밋 전)

```bash
pnpm lint && pnpm build && pnpm test && pnpm test:e2e
```

## 5. 배포 확인 (11단계)

main 머지 → Vercel 프리뷰/프로덕션에서 §2 수동 체크 반복 (특히 모바일 실기기 1회).
