# Research: 지니로그 블로그 MVP (Phase 0)

설계 문서에서 "plan 단계에서 선정"으로 미뤄둔 기술 선택들을 확정한다. 형식: Decision / Rationale / Alternatives.

## R1. MDX 파이프라인 (로딩·렌더·검증)

- **Decision**: 자체 경량 로더 — `gray-matter`(frontmatter 분리) + `zod`(스키마 검증) + `next-mdx-remote`의 RSC용 `compileMDX`(렌더). 렌더·커밋 전 검증·프리뷰가 **하나의 컴파일 함수**(`lib/mdx.ts`)를 공유.
- **Rationale**: SC-004(깨진 글 0건)의 핵심은 "사이트가 렌더하는 방식 그대로 저장 전에 검증"하는 것. 파이프라인이 하나여야 검증과 실제 렌더가 어긋나지 않는다. velite/contentlayer는 빌드타임 콘텐츠 컬렉션에는 좋지만 "임의 문자열을 같은 방식으로 컴파일"(에디터 검증·프리뷰)이 어렵다.
- **Alternatives**: velite(타입 안전하나 파이프라인 이원화), @next/mdx(파일 import 방식이라 어드민이 만든 문자열 처리 불가), contentlayer2(유지보수 불안정).

## R2. 에디터 프리뷰 렌더 방식

- **Decision**: 클라이언트에서 `@mdx-js/mdx`의 `evaluate`로 디바운스 컴파일 + 같은 컴포넌트 레지스트리로 렌더. 저장/발행 시에는 서버에서 R1 파이프라인으로 최종 검증(이중 안전망).
- **Rationale**: FR-002(실시간 미리보기)와 FR-005(인터랙티브 요소가 프리뷰에서 동작)를 만족하려면 프리뷰가 브라우저에서 즉시 재컴파일되어야 한다. 서버 왕복(RSC 스트리밍) 프리뷰는 지연이 크고 구현이 복잡.
- **Alternatives**: 서버 프리뷰 API(입력마다 왕복 — 체감 지연), iframe에 초안 배포(발행 지연과 동일한 문제).

## R3. 마크다운 에디터 컴포넌트

- **Decision**: CodeMirror 6 (`@uiw/react-codemirror` + markdown 언어 팩).
- **Rationale**: 가볍고 React 통합이 검증됨. 이미지 붙여넣기(paste 이벤트) 후킹이 쉬움. 위지윅이 아닌 마크다운 편집이 요구사항.
- **Alternatives**: Monaco(무겁고 마크다운 편집엔 과함), textarea(자동완성·단축키·붙여넣기 후킹이 빈약), Tiptap(위지윅 — 범위 밖 확정).

## R4. GitHub 커밋 (콘텐츠 쓰기)

- **Decision**: Octokit REST `PUT /repos/{owner}/{repo}/contents/{path}` (Contents API). 수정·이동·삭제는 기존 파일 `sha` 필수 전달. 발행(이동)은 "posts/에 create + drafts/에서 delete"를 순차 실행. 인증은 리포 권한을 최소로 준 fine-grained PAT(환경변수).
- **Rationale**: 파일 단위 조작에 가장 단순한 API. 단일 운영자라 커밋 경합이 사실상 없고, sha 불일치 시 409가 나므로 "다른 경로로 변경됨" 감지가 공짜로 됨(스펙 엣지케이스 대응).
- **Alternatives**: Git Data API로 단일 커밋 트리 조작(원자적이지만 구현 복잡 — 이동이 2커밋이어도 개인 블로그에선 무해), GitHub App(운영자 1명에겐 과함).

## R5. 조회수 집계 (Supabase)

- **Decision**: 테이블 1개 `page_views(slug, view_date, count)` + `increment_view(slug)` RPC(upsert). 클라이언트 컴포넌트에서 `navigator.sendBeacon`으로 `/api/views` POST. 서버에서 (a) Auth.js 세션 있으면 skip, (b) `isbot`(User-Agent)이면 skip 후 RPC 호출. 쓰기는 서버 route handler에서 service key로만 — 브라우저에 Supabase 키 노출 없음.
- **Rationale**: FR-010(운영자·봇 제외, 개인정보 미저장)을 서버에서 판정해야 위조·우회에 안전. sendBeacon은 페이지 이탈에도 유실이 적고 렌더를 막지 않음(fire-and-forget).
- **Alternatives**: 클라이언트에서 Supabase 직접 쓰기(키 노출 + 어드민 판별 불가), Edge middleware 집계(SSG 페이지에 미들웨어를 태우면 캐시 이점 상실).

## R6. 인증 (Auth.js v5)

- **Decision**: Auth.js v5 + GitHub provider. `signIn` 콜백에서 `profile.login === env.ADMIN_GITHUB_LOGIN`만 허용. 세션 전략은 JWT(DB 불필요). `/admin`·`/api/admin/*`는 미들웨어에서 세션 검사.
- **Rationale**: 설계 확정 사항. DB 세션이 필요 없는 단일 사용자라 JWT가 최소 구성.
- **Alternatives**: (브레인스토밍에서 기각) env 비밀번호, 로컬 전용.

## R7. SEO 산출물

- **Decision**: App Router 내장 규약 사용 — `generateMetadata`(글별 메타), `app/sitemap.ts`, `app/robots.ts`, 글별 `opengraph-image.tsx`(`next/og`의 ImageResponse로 제목 기반 자동 생성), JSON-LD는 글 상세에 `<script type="application/ld+json">`(Article) 직접 삽입, RSS는 `feed` 패키지로 route handler에서 생성.
- **Rationale**: 전부 프레임워크 내장 규약이라 별도 빌드 스텝·외부 서비스 없음. FR-012·013 전 항목 커버.
- **Alternatives**: next-sitemap 패키지(내장 sitemap.ts로 충분), 외부 OG 생성 서비스(의존 불필요).

## R8. 이미지 업로드

- **Decision**: 에디터 paste/drop → `/api/admin/images` POST(base64) → Contents API로 `public/images/{slug}/{filename}` 커밋 → 응답의 경로를 본문에 `![](/images/{slug}/...)`로 자동 삽입. 업로드 상한 4MB(Vercel 요청 바디 한도 내), 초과 시 안내.
- **Rationale**: FR-015(글과 같은 저장소에서 버전 관리) 그대로. 발행 전 초안 이미지도 같은 위치 — 초안·발행 간 경로 불변이라 이동 시 본문 수정 불필요.
- **Alternatives**: Git LFS(Vercel 빌드 복잡), 외부 스토리지(브레인스토밍에서 기각).

## R9. 테스트 도구

- **Decision**: Vitest(유닛·API 라우트), msw(GitHub API 모킹), Playwright(E2E — 인증은 세션 쿠키 주입으로 우회).
- **Rationale**: Next.js 생태 표준 조합. E2E는 스펙의 데모 시나리오(작성→초안→발행→노출)를 그대로 자동화 — 개발 프로세스 8단계에서 재사용.
- **Alternatives**: Jest(Vitest 대비 ESM/TS 마찰), Cypress(Playwright가 멀티브라우저·병렬에 유리).

모든 NEEDS CLARIFICATION 없음 — Technical Context 확정 완료.
