# UI Contracts: 002 디자인·사용감 개편 (Phase 1)

## generated/search-index.json — 빌드 산출 검색 인덱스 (codex 검증 반영: route 아님)

- 생성: `scripts/generate-search-index.ts`가 `prebuild`/`predev`에서 발행 로더(PostDerived)로 생성. `generated/`는 gitignore.
- 형식: `SearchEntry[]` (data-model §1).
- 소비자: `components/blog/search-command.tsx` — **다이얼로그 첫 오픈 시 `await import()`** 로 별도 청크 lazy load (FR-004, 네트워크 왕복 없음).
- 불변식: 초안 미포함 (생성 소스가 발행 로더 — FR-003).

## 검색 매칭 (`lib/search.ts`)

- `searchPosts(entries, query): SearchEntry[]` — 소문자 정규화 포함 매칭.
- 가중 순서: 제목 > 태그 > 설명 > 본문 발췌. 빈 query → 빈 배열(전체 노출 안 함).
- 순수 함수 — 유닛 테스트 대상 (레인 D).

## SearchCommand 동작 계약

- 열기: ⌘K / Ctrl+K / 헤더 버튼. 닫기: Esc·바깥 클릭·이동 완료.
- 결과 없음 → "결과 없음" 명시 문구. 선택(엔터/클릭) → 해당 글 이동.
- 공개 레이아웃에만 마운트 (어드민 제외 — 에디터 단축키 충돌 방지).

## TOC 계약 (codex 검증 반영)

- `getToc(body): TocEntry[]` — **mdx-options 공유 파이프라인을 실행**해 rehype-slug가 id를 부여한 직후 같은 AST 패스의 컬렉터(`rehypeCollectToc`)가 수집한 결과를 반환. **별도 slug 알고리즘 재현 금지** (앵커 일치가 구조적으로 보장되어야 함).
- `<Toc entries>`: entries 빈 배열 → null 렌더. ≥1280px 우측 고정 + 현재 절 하이라이트, 미만 접이식.

## 파생값 계약 (PostDerived)

- 발행 로더가 `PostDerived = PostMeta + { excerpt: string }`를 반환 — 홈 카드·검색 인덱스 생성기·글 상세가 공유. 파생 계산 지점은 로더 1곳뿐.
  - 변경 이력: `readingMinutes` 제거 (spec.md [C1](../spec.md#후속-변경-이력), 2026-07-27). 카드·상세의 그 자리는 조회수(`<ViewCount slug>`)가 차지하며, 조회수는 본문 파생값이 아니라 `GET /api/views`로 클라이언트에서 가져온다 — 공개 페이지의 SSG 유지 목적.
- 카드 요약: description을 **CSS 2줄 말줄임(line-clamp-2 상당)** 으로 — 카드 높이 해석 여지 없음.

## 레이아웃 계약 (C4)

- 수치의 단일 출처는 `app/(blog)/blog.css`의 CSS 변수다. 컴포넌트에 px·rem 리터럴을 다시 쓰지 않는다.
  - `--content-w` 48rem · `--gutter` 1.25rem · `--rail-w` 12rem · `--rail-gap` 2rem
  - `--rail-offset` = `--content-w / 2 + --rail-gap` — 좌/우 레일이 공유하는 중앙 기준 오프셋
- 공개 레이아웃 컨테이너 폭 = `--content-w + 2 × --gutter`. 패딩을 폭에 포함시키지 않으면 실제 본문이 `.prose`의 48rem보다 좁아진다.
- 레일 2종은 **xl(1280px) 이상에서만** 표시하고 그 미만은 숨긴다 — 필요 폭 `2 × (24 + 2 + 12) = 76rem`.
  - 좌: `<PostSidebar>` 전체 발행 글 (`nav[aria-label="전체 글"]`, 현재 글은 `aria-current="page"`)
  - 우: `<Toc>` 목차 (`nav[aria-label="목차"]`, xl 미만은 본문 상단 접이식)
  - 둘 다 `max-height` + 내부 스크롤 — 항목이 늘어도 뷰포트 밖으로 잘리지 않는다.
- 좌측 레일 데이터는 서버(`layout.tsx`)에서 읽어 정적 HTML에 포함한다. 클라이언트 경계는 현재 글 하이라이트에만 쓴다 — **공개 페이지는 SSG를 유지해야 한다**(빌드 라우트 표 `○`/`●`로 검증).
- 헤더 어드민 진입점(`<AdminLink>`)의 **정적 HTML 문구는 항상 "로그인"** 이다. 서버에서 세션을 조회하면 전 페이지가 동적이 된다. 문구 교체는 마운트 후 클라이언트가 하고, 목적지는 로그인 여부와 무관하게 `/admin`이다.

## 어드민 부품 교체 계약

- Dialog 대체 지점 3곳: 발행취소·삭제(post-row-actions), 덮어쓰기 확인(post-editor). **API 요청·응답·순서는 001 contracts/api.md 그대로** — 표현만 교체.
- Toast 범위: `save-draft`·`publish`·`unpublish`·`delete`·이미지 업로드의 **성공·실패 전부**, 실패 시 message 포함. 기존 인라인 상태 텍스트 제거. **예외: 422 invalid-mdx의 행·열 오류 목록은 에디터 인라인 유지** (toast는 요약만). Toaster는 admin 레이아웃 1곳.
- Table 정렬: 클라이언트 정렬(제목·발행일·조회수), 기본 = 발행일 내림차순. 정렬 상태는 세션 내 유지(저장 안 함).

## 회귀 계약 (FR-015)

- 001 E2E가 의존하는 접근성 셀렉터 유지 또는 D 테스트와 동시 수정: 코드 복사 버튼 `aria-label="코드 복사"`, details/summary(Collapse), 인증 플로우.
- `.prose` 클래스명 유지 (프리뷰 공유 구조 — FR-011).
