# Research: 지니로그 블로그 MVP (Phase 0)

설계 문서에서 "plan 단계에서 선정"으로 미뤄둔 기술 선택들을 확정한다. 형식: Decision / Rationale / Alternatives.

## R1. MDX 파이프라인 (로딩·렌더·검증)

- **Decision**: 자체 경량 로더 — `gray-matter`(frontmatter 분리) + `zod`(스키마 검증) + `next-mdx-remote`의 RSC용 `compileMDX`(렌더). **컴파일 설정의 단일 진실 공급원**은 `lib/mdx-options.ts`(동형 모듈): remark/rehype 플러그인 목록, 컴포넌트 레지스트리 참조, 문법 정책을 여기서만 정의하고 서버 렌더·서버 검증·클라이언트 프리뷰가 전부 import한다.
- **문법 정책 (실행 경계)**: 본문 내 `import`/`export` 구문 금지 — 컴파일 후 AST 검사로 발견 시 검증 실패(422). 사용 가능한 컴포넌트는 레지스트리 주입만 허용, 미등록 컴포넌트 참조는 검증 실패. 외부 도구가 주입한 초안도 같은 정책으로 검증된다.
- **Rationale**: SC-004(깨진 글 0건)의 핵심은 "사이트가 렌더하는 방식 그대로 저장 전에 검증"하는 것. 컴파일 옵션이 한 모듈에서만 나오면 렌더·검증·프리뷰가 어긋날 수 없다. import 금지는 임의 코드 실행 입구를 막는 최소 정책(코덱스 리뷰 반영).
- **Alternatives**: velite(타입 안전하나 파이프라인 이원화), @next/mdx(파일 import 방식이라 어드민이 만든 문자열 처리 불가), contentlayer2(유지보수 불안정).

## R2. 에디터 프리뷰 렌더 방식

- **Decision**: 클라이언트에서 `@mdx-js/mdx`의 `evaluate`로 디바운스 컴파일하되 **R1의 `lib/mdx-options.ts`와 동일한 플러그인·레지스트리·문법 정책을 사용**. 동시에 입력 디바운스마다 서버 검증 API(`POST /api/admin/validate`)를 호출해 R1 파이프라인의 판정을 에디터에 표시. 저장/발행 시 서버 검증이 **최종 권위** — 프리뷰가 통과해도 서버가 거부하면 커밋되지 않는다.
- **동일성 검증**: 샘플 글(전 컴포넌트 사용)에 대해 "프리뷰 렌더 = 발행 렌더" 스냅샷 비교를 E2E 테스트로 상시 검증 (quickstart V2에 포함).
- **Rationale**: FR-002(실시간 미리보기)·FR-005(인터랙티브 동작)는 브라우저 즉시 컴파일이 필요하고, SC-004는 서버 판정이 책임진다. 클라이언트/서버 컴파일러가 물리적으로 다르므로 "옵션 공유 + 서버 최종 판정 + 동일성 E2E"의 3중 장치로 어긋남을 구조적으로 차단(코덱스 리뷰 반영 — 프리뷰 동일성 모순 해소).
- **Alternatives**: 서버 왕복 프리뷰(입력마다 RSC 렌더 — 체감 지연), iframe에 초안 배포(발행 지연과 동일한 문제).

## R3. 마크다운 에디터 컴포넌트

- **Decision**: CodeMirror 6 (`@uiw/react-codemirror` + markdown 언어 팩).
- **Rationale**: 가볍고 React 통합이 검증됨. 이미지 붙여넣기(paste 이벤트) 후킹이 쉬움. 위지윅이 아닌 마크다운 편집이 요구사항.
- **Alternatives**: Monaco(무겁고 마크다운 편집엔 과함), textarea(자동완성·단축키·붙여넣기 후킹이 빈약), Tiptap(위지윅 — 범위 밖 확정).

## R4. GitHub 커밋 (콘텐츠 쓰기)

- **Decision**: 단일 파일 생성·수정은 Octokit REST Contents API(`PUT .../contents/{path}`, 수정 시 `sha` 필수). **두 파일이 함께 바뀌는 상태 전이(발행·발행취소, 이미지 동반 저장)는 Git Data API로 단일 커밋**(createTree → createCommit → updateRef)으로 원자 실행. 인증은 리포 권한을 최소로 준 fine-grained PAT(환경변수).
- **커밋 규약**: 메시지 `content: {action} {slug}` (예: `content: publish query-state-boundary`), author를 운영자 GitHub 계정으로 설정 — FR-009의 "누가·언제·무엇"이 이력에서 기계적으로 검증 가능(코덱스 리뷰 반영).
- **Rationale**: "생성 후 삭제" 순차 2커밋은 중간 실패 시 같은 글이 초안·발행 양쪽에 존재하는 반쪽 상태를 만든다. 공개 노출 상태가 요구사항(FR-004/017)인 이상 이동은 원자적이어야 한다(코덱스 리뷰 BLOCKED 반영). sha 불일치 409로 "다른 경로 변경" 감지는 기존대로.
- **Alternatives**: Contents API 순차 2커밋 + 보상 트랜잭션(복구 로직이 Git Data API 직행보다 오히려 복잡), GitHub App(운영자 1명에겐 과함).

## R5. 조회수 집계 (Supabase)

- **Decision**: 테이블 1개 `page_views(slug, view_date, count)` + `increment_view(slug)` RPC(upsert). 클라이언트 컴포넌트에서 `navigator.sendBeacon`으로 `/api/views` POST. **중복 가드**: "페이지로드당 1회"의 클라이언트 기준은 sessionStorage의 slug별 플래그 — 같은 브라우저 세션 내 재방문·클라이언트 내비게이션 왕복·bfcache 복원은 재카운트하지 않는다(코덱스 리뷰 반영, 개인정보 저장 없음 유지). 서버에서 (a) Auth.js 세션 있으면 skip, (b) `isbot`(User-Agent)이면 skip 후 RPC 호출. 쓰기는 서버 route handler에서 service key로만 — 브라우저에 Supabase 키 노출 없음.
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

- **Decision**: 에디터 paste/drop → `/api/admin/images` POST(base64) → Contents API로 `public/images/{slug}/{filename}` 커밋 → 응답의 경로를 본문에 `![](/images/{slug}/...)`로 자동 삽입. 업로드 상한 4MB(Vercel 요청 바디 한도 내), 초과 시 안내. **허용 형식은 png/jpg/jpeg/gif/webp — SVG 제외**(스크립트 실행·외부 참조 리스크, 코덱스 리뷰 반영). 매직 바이트로 실제 형식 검증.
- **Rationale**: FR-015(글과 같은 저장소에서 버전 관리) 그대로. 발행 전 초안 이미지도 같은 위치 — 초안·발행 간 경로 불변이라 이동 시 본문 수정 불필요. slug는 최초 저장 시 확정·불변(R-slug)이므로 orphan 이미지는 "글 삭제 후 잔존" 케이스뿐 — MVP에서는 허용하고 정리는 수동(레포 안이라 눈에 보임).
- **Alternatives**: Git LFS(Vercel 빌드 복잡), 외부 스토리지(브레인스토밍에서 기각), SVG sanitize 후 허용(MVP 이후 필요 시).

## R9. 테스트 도구

- **Decision**: Vitest(유닛·API 라우트), msw(GitHub API 모킹), Playwright(E2E — 인증은 세션 쿠키 주입으로 우회).
- **Rationale**: Next.js 생태 표준 조합. E2E는 스펙의 데모 시나리오(작성→초안→발행→노출)를 그대로 자동화 — 개발 프로세스 8단계에서 재사용.
- **Alternatives**: Jest(Vitest 대비 ESM/TS 마찰), Cypress(Playwright가 멀티브라우저·병렬에 유리).

## R10. 배포 상태 추적 (코덱스 리뷰 BLOCKED 반영)

- **Decision**: 발행류 액션의 응답에 `commitSha`를 포함하고, 어드민이 `GET /api/admin/deploy-status?sha=`를 폴링. 서버는 Vercel Deployments REST API에서 해당 SHA의 배포를 조회해 `building | ready | error | not-found`를 반환. 에디터·대시보드는 "반영 중 → 반영 완료 / 배포 실패"를 표시.
- **Rationale**: GitHub 커밋 성공 ≠ 공개 반영. 스펙 엣지케이스("반영 대기 상태 안내")와 SC-001(5분 내 확인)을 구현하려면 배포 사건을 관측할 수단이 필요하다. 폴링은 webhook 대비 인프라 추가가 없고 단일 운영자 규모에 충분.
- **Alternatives**: Vercel webhook + 상태 테이블(수신 엔드포인트·저장소 추가 — 과함), 미추적(스펙 엣지케이스 미충족 — 기각).

모든 NEEDS CLARIFICATION 없음 — Technical Context 확정 완료.

> 코덱스 크로스 검증 1라운드(2026-07-21): BLOCKED 3건 → R1/R2(파이프라인 동일성), R4(원자적 이동), R10(배포 추적)으로 해소. 경고 중 slug 서버 강제·SVG 제외·조회 중복 가드·OG 라우트 위치·커밋 규약 반영. 배포 실패 케이스는 quickstart V8 추가.
