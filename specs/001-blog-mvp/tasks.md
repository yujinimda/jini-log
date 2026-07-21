# Tasks: 지니로그 — 개인 블로그 MVP

**Input**: Design documents from `/specs/001-blog-mvp/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: 포함 — 개발 프로세스상 테스트 레인(D)은 역할 역전: **코덱스가 스펙·계약을 보고 테스트 작성, 클코가 통과시킴**.

**Organization**: 유저 스토리별 페이즈 + 오르카 레인 배정. 태스크 설명 앞의 `[레인:X]`가 담당 레인.

## 오르카 레인 및 공유 파일 소유권

| 레인 | 담당 | 소유 파일(다른 레인은 참조만) |
| --- | --- | --- |
| **A (foundation)** | Phase 1~2 전체 | `lib/types.ts`, `lib/content-schema.ts`, `lib/mdx-options.ts`, `lib/mdx.ts`, `lib/content.ts`, `lib/views.ts`, `lib/auth.ts`, `middleware.ts`, `components/mdx/**` (레지스트리+기본 컴포넌트) |
| **B (blog)** | 공개 페이지 + SEO (US2, US3) | `app/(blog)/**`, `app/sitemap.ts`, `app/robots.ts`, `app/opengraph-image.tsx`, `components/blog/**`, `app/api/views/**` |
| **C (admin)** | 에디터·발행·대시보드 (US1, US4) | `app/admin/**`, `app/api/admin/**`, `components/admin/**`, `lib/github.ts`, `lib/deploy.ts` |
| **D (test)** | 전 스토리 테스트 (코덱스 작성 → 클코 통과) | `tests/**` |

**공유 지점 규칙**: `lib/`·`components/mdx/`의 공유 파일 변경이 필요하면 B·C 레인은 직접 수정하지 않고 A 레인에 요청. A 머지 후 B·C는 최신 main 기준 rebase.

**머지 순서**: `A → B → C → D` (각 머지마다 최신 main rebase 후 테스트 재확인 — 프로세스 8단계)
- A 먼저: 모든 레인의 전제.
- B가 C보다 먼저: C의 발행 E2E가 공개 페이지 노출 확인을 필요로 함.
- D 마지막: 통합 상태에서 전체 스위트 통과 확인.

---

## Phase 1: Setup (Shared Infrastructure) — 레인 A

**Purpose**: 프로젝트 초기화와 기본 구조

- [ ] T001 [레인:A] Next.js(App Router)+TypeScript(strict)+Tailwind v4 스캐폴드 및 plan.md 구조대로 폴더 생성 — `app/(blog)/`, `app/admin/`, `app/api/`, `content/posts/`, `content/drafts/`, `components/mdx/`, `components/blog/`, `components/admin/`, `lib/`, `tests/`
- [ ] T002 [P] [레인:A] ESLint+Prettier 설정 및 `package.json` scripts(`lint`, `build`, `test`, `test:e2e`) 정리
- [ ] T003 [P] [레인:A] Vitest+msw 설정 — `vitest.config.ts`, `tests/unit/`, `tests/api/`, GitHub API 모킹 핸들러 뼈대 `tests/mocks/github.ts`
- [ ] T004 [P] [레인:A] Playwright 설정 — `playwright.config.ts`, `tests/e2e/`, 인증 우회용 세션 주입 헬퍼 `tests/e2e/helpers/auth.ts`
- [ ] T005 [P] [레인:A] `.env.example` 작성 — data-model.md §5의 전체 환경변수 + 주석
- [ ] T006 [P] [레인:A] Supabase 마이그레이션 `supabase/migrations/001_page_views.sql` — `page_views` 테이블, `increment_view` RPC, anon 쓰기 차단 RLS
- [ ] T007 [P] [레인:A] 검증용 샘플 콘텐츠 — `content/posts/hello-world.mdx`(전 기본 컴포넌트 사용), `content/drafts/sample-draft.mdx`

---

## Phase 2: Foundational (Blocking Prerequisites) — 레인 A

**Purpose**: 모든 유저 스토리가 의존하는 공유 코어. **⚠️ 이 페이즈 완료(머지) 전에 B·C 레인 스토리 작업 시작 금지**

- [ ] T008 [레인:A] `lib/types.ts` — contracts/api.md 기준 공용 타입(PostMeta, InvalidDraft, API 요청/응답, 에러 형식)
- [ ] T009 [레인:A] `lib/content-schema.ts` — frontmatter zod 스키마(data-model.md §1)와 slug 정규식 `^[a-z0-9]+(-[a-z0-9]+)*$` 검증 함수
- [ ] T010 [레인:A] `lib/mdx-options.ts` — 컴파일 설정 단일 진실 공급원(동형): remark/rehype 플러그인 목록, import/export 금지 AST 검사, 레지스트리 참조 (research R1)
- [ ] T011 [레인:A] `lib/mdx.ts` — compileMDX 래퍼(렌더·검증 공용), 미등록 컴포넌트·문법 위반 시 위치 포함 오류 반환 (T010 의존)
- [ ] T012 [레인:A] `lib/content.ts` — posts/drafts 파일 로딩·파싱·목록 생성, invalid 초안은 오류 정보와 함께 반환 (T009 의존)
- [ ] T013 [레인:A] `components/mdx/registry.ts` + 기본 컴포넌트 3종 — `CodeBlock`(하이라이트+복사 버튼), `Callout`, `Collapse`
- [ ] T014 [레인:A] `lib/auth.ts` + `middleware.ts` — Auth.js v5 GitHub provider, `ADMIN_GITHUB_LOGIN` 단일 계정 허용(signIn 콜백), `/admin`·`/api/admin/*` 보호, `app/api/auth/[...nextauth]/route.ts`
- [ ] T015 [P] [레인:A] `lib/views.ts` — Supabase 서버 클라이언트(service key), increment 호출·slug별 합계·일자별 추이 조회 함수

**Checkpoint**: 레인 A 머지 → B·C 레인 병렬 시작 가능

---

## Phase 3: User Story 1 - 운영자가 블로그에서 직접 글을 작성·발행한다 (P1) 🎯 MVP — 레인 C

**Goal**: 어드민에서 마크다운 작성 → 프리뷰 → 초안 저장/발행이 GitHub 커밋으로 동작

**Independent Test**: quickstart V1·V2·V6·V8 — 작성→발행→공개 노출, 검증 거부, 유실 방지, 배포 상태

- [ ] T016 [레인:C] [US1] `lib/github.ts` — Contents API 단건 읽기/쓰기(sha 처리) + Git Data API 원자 이동(publish/unpublish 단일 커밋), 커밋 메시지 규약 `content: {action} {slug}` (research R4)
- [ ] T017 [P] [레인:C] [US1] `lib/deploy.ts` — Vercel Deployments API에서 commitSha로 배포 상태 조회 (research R10)
- [ ] T018 [레인:C] [US1] `app/api/admin/validate/route.ts` — 저장 없이 frontmatter+MDX 검증, 저장 API와 판정 로직 공유 (contracts 기준)
- [ ] T019 [레인:C] [US1] `app/api/admin/posts/route.ts`(GET 목록) + `app/api/admin/posts/[slug]/route.ts`(GET 단건, GitHub 최신본+sha 반환)
- [ ] T020 [레인:C] [US1] `app/api/admin/posts/route.ts` POST — 액션 4종(save-draft/publish/unpublish/delete), contracts의 검증 순서 6단계(slug-immutable, invalid-mdx 422, slug-exists/stale-sha 409), 응답에 commitSha (T016·T018 의존)
- [ ] T021 [P] [레인:C] [US1] `app/api/admin/images/route.ts` — base64 업로드, 매직 바이트 검증(SVG 제외), 4MB 상한, 파일명 충돌 접미사 (research R8)
- [ ] T022 [P] [레인:C] [US1] `app/api/admin/deploy-status/route.ts` — `?sha=` 폴링 (T017 의존)
- [ ] T023 [레인:C] [US1] 에디터 페이지 `app/admin/write/page.tsx` + `components/admin/editor/` — CodeMirror 6 마크다운 입력, frontmatter 폼 필드(제목·요약·태그·slug), 발행된 글은 slug 필드 잠금
- [ ] T024 [레인:C] [US1] 클라이언트 프리뷰 `components/admin/editor/preview.tsx` — @mdx-js/mdx evaluate + `lib/mdx-options.ts` 공유 + 레지스트리 렌더, 디바운스 서버 검증(`/api/admin/validate`) 결과 표시 (research R2)
- [ ] T025 [P] [레인:C] [US1] 작성 중 localStorage 자동 백업·복원 — 저장 실패·새로고침 후 복원 (FR-007)
- [ ] T026 [레인:C] [US1] 이미지 붙여넣기/드래그 → 업로드 API 호출 → 본문에 `![](path)` 자동 삽입 (T021·T023 의존)
- [ ] T027 [레인:C] [US1] 저장/발행 플로우 UI — 초안 저장·발행 버튼, 오류 위치 표시(422), 덮어쓰기 확인(409 slug-exists), 재로드 유도(409 stale-sha), 발행 후 배포 상태 폴링 표시("반영 중→완료/실패") (T020·T022 의존)
- [ ] T028 [레인:D] [US1] 테스트(코덱스 작성→클코 통과) — 유닛: slug 규칙·frontmatter 스키마·MDX 검증(import 금지 포함) `tests/unit/`; API: posts 액션 4종·검증 순서·원자 이동·images·validate (msw) `tests/api/`

**Checkpoint**: US1 단독으로 quickstart V1·V2 검증 가능

---

## Phase 4: User Story 2 - 독자가 글을 읽고 인터랙티브 요소를 조작한다 (P1) — 레인 B

**Goal**: 공개 블로그에서 글 탐색·열람, 인터랙티브 컴포넌트 동작

**Independent Test**: quickstart V3 — 샘플 발행 글로 열람·조작·복사 확인

- [ ] T029 [레인:B] [US2] 글 상세 `app/(blog)/posts/[slug]/page.tsx` — generateStaticParams(SSG), lib/content+lib/mdx로 렌더, 레지스트리 컴포넌트 동작
- [ ] T030 [P] [레인:B] [US2] 홈(글 목록) `app/(blog)/page.tsx` — 최신순, 태그 표시
- [ ] T031 [P] [레인:B] [US2] 태그 목록 `app/(blog)/tags/[tag]/page.tsx` — SSG
- [ ] T032 [레인:B] [US2] 블로그 공통 레이아웃·스타일 `app/(blog)/layout.tsx` + `components/blog/` — 반응형(데스크톱·모바일)
- [ ] T033 [레인:B] [US2] 조회 비콘 — `app/api/views/route.ts` POST(운영자 세션 제외·isbot 제외·발행 slug 검증·항상 204) + 클라이언트 비콘 컴포넌트(sendBeacon, sessionStorage 중복 가드) (research R5)
- [ ] T034 [레인:D] [US2] 테스트(코덱스 작성→클코 통과) — E2E: 홈→글 이동, 인터랙티브 조작 반응, 코드 복사 `tests/e2e/reader.spec.ts`; API: views 제외 로직(세션/봇/미발행 slug) `tests/api/views.test.ts`

**Checkpoint**: US1+US2 = MVP 데모 가능 (작성→발행→열람 루프 완성)

---

## Phase 5: User Story 3 - 검색엔진이 글을 수집·노출한다 (P2) — 레인 B

**Goal**: 메타데이터·사이트맵·피드·OG 이미지 자동화

**Independent Test**: quickstart V4 — 페이지 소스·경로 응답·Lighthouse

- [ ] T035 [레인:B] [US3] `generateMetadata` — 글별(제목·요약·OG·canonical, `SITE_URL` 기반)·홈·태그 페이지
- [ ] T036 [P] [레인:B] [US3] OG 이미지 — `app/(blog)/posts/[slug]/opengraph-image.tsx`(제목 기반 ImageResponse) + `app/opengraph-image.tsx`(사이트 기본)
- [ ] T037 [P] [레인:B] [US3] `app/sitemap.ts` + `app/robots.ts` — 발행 글 전체 반영
- [ ] T038 [P] [레인:B] [US3] RSS `app/(blog)/feed.xml/route.ts` — feed 패키지, 발행 글 반영
- [ ] T039 [레인:B] [US3] JSON-LD(Article) 글 상세에 삽입 (T029 의존)
- [ ] T040 [레인:D] [US3] 테스트(코덱스 작성→클코 통과) — E2E: 메타태그·JSON-LD 존재, sitemap/robots/feed 유효 응답, OG 이미지 200 `tests/e2e/seo.spec.ts`

---

## Phase 6: User Story 4 - 운영자가 대시보드에서 글과 조회수를 관리한다 (P3) — 레인 C

**Goal**: 발행/초안 목록·조회수 추이·발행취소/삭제

**Independent Test**: quickstart V5·V6·V7

- [ ] T041 [레인:C] [US4] 대시보드 `app/admin/page.tsx` + `components/admin/dashboard/` — 발행/초안 구분 목록(GitHub 최신본), invalid 초안 오류 표시, 글별 조회수·최근 발행일 (FR-011·014)
- [ ] T042 [레인:C] [US4] 발행취소·삭제 UI — 확인 다이얼로그, POST /api/admin/posts 액션 연결 (T041 의존)
- [ ] T043 [P] [레인:C] [US4] 조회수 기간별 추이 표시 — lib/views.ts 추이 쿼리 + 대시보드 차트/표
- [ ] T044 [레인:D] [US4] 테스트(코덱스 작성→클코 통과) — API: 목록(invalid 포함)·발행취소·삭제 `tests/api/dashboard.test.ts`; E2E: 운영자 조회 제외(로그인 반복 조회 후 수치 불변) `tests/e2e/views.spec.ts`

---

## Phase 7: Polish & Cross-Cutting — 레인 D 중심

- [ ] T045 [레인:D] quickstart V1~V8 중 자동화 가능 시나리오 E2E 통합 스위트(코덱스 작성→클코 통과) — `tests/e2e/demo.spec.ts` (V8 배포 상태는 모킹, 실배포 확인은 수동)
- [ ] T046 [P] [레인:A] 접근성·성능 마무리 — 시맨틱 마크업 점검, 이미지 lazy, Lighthouse SEO ≥ 90 확인
- [ ] T047 [P] [레인:A] README — 셋업 절차(quickstart 요약), 환경변수, Supabase/GitHub/Vercel 설정 가이드

---

## Dependencies & Execution Order

- **Phase 1 → Phase 2** (레인 A 내부 순차, T002~T007은 병렬 가능)
- **Phase 2 완료(A 머지)** ⛔ 이후 Phase 3(레인 C)·Phase 4~5(레인 B) 병렬 시작
- Phase 5(SEO)는 Phase 4의 T029(글 상세) 이후
- Phase 6(대시보드)은 Phase 3의 T019·T020(admin API) 이후 — 같은 레인 C라 자연 순차
- 레인 D는 각 스토리의 계약(contracts/api.md)·스펙만으로 테스트 작성 시작 가능(구현과 병렬), 통과 확인은 해당 구현 후
- **스토리 완료 순서**: US1·US2(P1, 병렬) → US3(P2) → US4(P3)

## Parallel Example

레인 A 머지 직후:
```
레인 B: T029 T030 T031 (서로 [P]) → T032 T033
레인 C: T016 T017 T018 → T019 T020 (T021 T022 병렬) → T023~T027
레인 D: T028 T034 테스트 작성 시작 (계약 기반, 구현과 병렬)
```

## Implementation Strategy

- **MVP = US1 + US2** (둘 다 P1): 작성→발행→열람 루프가 닫혀야 블로그로 성립. Phase 4 Checkpoint에서 첫 데모.
- 이후 US3(SEO)·US4(대시보드) 순차 증분. 각 스토리 머지마다 프로세스 6단계 `/codex-review` (소규모·저위험 태스크는 스킵 가능).
- 루프백: 구현 버그 → 해당 레인 재작업 / 설계 문제 → plan.md 수정 후 이 문서 재분해.
