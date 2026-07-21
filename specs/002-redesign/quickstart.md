# Quickstart & Validation: 002 디자인·사용감 개편 (Phase 1)

전제: 001 quickstart의 환경(.env.local·Supabase·GitHub·Vercel) 그대로. 추가 환경 없음.

```bash
pnpm install && pnpm dev      # http://localhost:3100 (사용자 로컬 관례)
pnpm test && pnpm test:e2e    # 001 스위트 = 회귀 게이트 (V-R)
pnpm build                    # 검색 인덱스·폰트 포함 정적 생성 확인
```

## 검증 시나리오

### W1. 검색 (US1, SC-001·002)
1. 홈에서 ⌘K → 검색창, "지니로그" 입력 → hello-world 글이 결과에, 엔터 → 이동
2. 무의미 문자열 → "결과 없음" 표시
3. 초안 제목으로 검색 → 결과 없음 (FR-003)
4. 네트워크 탭: 첫 페이지 로드에 search-index.json 요청 없음, ⌘K 첫 오픈 시 1회 (FR-004)

### W2. 탐색 (US1)
1. 헤더 → 태그 → 태그 인덱스(전체 태그+글 수) → 태그 선택 → 글 목록
2. 홈 카드에 제목·요약(2줄 말줄임)·발행일·읽기시간·태그 표시 (SC-003)

### W3. 읽기 (US2)
1. 글 상세: 세리프 제목·본문 17px/1.8/42rem·무채색 확인
2. 넓은 화면: 우측 TOC 고정, 스크롤 시 현재 절 하이라이트, 클릭 이동 / 좁은 화면: 접이식
3. h2 없는 글: TOC 영역 없음
4. 글 하단 이전/다음 (첫·마지막 글은 한쪽 생략)
5. 에디터 프리뷰에서 새 타이포 동일 확인 (FR-011)

### W4. 어드민 (US3)
1. 삭제 클릭 → 앱 내 Dialog (브라우저 confirm 아님) → 취소/확인
2. 저장·발행·삭제 성공/실패 → Toast 표시, 실패 시 사유
3. 대시보드 컬럼 헤더 클릭 → 제목/발행일/조회수 정렬 토글

### V-R. 회귀 (FR-015, SC-004·005)
1. 001 유닛·API·E2E 전체 green (`pnpm test`, `pnpm test:e2e`)
2. Lighthouse 성능·SEO ≥ 90 (프로덕션 배포 후)
3. sitemap·RSS·OG 이미지 정상 — OG는 self-host 폰트로 한글 렌더 (네트워크 차단 상태에서도)
