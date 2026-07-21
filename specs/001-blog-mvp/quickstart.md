# Quickstart & Validation: 지니로그 블로그 MVP (Phase 1)

구현 완료 후 이 문서의 시나리오가 전부 통과하면 스펙의 Success Criteria를 충족한 것이다.

## 사전 준비

1. `.env.local` — [data-model.md](./data-model.md) §5의 환경변수 전부 설정
2. Supabase: `page_views` 테이블 + `increment_view` RPC 생성 (마이그레이션 SQL은 구현 시 `supabase/` 폴더에)
3. GitHub: fine-grained PAT(대상 리포 contents read/write), OAuth App(콜백 `/api/auth/callback/github`)

## 실행

```bash
pnpm install
pnpm dev            # http://localhost:3000
pnpm test           # Vitest 유닛·API
pnpm test:e2e       # Playwright (dev 서버 필요)
pnpm build          # SSG 빌드 — 콘텐츠 검증 포함
```

## 검증 시나리오 (스펙 매핑)

### V1. 작성→발행 (US1, SC-001)
1. `/admin` 접근 → GitHub 로그인(허용 계정) → 대시보드 표시
2. 새 글 작성: 제목·요약·태그·slug 입력, 본문에 마크다운 + 레지스트리 컴포넌트 태그 → 프리뷰 실시간 갱신 확인
3. "초안 저장" → GitHub에 `content/drafts/{slug}.mdx` 커밋 확인, 공개 페이지 미노출 확인
4. "발행" → `content/posts/{slug}.mdx` 이동 커밋 → 재배포 후 5분 내 공개 페이지 노출

### V2. 검증·유실 방지 (SC-004, SC-006)
1. 본문에 잘못된 컴포넌트 태그(`<NoSuchComponent />`) 입력 → 저장 시 422 + 오류 위치 표시, 커밋 없음
2. 본문에 `import`/`export` 구문 입력 → 검증 실패 (R1 문법 정책)
3. 네트워크 차단 상태로 저장 → 실패 표시 → 새로고침 → 작성 내용 복원(localStorage)
4. 전 레지스트리 컴포넌트를 쓰는 샘플 글에 대해 "에디터 프리뷰 렌더 = 발행 페이지 렌더" 스냅샷 일치 (R2 동일성 E2E)

### V3. 독자·인터랙티브 (US2, SC-002)
1. 비로그인 브라우저로 홈·태그·글 상세 열람
2. 글 내 인터랙티브 컴포넌트 조작 → 즉시 반응
3. 코드블록 복사 버튼 동작

### V4. SEO (US3, SC-003)
1. 글 페이지 소스에 title/description/OG/JSON-LD(Article) 존재
2. `/sitemap.xml`, `/robots.txt`, `/feed.xml` 유효 응답, 발행 글 반영
3. 글 OG 이미지 URL 접근 → 제목 들어간 이미지 자동 생성
4. Lighthouse SEO ≥ 90

### V5. 조회수 (US4, SC-005)
1. 비로그인 브라우저로 글 조회 → 대시보드 조회수 +1
2. 운영자 로그인 상태로 같은 글 반복 조회 → 수치 불변
3. `curl -A "Googlebot" -X POST /api/views` → 수치 불변

### V6. 상태 전이 (FR-017, 018)
1. 발행 글 수정 → 저장 → 커밋 확인(즉시 재발행)
2. 발행취소 → drafts/로 이동, 재배포 후 공개 페이지에서 제거
3. 삭제 → 확인 다이얼로그 → 파일 제거 커밋, git 이력에 잔존 확인

### V7. 초안 주입 입구 (FR-014)
1. 어드민 밖에서(로컬 git) `content/drafts/manual-test.mdx` 커밋 → 대시보드 초안 목록에 표시
2. frontmatter 필수 필드를 뺀 초안 커밋 → 목록에 "오류" 표시, 사이트 정상

### V8. 발행-배포 상태 (R10, 스펙 엣지케이스)
1. 발행 직후 어드민에 "반영 중" 표시 → Vercel 배포 완료 후 "반영 완료"로 전환
2. 발행 중 중간 실패(원자 커밋 실패) → 초안·발행 양쪽에 반쪽 상태가 남지 않음 확인 (R4)
3. 빌드가 실패하는 커밋을 강제로 만들었을 때 어드민에 "배포 실패" 표시, 공개 사이트는 이전 배포 유지(Vercel 기본 동작) 확인
