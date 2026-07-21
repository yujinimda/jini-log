# Tasks: 지니로그 — 디자인·사용감 개편

**Input**: Design documents from `/specs/002-redesign/`

**Prerequisites**: plan.md, spec.md, research.md(R1~R9), contracts/ui.md, quickstart.md

**Tests**: 포함 — 레인 D 역할 역전(코덱스 작성 → 클코 통과). 001 E2E 61케이스 = 회귀 게이트.

**Organization**: 유저 스토리별 페이즈 + 오르카 레인. `[레인:X]`가 담당.

## 오르카 레인 및 공유 파일 소유권 (001 소유권의 연장)

| 레인 | 담당 | 이번에 소유(다른 레인은 참조만) |
| --- | --- | --- |
| **A (foundation)** | Phase 1~2 | `components/ui/**`(shadcn 생성물 — 수정 필요 시 A에 요청), `app/globals.css`, 폰트 자산(woff2·`assets/fonts/og/`), `app/layout.tsx`, `lib/mdx-options.ts`·`lib/content.ts`·`lib/toc.ts`·`lib/search.ts`, `scripts/generate-search-index.ts`, `components/mdx/**` |
| **B (blog)** | US1·US2 | `app/(blog)/**`(blog.css 포함), `components/blog/**` |
| **C (admin)** | US3 | `app/admin/**`, `components/admin/**` |
| **D (test)** | 전 스토리 테스트 | `tests/unit/**`, `tests/api/**`, `tests/e2e/*.spec.ts` (인프라는 A) |

**머지 단위와 순서** (PR = 스토리 단위, 각 머지마다 최신 main rebase + 테스트 재확인):

```
A(Phase 1~2) → US2(B, 읽기·톤) → US1(B, 찾기) → US3(C, 어드민) → Polish
```

- US2가 US1보다 먼저: 홈 카드(US1)가 B1 톤(blog.css, US2에서 재작성) 위에 얹힘.
- **테스트 전달 규칙**: D의 스토리 테스트는 해당 레인 브랜치로 전달, 스토리 PR에 포함 필수.
- **구현 리뷰 재검증 포인트 (plan 게이트에서 이월)**: ① R2 — OG 이미지가 `assets/fonts/og/` TTF/OTF를 fs로 읽고 **런타임 폰트 fetch가 제거**됐는가 (T014), ② R5 — TOC id가 `rehypeCollectToc`로 **rehype-slug와 같은 AST 패스에서 수집**되는가, 별도 slug 재현이 없는가 (T004·T005). US2 codex-review에서 반드시 확인.

---

## Phase 1: Setup — 레인 A

- [ ] T001 [레인:A] shadcn/ui 도입 — `npx shadcn init`(zinc 베이스), `app/globals.css`에 theme 토큰 계층·`tw-animate-css` 통합(R1), `components/ui/`에 button·input·dialog·command·table·sonner 추가, 렌더 스모크로 유틸리티 로드 검증
- [ ] T002 [P] [레인:A] 폰트 자산 — Pretendard Variable·Noto Serif KR 한글 서브셋 woff2 확보 + `assets/fonts/og/` TTF/OTF 서브셋(R2), `app/layout.tsx`에 `next/font/local` 로딩·CSS 변수(`--font-sans`/`--font-serif`) 연결
- [ ] T003 [P] [레인:A] 검색 인덱스 생성기 — `scripts/generate-search-index.ts`(발행 로더 사용 → `generated/search-index.json`), package.json `prebuild`/`predev` 등록, `generated/` gitignore (R3)

---

## Phase 2: Foundational — 레인 A (⚠️ 이 페이즈 머지 전 B·C 스토리 시작 금지)

- [ ] T004 [레인:A] `lib/mdx-options.ts` — `rehype-slug` + `rehypeCollectToc(collector)`를 같은 rehype 체인에 추가 (R5 — 렌더·검증·프리뷰 공유, 001 컬렉터 패턴)
- [ ] T005 [레인:A] `lib/toc.ts` — 공유 파이프라인 실행 래퍼 `getToc(body): TocEntry[]` (자체 slug 알고리즘 재현 금지, R5)
- [ ] T006 [레인:A] `lib/content.ts` — PostDerived 파생 일원화: `readingMinutes`(코드펜스 제외 문자수÷500 올림, 최소 1) + `excerpt`(마크다운 스트립 앞 500자) (R6)
- [ ] T007 [P] [레인:A] `lib/search.ts` — `searchPosts(entries, query)` 순수 매칭 함수(소문자 포함, 제목>태그>설명>본문 가중, 빈 쿼리 → 빈 배열)
- [ ] T008 [P] [레인:A] `components/mdx/callout.tsx` — 톤다운 파스텔 재조정 (grilling 확정 예외)

**Checkpoint**: A 머지 → B·C 병렬 시작

---

## Phase 3: User Story 2 - 독자가 글을 편하게 읽는다 (P1) — 레인 B

**Independent Test**: quickstart W3 + V-R 일부

- [ ] T009 [레인:B] [US2] `app/(blog)/blog.css` B1 재작성 — `.prose` 17px/1.8/42rem, 제목 `--font-serif`, 무채색 스케일, 링크 밑줄+농도 (프리뷰 자동 반영 확인 — FR-011)
- [ ] T010 [레인:B] [US2] `app/(blog)/layout.tsx` 새 헤더 — 세리프 로고·[태그·검색 버튼 자리·RSS], 얇고 조용한 크롬
- [ ] T011 [레인:B] [US2] `app/(blog)/posts/[slug]/page.tsx` 상세 개편 — 세리프 대제목, 메타(날짜·읽기시간·태그), 본문 폭 정렬
- [ ] T012 [P] [레인:B] [US2] `components/blog/toc.tsx` + 상세 통합 — `getToc` 사용, ≥1280px 우측 고정+IntersectionObserver 하이라이트, 미만 접이식, 빈 배열 미렌더
- [ ] T013 [P] [레인:B] [US2] `components/blog/post-nav.tsx` 이전/다음(발행일 순, 동일 날짜 slug 사전순) + 상세 하단 통합
- [ ] T014 [레인:B] [US2] `components/blog/og-image.tsx` — `assets/fonts/og/` TTF/OTF를 fs로 읽도록 전환, **구글 폰트 런타임 fetch 코드 제거** (R2 — 리뷰 재검증 포인트)
- [ ] T015 [레인:D] [US2] 테스트(코덱스 작성→클코 통과) — 유닛: reading-time 경계(0자·코드만·1분 미만), getToc id 일치(중복 제목·한글·인라인 마크업 — 렌더된 HTML 앵커와 대조); E2E: TOC 표시·이동·하이라이트, h2 없는 글 미표시, 프리뷰 타이포 동일성

---

## Phase 4: User Story 1 - 독자가 원하는 글을 빠르게 찾는다 (P1) — 레인 B

**Independent Test**: quickstart W1·W2

- [ ] T016 [레인:B] [US1] `components/blog/search-command.tsx` — shadcn Command 다이얼로그, ⌘K/Ctrl+K 리스너, 첫 오픈 시 `await import("@/generated/search-index.json")`, `searchPosts` 매칭, 결과없음 문구, 선택 시 이동 (R3·R4)
- [ ] T017 [레인:B] [US1] 헤더 검색 버튼 연결 + `(blog)/layout.tsx` 마운트 (어드민 미마운트 — 계약)
- [ ] T018 [레인:B] [US1] `app/(blog)/page.tsx`·`components/blog/post-list.tsx` 카드 개편 — PostDerived 소비: 제목·description(line-clamp-2)·발행일·읽기시간·태그, 구분선 리듬
- [ ] T019 [P] [레인:B] [US1] `app/(blog)/tags/page.tsx` 태그 인덱스(전체 태그+글 수) + 헤더 링크
- [ ] T020 [레인:D] [US1] 테스트(코덱스 작성→클코 통과) — 유닛: searchPosts(가중 순서·빈 쿼리·대소문자), 인덱스 생성기(초안 미포함 — FR-003); E2E: ⌘K→입력→이동, 결과없음, 첫 로드에 인덱스 미로딩(FR-004)

---

## Phase 5: User Story 3 - 운영자가 어드민을 쾌적하게 쓴다 (P2) — 레인 C

**Independent Test**: quickstart W4

- [ ] T021 [레인:C] [US3] `window.confirm()` 3지점 → shadcn Dialog — 발행취소·삭제(`components/admin/dashboard/post-row-actions.tsx`), 덮어쓰기(`components/admin/editor/post-editor.tsx`) (플로우·API 무변경)
- [ ] T022 [레인:C] [US3] Toast 전면 — admin 레이아웃에 sonner Toaster, save-draft·publish·unpublish·delete·이미지 업로드 성공/실패 전부, 기존 인라인 상태 텍스트 제거 (**예외: 422 행·열 오류 목록은 에디터 인라인 유지** — 계약)
- [ ] T023 [레인:C] [US3] 대시보드 shadcn Table + 클라이언트 정렬(제목·발행일·조회수 토글, 기본 발행일 내림차순)
- [ ] T024 [P] [레인:C] [US3] 에디터 정돈 — 상단 액션바 고정, 마지막 저장 시각 상시 표시, 프리뷰 패널 토글
- [ ] T025 [레인:D] [US3] 테스트(코덱스 작성→클코 통과) — E2E: Dialog 확인/취소 플로우, Toast 표출(성공·실패), 정렬 토글; 기존 E2E 셀렉터 영향분 동시 수정

---

## Phase 6: Polish — 레인 D·B

- [ ] T026 [레인:D] 전체 회귀 — 001 유닛·API·E2E + 002 신규 스위트 통합 green 확인, 깨진 셀렉터 정리
- [ ] T027 [P] [레인:B] Lighthouse 성능·SEO ≥ 90 확인 — 폰트 preload·CLS 점검, sitemap/RSS/OG 산출물 재확인 (quickstart V-R)

---

## Dependencies & Execution Order

- Phase 1 → 2 (A 내부 순차, T002·T003 병렬)
- **A 머지** ⛔ 후 B(Phase 3→4 순차)·C(Phase 5)·D(테스트 작성) 병렬
- Phase 4는 Phase 3의 T009(blog.css)·T010(헤더) 이후 — 같은 레인 B라 자연 순차
- C(Phase 5)는 A 머지만 전제 — B와 완전 병렬
- **구현 병렬, 머지는 순서대로**: A → US2 → US1 → US3 → Polish

## Implementation Strategy

- **MVP = US2+US1** (P1 둘 다): 톤과 탐색이 함께 있어야 "개편"이 체감됨.
- 각 스토리 머지 전 codex-review — **US2 리뷰에서 R2(OG 폰트)·R5(TOC 패스) 재검증 필수** (plan 게이트 이월 사항).
- 루프백: 구현 버그 → 해당 레인 재작업 / 설계 문제 → plan 수정 후 재분해.
