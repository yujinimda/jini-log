# Research: 002 디자인·사용감 개편 (Phase 0)

## R1. UI 부품 기반 — shadcn/ui

- **Decision**: `npx shadcn init`으로 도입, 스타일 베이스는 무채색(zinc) — B1 톤과 일치. 필요한 컴포넌트만 추가: `command`(⌘K 검색), `dialog`, `sonner`(토스트), `table`, `button`, `input`. 코드가 `components/ui/`로 복사되는 방식이라 런타임 라이브러리 종속은 Radix 프리미티브뿐.
- **Rationale**: 검색·다이얼로그·토스트가 스펙의 사용감 핵심인데 전부 검증된 부품이 있다. Tailwind v4와 공식 호환. 코드 소유라 베타·버전 리스크 없음.
- **Alternatives**: Astryx(기각 — R9), Radix 직접 조립(shadcn이 그 조립을 해주는 것), Headless UI(Command 부품 없음).

## R2. 폰트 self-host

- **Decision**: `next/font/local` — `public/fonts/`가 아닌 앱 내 폰트 파일로 Pretendard Variable(본문)과 Noto Serif KR Variable(제목, 한글 서브셋 woff2)을 로드. CSS 변수(`--font-sans`, `--font-serif`)로 Tailwind 토큰에 연결. **OG 이미지도 같은 로컬 파일을 fs로 읽어 사용** — 001의 구글 폰트 런타임 fetch 의존(네트워크 실패 시 한글 폴백 깨짐)을 함께 해소.
- **Rationale**: FR-010(톤 일관)과 SC-004(성능) 동시 충족 — next/font는 셀프호스트+preload+FOUT 방지를 자동 처리.
- **Alternatives**: 구글 폰트 CDN(런타임 의존·성능 저하), @fontsource(next/font가 Next에선 표준).

## R3. 검색 인덱스와 매칭

- **Decision**: `app/(blog)/search-index.json/route.ts`를 `force-static`으로 — 빌드 시 발행 글 전체에서 `{ slug, title, description, tags, excerpt(본문 마크다운 스트립 후 앞 500자) }` 배열 생성, 정적 파일로 서빙. 클라이언트 SearchCommand가 **첫 열림 시점에 lazy fetch + 메모리 캐시**(FR-004: 초기 로딩 영향 0). 매칭은 `lib/search.ts`의 소문자 포함 검색(제목 > 태그 > 설명 > 본문 순 가중 정렬).
- **Rationale**: 서버·DB 없음(FR-004), 발행 글만 포함(FR-003 — drafts는 로더가 아예 안 읽음). 수백 글 × ~700B ≈ 수백 KB 이내, lazy라 무해.
- **Alternatives**: Fuse.js(퍼지 — 스펙이 포함 매칭으로 한정, YAGNI), Algolia/pagefind(외부 서비스·빌드 스텝 추가 — 규모 대비 과함).

## R4. ⌘K Command 다이얼로그

- **Decision**: shadcn `command`(cmdk 기반) + `(blog)/layout.tsx`에 클라이언트 컴포넌트 마운트. `keydown` 리스너로 ⌘K/Ctrl+K, 헤더 버튼으로도 오픈. 결과 선택 시 `router.push`.
- **Rationale**: cmdk가 키보드 내비·접근성·필터 UX를 검증된 형태로 제공. 어드민 화면엔 마운트하지 않음(FR-001은 공개 화면 한정 — 에디터 단축키 충돌 회피).
- **Alternatives**: 자체 모달 구현(키보드 UX 재발명), 검색 전용 페이지(사용감 체감이 목표라 다이얼로그가 우위).

## R5. 목차(TOC)

- **Decision**: `lib/mdx-options.ts`에 `rehype-slug` 추가 — 제목에 앵커 id가 렌더·프리뷰·검증 모두에서 동일하게 붙는다(001 단일 진실 공급원 구조 준수). `lib/toc.ts`가 본문에서 h2/h3을 추출(remark 파싱 — mdx-options의 remark 플러그인 공유)해 `{ id, text, depth }[]` 생성. `components/blog/toc.tsx`: 데스크톱(≥1280px) 본문 우측 고정 + IntersectionObserver로 현재 절 하이라이트, 미만은 본문 상단 `<details>` 접이식. h2/h3 없으면 렌더 안 함.
- **Rationale**: 앵커 id 생성을 파이프라인에 넣어야 프리뷰·발행 링크가 일치(FR-011). IntersectionObserver는 스크롤 리스너보다 저비용.
- **Alternatives**: rehype-toc(마크업 주입 방식 — 레이아웃 제어 어려움), 클라이언트에서 DOM 파싱(SSR 불일치 위험).

## R6. 읽기시간

- **Decision**: `lib/reading-time.ts` — 본문에서 코드펜스·frontmatter 제거 후 문자 수 ÷ 500자/분, 올림, 최소 1분 (grilling 확정). 빌드 시 목록 로더에서 계산해 카드에 전달.
- **Rationale**: 한글은 단어 수(wpm) 기준이 부정확. 문자/분이 표준적 대안.
- **Alternatives**: reading-time 패키지(영어 wpm 전제 — 부적합).

## R7. B1 토큰과 콘텐츠 컴포넌트

- **Decision**: `blog.css` 재작성 — `.prose` 17px/행간 1.8/폭 42rem, 제목 `--font-serif`, 무채색 스케일(zinc). 링크는 밑줄+농도. `Callout`은 grilling 확정 예외로 톤다운 파스텔(채도 낮춘 3색) 재조정. CodeBlock 다크 배경은 무채색 계열이라 유지.
- **Rationale**: FR-010 + 예외 규칙. blog.css는 이미 프리뷰와 공유되는 구조라 수정 지점 1곳.

## R8. 어드민 부품 교체

- **Decision**: `window.confirm()` 3지점(post-row-actions의 발행취소·삭제, post-editor의 overwrite)을 shadcn Dialog로, 결과 통지를 sonner Toast로(루트 admin 레이아웃에 Toaster), 대시보드 테이블을 shadcn Table + 클라이언트 정렬(제목·발행일·조회수 토글)로 교체. API·플로우 로직은 변경 없음 — 표현 계층만.
- **Rationale**: FR-012~014. 로직 무변경이라 기존 API 테스트는 그대로 유효, E2E 셀렉터만 영향.

## R9. Astryx 기각 (직전 결정 번복 기록)

- **Decision**: 도입하지 않음.
- **Rationale**: 요구가 "타이포 중심 톤 + 인터랙션 부품"으로 구체화되자, StyleX 전면 전환(기존 Tailwind 코드 재작성) 비용 대비 이득이 없음. 베타 단계 + Next 16 호환 미검증 리스크. AI-readable manifest는 매력이지만 이번 목표와 무관.
- **Alternatives considered**: 어드민만 Astryx(스타일 체계 이원화 — 기각), 전체 Astryx(위 사유로 기각).

모든 NEEDS CLARIFICATION 없음.
