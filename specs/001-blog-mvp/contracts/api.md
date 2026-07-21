# API Contracts: 지니로그 블로그 MVP (Phase 1)

모든 `/api/admin/*`는 Auth.js 세션 + 운영자 판별 필수. 미인증 401, 비운영자 403.
공통 에러 형식: `{ error: { code: string, message: string, detail?: unknown } }`

## POST /api/views — 조회 기록 (공개)

- 요청: `{ slug: string }` (sendBeacon, content-type text/plain 허용)
- 처리: 운영자 세션 있음 → 204(기록 안 함). `isbot(UA)` → 204. 그 외 `increment_view(slug)`.
- 응답: `204 No Content` (항상 — 실패도 삼킴, fire-and-forget)
- 존재하지 않는 slug: 발행 글 목록에 없으면 기록하지 않고 204 (테이블 오염 방지)

## GET /api/admin/posts — 콘텐츠 목록

- 응답: `{ posts: PostMeta[], drafts: (PostMeta | InvalidDraft)[] }`
  - `PostMeta = { slug, title, description, date, tags, status: "published" | "draft" }`
  - `InvalidDraft = { slug, status: "invalid", error: string }` — 형식 오류 초안도 목록에 표시 (FR-014)
- 소스: GitHub API 최신본 (로컬 빌드 산출물 아님 — 항상 최신 기준)

## GET /api/admin/posts/[slug] — 단건 조회 (편집 시작)

- 쿼리: `?status=draft|published`
- 응답: `{ frontmatter, body, sha }` — `sha`는 이후 수정 커밋에 필수(낙관적 잠금)
- 404: 해당 위치에 파일 없음

## POST /api/admin/posts — 저장·발행·상태 전이

- 요청:
  ```ts
  {
    action: "save-draft" | "publish" | "unpublish" | "delete",
    slug: string,            // ^[a-z0-9]+(-[a-z0-9]+)*$
    frontmatter?: {...},     // save-draft | publish 시 필수
    body?: string,           // save-draft | publish 시 필수
    sha?: string,            // 기존 파일 수정·이동·삭제 시 필수
    overwrite?: boolean      // slug 충돌 시 명시적 덮어쓰기 (기본 false)
  }
  ```
- 처리 순서 (save-draft / publish):
  1. slug 형식 검증 → 실패 `400 invalid-slug`
  2. frontmatter zod 검증 → 실패 `400 invalid-frontmatter` (필드별 메시지)
  3. MDX 컴파일 검증 (R1 파이프라인) → 실패 `422 invalid-mdx` (`detail`에 오류 위치/메시지)
  4. 대상 경로 충돌 검사 → 충돌 & `!overwrite`면 `409 slug-exists`
  5. GitHub 커밋 실행 → sha 불일치 `409 stale-sha` ("다른 곳에서 변경됨" — 재로드 유도)
- publish: 초안 존재 시 posts/ create + drafts/ delete 순차 실행. unpublish: 역방향. delete: 해당 파일 delete.
- 성공 응답: `{ ok: true, status, commitUrl }`

## POST /api/admin/images — 이미지 업로드

- 요청: `{ slug: string, filename: string, data: string(base64) }` — 최대 4MB, 허용 확장자 png/jpg/jpeg/gif/webp/svg
- 처리: `public/images/{slug}/{filename}` 커밋. 파일명 충돌 시 `-1`, `-2` 접미사 자동 부여.
- 응답: `{ ok: true, path: "/images/{slug}/{filename}" }` — 에디터가 본문에 `![](path)` 삽입
- 실패: `400 invalid-image` (형식·크기), `502 github-error`

## 인증 라우트

- `GET/POST /api/auth/[...nextauth]` — Auth.js 표준. GitHub OAuth, `signIn` 콜백에서 `ADMIN_GITHUB_LOGIN` 외 전원 거부.

## 외부 규약 (초안 주입 입구 — 도구용 계약)

- 위치: `content/drafts/{slug}.mdx`에 커밋 (slug 규칙 동일)
- 형식: data-model.md의 frontmatter 스키마 + MDX 본문
- 보장: 형식이 유효하면 대시보드 초안 목록에 자동 노출, 유효하지 않아도 사이트는 정상 (초안은 빌드 대상 아님, 목록에 오류 표시)
