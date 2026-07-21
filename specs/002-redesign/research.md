# Research: 002 디자인·사용감 개편 (Phase 0)

## R1. UI 부품 기반 — shadcn/ui

- **Decision**: `npx shadcn init`으로 도입, 스타일 베이스는 무채색(zinc) — B1 톤과 일치. 필요한 컴포넌트만 추가: `command`(⌘K 검색), `dialog`, `sonner`(토스트), `table`, `button`, `input`. 코드가 `components/ui/`로 복사되는 방식이라 런타임 라이브러리 종속은 Radix 프리미티브뿐.
- **통합 단계 명시 (codex 검증 반영)**: 현재 `app/globals.css`는 `@import "tailwindcss";` 한 줄뿐 — shadcn init이 요구하는 **theme 토큰 계층(@theme·CSS 변수)과 `tw-animate-css`** 를 globals.css에 추가해야 command/dialog/sonner의 유틸리티가 실제로 동작한다. 파운데이션 태스크에 "shadcn 컴포넌트 1개 렌더 스모크"를 검증 항목으로 포함.
- **Rationale**: 검색·다이얼로그·토스트가 스펙의 사용감 핵심인데 전부 검증된 부품이 있다. Tailwind v4와 공식 호환(단, 위 통합 단계 전제). 코드 소유라 베타·버전 리스크 없음.
- **Alternatives**: Astryx(기각 — R9), Radix 직접 조립(shadcn이 그 조립을 해주는 것), Headless UI(Command 부품 없음).

## R2. 폰트 self-host — 서체 통일, 파일은 포맷별 2벌 (codex 검증 반영)

- **Decision**: **웹**은 `next/font/local`로 woff2(Pretendard Variable 본문, Noto Serif KR 한글 서브셋 제목)를 로드하고 CSS 변수(`--font-sans`, `--font-serif`)로 Tailwind 토큰에 연결. **OG 이미지는 같은 서체의 TTF/OTF 서브셋을 별도 자산**(`assets/fonts/og/`)으로 두고 fs로 읽는다 — ImageResponse(Satori)가 **woff2를 지원하지 않기 때문**에 "같은 파일 공유"는 불가능하고 "같은 서체, 포맷별 파일"로 통일한다. 001의 구글 폰트 런타임 fetch 의존은 이것으로 해소.
- **Rationale**: FR-010(톤 일관)·SC-004(성능) + OG 오프라인 렌더. 파일 2벌의 drift는 "같은 서체·같은 서브셋 범위" 규칙으로 관리.
- **Alternatives**: 웹도 TTF(전송량 손해), 빌드 시 woff2→TTF 변환 스텝(도구 추가 대비 이득 없음), 구글 폰트 CDN(기각 사유 동일).

## R3. 검색 인덱스와 매칭 (codex 검증 반영 — route handler 대신 빌드 산출 모듈)

- **Decision**: `scripts/generate-search-index.ts`가 `prebuild`/`predev`에서 발행 글 전체로 `generated/search-index.json`(`{ slug, title, description, tags, excerpt(마크다운 스트립 후 앞 500자) }[]`)을 생성. SearchCommand는 **첫 열림 시점에 `await import("@/generated/search-index.json")`** — 별도 청크로 lazy load(FR-004: 초기 로딩 영향 0, 네트워크 왕복도 없음). 매칭은 `lib/search.ts` 소문자 포함 검색(제목 > 태그 > 설명 > 본문 가중).
- **Rationale**: `force-static` route segment config는 Next 16 Cache Components 도입 시 제거 대상이라 중장기 전제가 약함(codex 지적). 빌드 산출물 + dynamic import는 같은 특성을 프레임워크 의존 없이 달성. 발행 글만 포함(FR-003 — 생성기가 발행 로더만 사용). `generated/`는 gitignore.
- **Alternatives**: force-static route(기각 — 위), Fuse.js(포함 매칭으로 충분, YAGNI), pagefind/Algolia(규모 대비 과함).

## R4. ⌘K Command 다이얼로그

- **Decision**: shadcn `command`(cmdk 기반) + `(blog)/layout.tsx`에 클라이언트 컴포넌트 마운트. `keydown` 리스너로 ⌘K/Ctrl+K, 헤더 버튼으로도 오픈. 결과 선택 시 `router.push`.
- **Rationale**: cmdk가 키보드 내비·접근성·필터 UX를 검증된 형태로 제공. 어드민 화면엔 마운트하지 않음(FR-001은 공개 화면 한정 — 에디터 단축키 충돌 회피).
- **Alternatives**: 자체 모달 구현(키보드 UX 재발명), 검색 전용 페이지(사용감 체감이 목표라 다이얼로그가 우위).

## R5. 목차(TOC) — slug 생성과 추출을 같은 AST 패스에서 (codex 검증 반영)

- **Decision**: `lib/mdx-options.ts`에 `rehype-slug` + **`rehypeCollectToc(collector)`**(rehype-slug 바로 다음에 실행, id가 붙은 h2/h3의 `{ id, text, depth }` 수집 — 001의 `remarkCollectComponentNames`와 같은 컬렉터 패턴)를 추가. `lib/toc.ts`는 이 공유 파이프라인으로 본문을 1회 컴파일해 TocEntry[]를 얻는 **래퍼일 뿐, 자체 slug 알고리즘을 재현하지 않는다**. `components/blog/toc.tsx`: ≥1280px 우측 고정 + IntersectionObserver 현재 절 하이라이트, 미만 `<details>` 접이식, 비면 미렌더.
- **Rationale**: "같은 알고리즘 재현"은 단일 진실 공급원을 다시 쪼갠다(codex 지적) — 중복 제목·한글·인라인 마크업에서 id가 어긋나면 FR-008이 조용히 깨지고 기존 E2E는 못 잡는다. 같은 패스에서 수집하면 구조적으로 어긋날 수 없다.
- **Alternatives**: 별도 remark 파싱으로 재현(기각 — 위), rehype-toc(마크업 주입 — 레이아웃 제어 어려움), 클라이언트 DOM 파싱(SSR 불일치).

## R6. 파생값 일원화 — PostDerived (codex 제안 채택)

- **Decision**: 읽기시간·검색 발췌 같은 본문 파생값을 각 소비처에서 따로 계산하지 않고, `lib/content.ts`의 발행 로더가 **`PostDerived`(= PostMeta + `readingMinutes` + `excerpt`)** 를 한 곳에서 계산해 반환한다. 홈 카드·검색 인덱스 생성기·글 상세가 전부 이것을 소비. 읽기시간 = 코드펜스 제거 후 문자 수 ÷ 500자/분 올림, 최소 1분 (grilling 확정). TOC만 예외적으로 상세 렌더 시점에 공유 파이프라인(R5)에서 추출(본문 전체 필요).
- **Rationale**: 001의 "공유 파이프라인" 철학 유지 — 파생 계산이 흩어지면 drift 면적이 넓어진다(codex 지적). 테스트도 로더 1곳만 검증하면 된다.
- **Alternatives**: 소비처별 개별 계산(기각 — 위), reading-time 패키지(영어 wpm 전제 — 부적합).

## R7. B1 토큰과 콘텐츠 컴포넌트

- **Decision**: `blog.css` 재작성 — `.prose` 17px/행간 1.8/폭 42rem, 제목 `--font-serif`, 무채색 스케일(zinc). 링크는 밑줄+농도. `Callout`은 grilling 확정 예외로 톤다운 파스텔(채도 낮춘 3색) 재조정. CodeBlock 다크 배경은 무채색 계열이라 유지.
- **Rationale**: FR-010 + 예외 규칙. blog.css는 이미 프리뷰와 공유되는 구조라 수정 지점 1곳.

## R8. 어드민 부품 교체

- **Decision**: `window.confirm()` 3지점(post-row-actions의 발행취소·삭제, post-editor의 overwrite)을 shadcn Dialog로, 결과 통지를 sonner Toast로(루트 admin 레이아웃에 Toaster), 대시보드 테이블을 shadcn Table + 클라이언트 정렬(제목·발행일·조회수 토글)로 교체. API·플로우 로직은 변경 없음 — 표현 계층만.
- **Toast 범위 명시 (codex 검증 반영)**: `save-draft`·`publish`·`unpublish`·`delete`·이미지 업로드의 **성공·실패 전부** toast. 기존 인라인 상태 텍스트는 제거하되, **422 invalid-mdx의 행·열 오류 목록만 에디터 인라인 유지**(수정 위치 안내는 toast로 불가능한 정보 — toast는 요약만).
- **Rationale**: FR-012~014. "모든 액션" 요구를 구현자 해석에 맡기지 않음. 로직 무변경이라 기존 API 테스트는 그대로 유효, E2E 셀렉터만 영향.

## R9. Astryx 기각 (직전 결정 번복 기록)

- **Decision**: 도입하지 않음.
- **Rationale**: 요구가 "타이포 중심 톤 + 인터랙션 부품"으로 구체화되자, StyleX 전면 전환(기존 Tailwind 코드 재작성) 비용 대비 이득이 없음. 베타 단계 + Next 16 호환 미검증 리스크. AI-readable manifest는 매력이지만 이번 목표와 무관.
- **Alternatives considered**: 어드민만 Astryx(스타일 체계 이원화 — 기각), 전체 Astryx(위 사유로 기각).

모든 NEEDS CLARIFICATION 없음.

> 코덱스 크로스 검증 (2026-07-21): 1라운드 BLOCKED 2건(OG woff2 전제 오류, TOC slug 재현) → 문서 교정. 2라운드는 "구현 파일 부재"를 사유로 STILL-BLOCKED 판정했으나 이는 plan 단계 특성(구현은 다음 단계)이므로 **plan 게이트 실질 통과로 해석, 핑퐁 2회 컷**. 단 이 두 항목은 구현 단계 codex-review에서 코드로 재검증할 것 — R2(OG TTF/OTF 자산 존재·런타임 fetch 제거)와 R5(rehypeCollectToc 동일 패스)가 검증 포인트.
