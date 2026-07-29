// e2e 픽스처를 실제 콘텐츠에서 읽는다.
//
// 왜: 예전에는 "hello-world"·"지니로그 시작"을 여러 스펙에 하드코딩했다. 운영자가
// 어드민에서 그 글을 지우자 e2e 5개가 한꺼번에 깨졌다 — 코드 결함이 아니라 픽스처
// 결합 때문이다. 발행 글은 운영 중에 늘고 줄므로, 테스트는 그때그때 존재하는 글을
// 근거로 삼아야 한다.
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import matter from "gray-matter";

const POSTS_DIR = resolve(__dirname, "../../../content/posts");

export interface FixturePost {
  slug: string;
  title: string;
  description: string;
  /** 좌측 레일의 그룹 헤더 — 발행 글은 반드시 갖는다 */
  category: string;
  tags: string[];
  /** h2 절이 있는가 — 목차 관련 테스트의 전제 */
  hasHeadings: boolean;
}

/** 발행 글 — 파일명 사전순 (테스트 간 순서 안정성) */
export function publishedPosts(): FixturePost[] {
  return readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .sort()
    .map((file) => {
      const raw = readFileSync(resolve(POSTS_DIR, file), "utf8");
      const { data, content } = matter(raw);
      const fm = data as {
        title?: unknown;
        description?: unknown;
        category?: unknown;
        tags?: unknown;
      };
      return {
        slug: file.replace(/\.mdx$/, ""),
        title: String(fm.title ?? ""),
        description: String(fm.description ?? ""),
        category: String(fm.category ?? ""),
        tags: Array.isArray(fm.tags) ? fm.tags.map(String) : [],
        hasHeadings: /^##\s/m.test(content),
      };
    });
}

/** 어떤 글의 첫 태그 — 태그 페이지 테스트용. 태그가 없으면 null */
export function firstTagOf(post: FixturePost): string | null {
  return post.tags[0] ?? null;
}

/** 글의 h2 제목들 — 목차 항목과 1:1이다. 인라인 마크업은 제거한다. */
export function headingsOf(post: FixturePost): string[] {
  const raw = readFileSync(resolve(POSTS_DIR, `${post.slug}.mdx`), "utf8");
  const { content } = matter(raw);
  return [...content.matchAll(/^##\s+(.+?)\s*$/gm)].map((m) =>
    m[1]
      .replace(/`([^`]*)`/g, "$1")
      .replace(/(\*\*|__|[*_~]{1,2})/g, "")
      .trim(),
  );
}

/** 글이 특정 MDX 컴포넌트를 쓰는가 — 그 컴포넌트를 검증하는 테스트의 전제 */
export function usesComponent(post: FixturePost, name: string): boolean {
  const raw = readFileSync(resolve(POSTS_DIR, `${post.slug}.mdx`), "utf8");
  return new RegExp(`<${name}[\\s/>]`).test(raw);
}

/** 글이 코드펜스를 포함하는가 — 코드 복사 버튼 테스트의 전제 */
export function hasCodeFence(post: FixturePost): boolean {
  const raw = readFileSync(resolve(POSTS_DIR, `${post.slug}.mdx`), "utf8");
  return /^[ \t]*```/m.test(matter(raw).content);
}

/** 아무 발행 글 하나 — 없으면 즉시 실패시켜 원인을 명확히 남긴다 */
export function anyPost(): FixturePost {
  const [post] = publishedPosts();
  if (!post) throw new Error("발행 글이 없어 e2e를 실행할 수 없습니다 (content/posts 비어 있음)");
  return post;
}

/** 절 제목이 있는 글 — 목차 테스트용. 없으면 null (호출부에서 skip) */
export function postWithHeadings(): FixturePost | null {
  return publishedPosts().find((p) => p.hasHeadings) ?? null;
}

/** 정규식 특수문자 이스케이프 — 제목을 getByRole name 정규식에 넣을 때 필요 */
export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 제목으로 링크를 찾는 정규식 */
export function titlePattern(post: FixturePost): RegExp {
  return new RegExp(escapeRegex(post.title));
}
