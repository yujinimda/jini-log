# Data Model: 지니로그 블로그 MVP (Phase 1)

## 1. Post (MDX 파일)

저장 위치가 상태를 결정한다: `content/posts/{slug}.mdx` = 발행, `content/drafts/{slug}.mdx` = 초안.

### Frontmatter 스키마 (zod로 검증, `lib/content.ts`)

| 필드 | 타입 | 규칙 |
| --- | --- | --- |
| `title` | string | 필수, 1~120자 |
| `description` | string | 필수, 1~200자 (SEO 요약) |
| `date` | string(ISO date) | 필수. 최초 발행일. 초안 단계에서는 작성일 |
| `tags` | string[] | 선택, 기본 []. 자유 입력, 각 1~30자 |

- **slug**: 파일명에서 유도. 규칙 `^[a-z0-9]+(-[a-z0-9]+)*$` (FR-016). frontmatter에 두지 않음 — 파일명과 이중화 방지.
- **본문**: frontmatter 아래 MDX. 사용 가능한 컴포넌트는 `components/mdx/registry.ts`에 등록된 것만.

### 상태 전이 (FR-004, 017, 018)

```
(신규) ──초안 저장──▶ draft ──발행──▶ published
                      ▲                │
                      └──발행취소──────┘
draft/published ──삭제(확인)──▶ (파일 제거, git 이력에 보존)
published 수정 저장 = 즉시 재발행 (상태 변화 없음)
```

- 모든 전이는 GitHub 커밋으로 실행되어 이력 보존(FR-009).
- slug 충돌: 대상 경로에 파일이 이미 있으면 덮어쓰기 확인 필요(스펙 엣지케이스). 발행 후 slug 변경 불가.

## 2. PageView (Supabase)

```sql
create table page_views (
  slug      text        not null,
  view_date date        not null,
  count     integer     not null default 0,
  primary key (slug, view_date)
);

-- upsert 증가 RPC (원자적)
create function increment_view(p_slug text) returns void ...
```

- 방문자 식별 정보 없음 — slug·날짜·누적치만 (FR-010).
- 쓰기는 서버(route handler, service key)만. RLS로 anon 쓰기 차단.
- 대시보드 읽기: slug별 합계, 일자별 추이 쿼리.

## 3. Interactive Component (코드 레벨 엔티티)

- `components/mdx/registry.ts`가 단일 진실 공급원: `{ ComponentName: ReactComponent }` 맵.
- 공개 렌더 · 에디터 프리뷰 · 커밋 전 검증이 모두 이 레지스트리를 사용 (FR-005).
- 등록/변경은 코드 작업(로컬 개발)으로만 — 스펙 확정 경계.

## 4. Operator (설정 엔티티)

- 저장소 없음. `ADMIN_GITHUB_LOGIN` 환경변수 1개가 허용 계정을 정의 (FR-008).
- Auth.js JWT 세션의 `login` 클레임과 비교해 판별. 세션 존재 = 조회수 집계 제외 신호 (FR-010).

## 5. 환경변수 (배포 설정)

| 변수 | 용도 |
| --- | --- |
| `SITE_URL`, `SITE_NAME` | 도메인·블로그 이름 (grilling 확정: 배포 시 주입) |
| `ADMIN_GITHUB_LOGIN` | 운영자 GitHub 계정 |
| `AUTH_GITHUB_ID/SECRET`, `AUTH_SECRET` | Auth.js |
| `GITHUB_CONTENT_TOKEN`, `GITHUB_REPO` | 콘텐츠 커밋용 fine-grained PAT · 대상 리포 |
| `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` | 조회수 (서버 전용) |
| `VERCEL_TOKEN`, `VERCEL_PROJECT_ID` | 배포 상태 폴링 (R10) |
