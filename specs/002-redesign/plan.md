# Implementation Plan: 지니로그 — 디자인·사용감 개편

**Branch**: `002-redesign` | **Date**: 2026-07-21 | **Spec**: [spec.md](./spec.md)

**Input**: `/specs/002-redesign/spec.md` (설계 근거: `docs/design/2026-07-21-002-redesign-design.md`)

## Summary

001 코드베이스(Next 16 + Tailwind v4) 위에 B1 "순정 미디엄" 톤과 사용감 기능을 얹는다. shadcn/ui를 도입해 Command(⌘K 검색)·Dialog·Toast·Table 인터랙션 부품을 확보하고, 폰트(Noto Serif KR·Pretendard)를 self-host하며, 빌드 타임 정적 검색 인덱스·목차·읽기시간·이전다음 내비를 추가한다. 신규 백엔드 없음 — 전부 기존 콘텐츠 파이프라인의 파생물.

## Technical Context

**Language/Version**: TypeScript 5.9 (strict), Node 22 — 001과 동일

**Primary Dependencies**: 기존 + shadcn/ui(Radix 기반, 코드 복사 방식) + cmdk(Command) + sonner(Toast) + rehype-slug(제목 앵커). Astryx **기각** — StyleX 전면 재작성 비용 대비 이득 없음(연구 R9)

**Storage**: 변경 없음 (검색 인덱스는 빌드 산출물, 저장소 아님)

**Testing**: 기존 Vitest+msw+Playwright. 001 E2E 61케이스 = 회귀 안전망(FR-015)

**Target Platform**: Vercel — 001과 동일, 배포 파이프라인 변경 없음

**Project Type**: 기존 단일 Next.js 앱의 UI 레이어 개편

**Performance Goals**: Lighthouse 성능·SEO ≥ 90 유지(SC-004), 검색 인덱스는 지연 로드(초기 로딩 영향 0, FR-004), 폰트는 가변 woff2 서브셋 self-host

**Constraints**: 무채색 원칙(콘텐츠 컴포넌트만 예외), 프리뷰=발행 동일성 유지(FR-011 — blog.css 공유 구조 보존), 초안 검색 노출 금지(FR-003)

**Scale/Scope**: 화면 개편 6종 + 신규 요소 5종(검색·태그 인덱스·TOC·이전다음·정렬), 신규 lib 3개

## Constitution Check

constitution 미제정 — 게이트 없음, PASS (001과 동일).

## Project Structure

### Documentation (this feature)

```text
specs/002-redesign/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── ui.md            # 검색 인덱스 스키마·TOC 데이터·컴포넌트 계약
└── tasks.md             # /speckit-tasks 산출 (이 커맨드 아님)
```

### Source Code (변경·신규만)

```text
app/
├── (blog)/
│   ├── layout.tsx            # [수정] 새 헤더(로고·태그·검색 버튼) + SearchCommand 마운트
│   ├── blog.css              # [재작성] B1 토큰 — .prose 타이포·무채색 스케일
│   ├── page.tsx              # [수정] 새 글 카드(요약·날짜·읽기시간·태그)
│   ├── tags/page.tsx         # [신규] 태그 인덱스 (전체 태그+글 수)
│   ├── posts/[slug]/page.tsx # [수정] 세리프 제목·메타·TOC·이전/다음
│   └── search-index.json/route.ts  # [신규] force-static 검색 인덱스
├── admin/**                  # [수정] shadcn 부품 적용 (구조 변경 없음)
└── layout.tsx                # [수정] next/font/local 폰트 로딩

components/
├── ui/                       # [신규] shadcn 컴포넌트 (button·dialog·command·table·sonner 등)
│                             #        생성 코드 — 소유권: 파운데이션 담당, 직접 수정 최소화
├── blog/
│   ├── search-command.tsx    # [신규] ⌘K Command 다이얼로그 (인덱스 lazy fetch)
│   ├── toc.tsx               # [신규] 목차 — 데스크톱 고정+현재 절 추적 / 모바일 접이식
│   ├── post-nav.tsx          # [신규] 이전/다음 글
│   └── post-list.tsx         # [수정] 새 카드
├── admin/**                  # [수정] confirm()→Dialog, 알림→Toast, 대시보드 Table 정렬
└── mdx/callout.tsx           # [수정] 톤다운 파스텔 재조정 (grilling 확정 예외)

lib/
├── reading-time.ts           # [신규] 한글 500자/분 (코드블록 제외)
├── toc.ts                    # [신규] 본문에서 h2/h3 추출 (mdx-options 파이프라인 공유)
├── search.ts                 # [신규] 인덱스 생성(발행 글만) + 클라이언트 매칭 함수
└── mdx-options.ts            # [수정] rehype-slug 추가 (제목 앵커 — 렌더·프리뷰·검증 공유)

public/fonts/                 # [신규] PretendardVariable.woff2, NotoSerifKR(서브셋).woff2
```

**Structure Decision**: 001 구조 유지 — 새 파일은 기존 소유권 경계(blog/·admin/·lib/·mdx/)를 따른다. `components/ui/`(shadcn 생성물)가 유일한 새 경계: 파운데이션이 소유하고 다른 영역은 사용만.

## Complexity Tracking

해당 없음 (constitution 미제정).
