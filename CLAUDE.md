# 지니로그 (jini-log)

만지면서 이해하는 기술 블로그. **운영자 1인**용 — 어드민에서 글을 쓰면 GitHub에 커밋되고 Vercel이 재배포한다.

- 프로덕션: **https://jinilog.dev** (Cloudflare 등록 · Vercel 호스팅)
- 스택: Next 16 App Router · Tailwind v4 · MDX · Supabase(조회수) · Auth.js v5(GitHub OAuth)
- 공개 페이지는 **전부 SSG**. 이 정적성을 잃지 않는 것이 최우선 제약이다.

## 작업 규칙

1. **main에서 직접 작업하지 않는다.** 브랜치 → PR → 머지.
2. **게이트 전부 통과해야 PR을 올린다.** 하나라도 빨간 채로 올리지 않는다.
   ```
   pnpm test          # vitest
   pnpm lint          # eslint
   npx tsc --noEmit
   pnpm build         # 공개 페이지가 ○/● (Static/SSG)로 유지되는지 라우트 표 확인
   npx playwright test
   ```
3. **푸시 전 gh 계정 확인** — 외부 프로세스가 `yujinebrain`으로 되돌린다.
   ```
   gh auth switch --user yujinimda
   ```
4. **로컬 dev 포트는 3100** (3000은 사용자의 다른 작업이 쓴다).
5. 작업 단락이 끝나면 **메모리(`jini-log-status.md`)를 갱신**한다. 새 세션이 그걸 읽고 이어간다.

## 스펙 변경 규칙

배포 완료된 스펙은 **소급 수정하지 않는다.** `specs/002-redesign/spec.md`의 `## 후속 변경 이력`에 **C 번호**로 누적하고(C1, C2 …), 원문에는 취소선 + 각주만 단다. 살아있는 계약(`contracts/ui.md`, `data-model.md`, `quickstart.md`)은 갱신한다.

## 단일 출처 (여기 아니면 고치지 말 것)

| 파일 | 무엇의 단일 출처 |
|---|---|
| `lib/mdx-options.ts` | remark/rehype 플러그인 — **렌더·서버검증·에디터 프리뷰가 공유.** 여기 없는 걸 다른 데서 덧붙이면 "프리뷰 = 발행"이 깨진다 |
| `components/mdx/registry.ts` | 본문에서 쓸 수 있는 MDX 컴포넌트 |
| `components/blog/site.ts` | `siteName()` · `siteUrl()` · `SITE_DESCRIPTION` — 이름·주소를 다른 곳에 하드코딩하면 검색결과와 SNS 브랜드가 갈린다 |
| `app/(blog)/blog.css` `:root` | 레이아웃 토큰 `--content-w`(48rem) · `--gutter` · `--rail-w` · `--rail-gap` · `--rail-offset`. 목차·좌측 레일 위치가 여기서 파생된다 |
| `app/api/admin/_lib/validate-post.ts` | 저장·발행 검증. `mode: "draft"`는 형식만 강제(미완성 초안 저장 허용), `"publish"`는 제목·요약 필수 |

## 도메인에 특화된 판단들

- **조회 기록은 `VERCEL_ENV === "production"`에서만.** 로컬과 프로덕션이 같은 Supabase를 보므로, 가드가 없으면 `pnpm dev`로 글을 열어보는 것만으로 실제 조회수가 오른다. preview 배포도 제외(NODE_ENV로는 못 거른다).
- **유입 "출처"만 집계한다.** 검색어는 Referrer-Policy 때문에 원천적으로 얻을 수 없다.
- **이미지는 GitHub `public/images/{slug}/`에 커밋 → 재배포돼야 서빙된다.** 그 사이 ~1분은 404라 프리뷰가 objectURL로 대체한다(`pending-images.ts`).
- **e2e는 콘텐츠를 하드코딩하지 않는다.** `tests/e2e/helpers/content.ts`가 `content/posts`에서 픽스처를 읽는다. 전제(글 2개 이상, 코드펜스 등)가 없으면 사유를 남기고 skip.
- **Supabase 마이그레이션은 자동 적용되지 않는다.** service key로는 DDL이 안 되고, 개인 액세스 토큰(`sbp_`) + Management API가 필요하다. 없으면 대시보드 SQL 에디터에서 수동.

## 검증 습관

- 화면 변경은 **스크린샷으로 확인**한다 (playwright + `next-auth/jwt`로 어드민 세션 쿠키 생성).
- 기존 동작을 바꿀 때는 **영향 범위를 먼저 실측**한다 (예: `remark-breaks` 켜기 전 기존 글의 문단 내 개행 개수를 셌다).
- 실패를 발견하면 **내 변경 때문인지 먼저 가른다** — `git stash`로 baseline에서 재현되는지 확인.
- 오래 켜둔 dev 서버는 HMR 상태가 쌓여 e2e를 깨뜨린다. 이상하면 **재시작 후 재확인**.
