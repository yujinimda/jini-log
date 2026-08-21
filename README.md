# 지니로그 (jini-log)

만지면서 이해하는 기술 블로그 — **https://jinilog.dev**

글을 읽는 것만으로는 잘 안 잡히는 개념을, 본문 안에서 직접 눌러보며 이해하도록 만든 블로그입니다. 예를 들어 [이벤트 루프 글](https://jinilog.dev/posts/js-event-loop)에는 콜스택·마이크로태스크 큐가 스텝별로 움직이는 시뮬레이터가 본문에 박혀 있습니다.

운영자 1인용입니다. 어드민에서 글을 쓰면 GitHub에 커밋되고 Vercel이 재배포합니다.

## 스택

| | |
|---|---|
| 프레임워크 | Next.js 16 (App Router) |
| 스타일 | Tailwind CSS v4 · shadcn/ui |
| 콘텐츠 | MDX (remark/rehype) |
| 인증 | Auth.js v5 (GitHub OAuth, 허용 계정 1개) |
| 데이터 | Supabase — 조회수·유입 출처만 |
| 배포 | Vercel · 도메인은 Cloudflare Registrar |

## 설계에서 지키는 것

**공개 페이지는 전부 SSG입니다.** 이게 최우선 제약이라, 조회수처럼 동적인 값도 정적 HTML을 깨지 않는 방식으로 붙입니다 — 페이지는 미리 렌더되고 조회수만 클라이언트에서 `/api/views`로 따로 가져옵니다. 빌드 후 라우트 표에서 공개 페이지가 `○`(Static) / `●`(SSG)로 남아 있는지 확인하는 게 사실상의 회귀 테스트입니다.

**"프리뷰 = 발행"이 깨지지 않게 합니다.** 에디터 프리뷰·서버 검증·실제 렌더가 전부 같은 remark/rehype 설정(`lib/mdx-options.ts`)과 같은 컴포넌트 레지스트리(`components/mdx/registry.ts`)를 씁니다. 한쪽에만 플러그인을 더하면 "프리뷰에선 됐는데 발행하니 다르다"가 시작됩니다.

**측정은 최소한만 합니다.** 유입은 "어디서 왔는가"(출처)만 집계하고 검색어는 저장하지 않습니다 — 애초에 얻을 수도 없습니다(검색엔진이 Referrer-Policy로 쿼리스트링을 제거합니다). 비콘도 전체 URL이 아니라 호스트명만 보냅니다. 쿠키·사용자 식별자는 쓰지 않습니다.

## 로컬 실행

```bash
pnpm install
cp .env.example .env.local   # 값을 채운다 (아래 참고)
pnpm dev                     # http://localhost:3000
```

`.env.local`에 필요한 값은 `.env.example`에 주석과 함께 정리돼 있습니다. 크게 네 묶음입니다 — 사이트 정보, GitHub OAuth(어드민 로그인), 콘텐츠 커밋용 PAT, Supabase(조회수).

조회수 기능은 `VERCEL_ENV === "production"`일 때만 기록합니다. 로컬과 프로덕션이 같은 Supabase를 보기 때문에, 이 가드가 없으면 로컬에서 글을 열어보는 것만으로 실제 조회수가 올라갑니다.

### 검증

```bash
pnpm test          # vitest — 유닛 209개
pnpm lint          # eslint
npx tsc --noEmit
pnpm build         # 라우트 표에서 공개 페이지가 ○/● 인지 확인
pnpm test:e2e      # playwright
```

e2e는 콘텐츠를 하드코딩하지 않고 `content/posts`에서 픽스처를 읽습니다. 전제(발행 글 2개 이상 등)가 없으면 사유를 남기고 skip합니다.

## 구조

```
app/(blog)/          공개 페이지 — 전부 SSG
app/admin/           어드민 (미들웨어로 보호)
app/api/views/       조회수·유입 기록 (fire-and-forget, 항상 204)
components/mdx/      본문에서 쓸 수 있는 컴포넌트 (registry.ts가 단일 출처)
lib/mdx-options.ts   remark/rehype 설정 — 렌더·검증·프리뷰가 공유
lib/github.ts        콘텐츠 커밋 (원자적 트리 커밋)
content/posts/       발행된 글
content/drafts/      초안
supabase/migrations/ 조회수·유입 스키마
specs/               기능별 스펙 (Spec Kit)
docs/design/         설계 문서
```

## 글은 어떻게 발행되나

```
어드민 에디터 → 검증(validate-post.ts) → GitHub 커밋 → Vercel 재배포 → SSG 재생성
```

초안 저장과 발행이 같은 경로를 쓰되 검증 강도만 다릅니다. `mode: "draft"`는 형식만 강제해서 미완성 초안도 저장되고, `mode: "publish"`는 **제목·요약·분류**를 필수로 봅니다.

분류(`category`)는 글당 하나이고 좌측 레일의 그룹 기준입니다. 여러 개를 다는 태그(`tags`)와 역할이 다릅니다 — 분류는 큰 묶음, 태그는 세부 키워드입니다. 값은 자유 입력이고, 에디터가 이미 쓰인 분류를 자동완성 후보로 띄웁니다.

이미지는 `public/images/{slug}/`에 커밋되고 재배포돼야 서빙됩니다. 그 사이 약 1분은 404이므로, 에디터 프리뷰가 그동안 브라우저 objectURL로 대신 보여줍니다.

## 라이선스

- **코드**: [MIT](./LICENSE)
- **글 (`content/`)**: 저작권 보유. 무단 전재·재배포를 허용하지 않습니다.
- **폰트 (`assets/fonts/`)**: [Pretendard](https://github.com/orioncactus/pretendard) — SIL Open Font License 1.1. 고지는 [`assets/fonts/LICENSE`](./assets/fonts/LICENSE)에 있습니다.
