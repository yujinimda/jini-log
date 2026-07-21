# Data Model: 002 디자인·사용감 개편 (Phase 1)

콘텐츠 저장 모델(001 data-model)은 변경 없음. 002는 발행 글에서 **파생되는 읽기 전용 데이터** 2종과 표시 규칙만 추가한다.

## 1. SearchEntry (빌드 파생, contracts/ui.md의 인덱스 스키마)

| 필드 | 타입 | 규칙 |
| --- | --- | --- |
| `slug` | string | 001 slug 규칙 |
| `title` | string | frontmatter.title |
| `description` | string | frontmatter.description |
| `tags` | string[] | frontmatter.tags |
| `excerpt` | string | 본문 마크다운·코드펜스 스트립 후 앞 500자 |

- 소스: `getPublishedPosts()` — **발행 글만** (FR-003 보장 지점).
- 생명주기: 빌드마다 재생성. 런타임 갱신 없음(발행 = 재배포와 동기).

## 2. TocEntry (렌더 시 파생)

| 필드 | 타입 | 규칙 |
| --- | --- | --- |
| `id` | string | rehype-slug가 부여하는 앵커와 동일 알고리즘 |
| `text` | string | 제목 텍스트 (인라인 마크업 스트립) |
| `depth` | 2 \| 3 | h2/h3만 — h4 이하 제외 |

- 비어 있으면 TOC 미표시 (스펙 엣지케이스).

## 3. 표시 규칙 (파생 값)

- **읽기시간**: `ceil(본문 문자 수(코드펜스 제외) / 500)`분, 최소 1분.
- **이전/다음**: 발행일 내림차순 목록에서 인접 항목 — "이전 글"=더 오래된 글, "다음 글"=더 새 글. 동일 날짜는 slug 사전순으로 안정 정렬.
- **카드 요약**: description 그대로, CSS 2줄 말줄임.

## 4. 디자인 토큰 (blog.css 단일 지점)

- 폰트: `--font-serif`(Noto Serif KR) 제목 / `--font-sans`(Pretendard) 본문·UI
- 본문: 17px · line-height 1.8 · max-width 42rem
- 색: zinc 스케일만. 콘텐츠 컴포넌트(Callout 등)만 저채도 예외 (grilling 확정)
- 어드민: sans 전용 (세리프는 프리뷰 콘텐츠 영역에만)
