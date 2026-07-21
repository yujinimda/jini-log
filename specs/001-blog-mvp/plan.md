# Implementation Plan: 지니로그 — 개인 블로그 MVP

**Branch**: `001-blog-mvp` | **Date**: 2026-07-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-blog-mvp/spec.md` (설계 근거: `docs/design/2026-07-21-jini-log-blog-design.md`)

## Summary

개인 기술 블로그. 글은 레포의 MDX 파일(콘텐츠 = 코드)로 저장하고, 배포된 어드민에서 마크다운으로 작성하면 GitHub API 커밋 → Vercel 자동 재배포로 발행된다. 독자 페이지는 전부 SSG로 SEO를 극대화하고, 글 안에 React 컴포넌트 기반 인터랙티브 데모를 심는다. 조회수는 Supabase에 자체 집계(운영자·봇 제외)하고 어드민 대시보드에서 글·초안·조회수를 관리한다.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), Node.js 22 (Vercel 런타임)

**Primary Dependencies**: Next.js 15+ (App Router), Tailwind CSS v4, next-mdx-remote(RSC) + @mdx-js/mdx, gray-matter + zod(frontmatter 검증), CodeMirror 6(@uiw/react-codemirror), Auth.js v5(GitHub provider), Octokit(GitHub Contents API), @supabase/supabase-js, isbot

**Storage**: 콘텐츠 = 레포 파일(`content/posts/`, `content/drafts/`, 이미지 `public/images/{slug}/`), 조회수 = Supabase Postgres 테이블 1개

**Testing**: Vitest(유닛·API, GitHub API 모킹은 msw), Playwright(E2E 데모 시나리오)

**Target Platform**: Vercel (웹, 데스크톱·모바일 브라우저)

**Project Type**: 단일 Next.js 웹 앱 (공개 블로그 + 어드민 + API)

**Performance Goals**: 공개 페이지 전부 SSG(글·목록·태그), Lighthouse SEO ≥ 90 (SC-003), 인터랙티브 요소 체감 지연 없음 (SC-002)

**Constraints**: 발행 → 공개 반영 ≤ 5분 (SC-001, 재배포 시간 포함), 잘못된 MDX가 빌드를 깨뜨리는 사고 0건 (SC-004, 커밋 전 서버 검증), 작성 내용 유실 0건 (SC-006, localStorage 백업), 방문자 개인정보 저장 금지 (FR-010)

**Scale/Scope**: 운영자 1명, 글 수백 개 규모, 화면 6종(홈/목록/태그/글 상세/에디터/대시보드) + API 5종

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md`가 아직 템플릿 상태(프로젝트 원칙 미제정)이므로 강제할 게이트 없음 — PASS. 제정 시 재평가.

## Project Structure

### Documentation (this feature)

```text
specs/001-blog-mvp/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api.md
└── tasks.md             # Phase 2 output (/speckit-tasks — 이 커맨드에서 생성 안 함)
```

### Source Code (repository root)

```text
app/
├── (blog)/                  # 공개 영역 (전부 SSG)
│   ├── page.tsx             # 홈(글 목록)
│   ├── posts/[slug]/page.tsx
│   ├── tags/[tag]/page.tsx
│   ├── feed.xml/route.ts    # RSS
│   ├── sitemap.ts
│   └── robots.ts
├── admin/                   # 인증 필요 영역
│   ├── page.tsx             # 대시보드
│   └── write/page.tsx       # 에디터 (신규/수정 공용)
├── api/
│   ├── auth/[...nextauth]/route.ts
│   ├── views/route.ts       # POST 조회 기록
│   └── admin/
│       ├── posts/route.ts   # 저장·발행·발행취소·삭제
│       ├── posts/[slug]/route.ts  # 단건 조회(최신본)
│       └── images/route.ts  # 이미지 업로드
├── opengraph-image.tsx      # 사이트 기본 OG
└── posts/[slug]/opengraph-image.tsx  # 글별 OG 자동 생성

content/
├── posts/*.mdx              # 발행 글 (파일명 = slug)
└── drafts/*.mdx             # 초안 (외부 도구 주입 입구)

components/
├── mdx/                     # MDX 컴포넌트 레지스트리 (registry.ts + 컴포넌트)
├── blog/                    # 공개 UI
└── admin/                   # 에디터·대시보드 UI

lib/
├── content.ts               # 파일 로딩·frontmatter 파싱(zod)·목록 생성
├── mdx.ts                   # MDX 컴파일(렌더·검증 공용 파이프라인)
├── github.ts                # Octokit 커밋·읽기 래퍼
├── views.ts                 # Supabase 조회수 read/write
└── auth.ts                  # Auth.js 설정 + 운영자 판별

tests/
├── unit/                    # content, mdx 검증, slug 규칙
├── api/                     # views, admin/posts (msw로 GitHub 모킹)
└── e2e/                     # Playwright: 작성→초안→발행→노출
```

**Structure Decision**: 설계 문서에서 확정한 단일 Next.js 앱. 공개/어드민/API를 라우트 그룹으로 분리하고, 도메인 로직은 `lib/`에 모아 라우트는 얇게 유지. 오르카 레인 분배 시 (blog)/, admin/, lib+api 단위로 나누기 좋은 경계.

## Complexity Tracking

> Constitution 미제정으로 위반 사항 없음. 해당 없음.
