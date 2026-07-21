# UI Contracts: 002 디자인·사용감 개편 (Phase 1)

## GET /search-index.json — 정적 검색 인덱스 (빌드 산출물)

- 응답: `SearchEntry[]` (data-model §1). `force-static` — 빌드 시 확정, CDN 캐시.
- 소비자: `components/blog/search-command.tsx` — **다이얼로그 첫 오픈 시에만 fetch**, 메모리 캐시 (FR-004).
- 불변식: 초안 미포함 (생성 소스가 발행 로더 — FR-003).

## 검색 매칭 (`lib/search.ts`)

- `searchPosts(entries, query): SearchEntry[]` — 소문자 정규화 포함 매칭.
- 가중 순서: 제목 > 태그 > 설명 > 본문 발췌. 빈 query → 빈 배열(전체 노출 안 함).
- 순수 함수 — 유닛 테스트 대상 (레인 D).

## SearchCommand 동작 계약

- 열기: ⌘K / Ctrl+K / 헤더 버튼. 닫기: Esc·바깥 클릭·이동 완료.
- 결과 없음 → "결과 없음" 명시 문구. 선택(엔터/클릭) → 해당 글 이동.
- 공개 레이아웃에만 마운트 (어드민 제외 — 에디터 단축키 충돌 방지).

## TOC 계약

- `getToc(body): TocEntry[]` — mdx-options 파이프라인과 같은 remark 파싱, rehype-slug와 같은 id 알고리즘 (앵커 일치 불변식).
- `<Toc entries>`: entries 빈 배열 → null 렌더. ≥1280px 우측 고정 + 현재 절 하이라이트, 미만 접이식.

## 어드민 부품 교체 계약

- Dialog 대체 지점 3곳: 발행취소·삭제(post-row-actions), 덮어쓰기 확인(post-editor). **API 요청·응답·순서는 001 contracts/api.md 그대로** — 표현만 교체.
- Toast: 모든 어드민 액션의 성공/실패, 실패 시 message 노출. Toaster는 admin 레이아웃 1곳.
- Table 정렬: 클라이언트 정렬(제목·발행일·조회수), 기본 = 발행일 내림차순. 정렬 상태는 세션 내 유지(저장 안 함).

## 회귀 계약 (FR-015)

- 001 E2E가 의존하는 접근성 셀렉터 유지 또는 D 테스트와 동시 수정: 코드 복사 버튼 `aria-label="코드 복사"`, details/summary(Collapse), 인증 플로우.
- `.prose` 클래스명 유지 (프리뷰 공유 구조 — FR-011).
