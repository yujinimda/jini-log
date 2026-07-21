// 파일 기반 콘텐츠 로더 — 빌드(SSG)와 로컬 조회용. 소유: 레인 A
// 어드민은 GitHub API 최신본을 읽지만(레인 C), 파싱 로직은 여기 parsePostSource를 공유한다.
import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { formatFrontmatterErrors, frontmatterSchema, isValidSlug } from "./content-schema";
import type { DraftListItem, PostDerived, PostFrontmatter, PostMeta, PostStatus } from "./types";

const CONTENT_DIR = path.join(process.cwd(), "content");

// ---- 본문 파생값 (002 R6) — 파생 계산 지점은 이 로더 1곳뿐 ----

/** 코드펜스(``` ... ```) 블록 제거 — 닫히지 않은 펜스는 끝까지 제거 */
function stripCodeFences(body: string): string {
  return body.replace(/^[ \t]*(```|~~~)[^\n]*\n[\s\S]*?(^[ \t]*\1[ \t]*$|(?![\s\S]))/gm, "");
}

/** 읽기시간(분) = ceil(코드펜스 제거 후 문자 수 / 500), 최소 1분 (data-model §3) */
export function deriveReadingMinutes(body: string): number {
  const chars = stripCodeFences(body).trim().length;
  return Math.max(1, Math.ceil(chars / 500));
}

/** 마크다운 문법·JSX 컴포넌트 태그를 스트립한 앞 500자 (data-model §1) */
export function deriveExcerpt(body: string): string {
  const text = stripCodeFences(body)
    // 마크다운 오토링크(<https://...>, <mail@...>)는 태그가 아니라 내용 — 먼저 보존 (리뷰 반영)
    .replace(/<(https?:\/\/[^>\s]+|[^@>\s]+@[^@>\s]+\.[^>\s]+)>/g, "$1")
    // JSX/HTML 태그 (여는·닫는·self-closing) — 내용 텍스트는 유지
    .replace(/<\/?[A-Za-z][^>]*\/?>/g, " ")
    // 이미지·링크는 대체 텍스트만 남김 — URL 안 괄호 1단계 허용 (리뷰 반영)
    .replace(/!\[([^\]]*)\]\((?:[^()]|\([^()]*\))*\)/g, "$1")
    .replace(/\[([^\]]*)\]\((?:[^()]|\([^()]*\))*\)/g, "$1")
    // 인라인 코드 백틱
    .replace(/`([^`]*)`/g, "$1")
    // 행머리 기호: 제목·인용·리스트·수평선·표 구분행
    .replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, "")
    .replace(/^[ \t]{0,3}>[ \t]?/gm, "")
    .replace(/^[ \t]*([-*+]|\d+\.)[ \t]+/gm, "")
    .replace(/^[ \t]*([-*_][ \t]*){3,}$/gm, "")
    .replace(/^[ \t]*\|.*\|[ \t]*$/gm, (row) =>
      /^[ \t|:\-]+$/.test(row) ? "" : row.replace(/\|/g, " "),
    )
    // 강조 마커
    .replace(/(\*\*|__|[*_~]{1,2})/g, "")
    // 공백 정규화
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, 500);
}

/** PostMeta + 본문 파생값 — 홈 카드·검색 인덱스 생성기·글 상세 공용 (R6) */
function withDerived(meta: PostMeta, body: string): PostDerived {
  return { ...meta, readingMinutes: deriveReadingMinutes(body), excerpt: deriveExcerpt(body) };
}

export interface ParsedPost {
  frontmatter: PostFrontmatter;
  body: string;
}

/** frontmatter 분리 + 스키마 검증. 실패 시 이유를 담아 throw. */
export function parsePostSource(source: string): ParsedPost {
  const { data, content } = matter(source);
  const parsed = frontmatterSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(formatFrontmatterErrors(parsed.error));
  }
  return { frontmatter: parsed.data, body: content };
}

function dirOf(status: PostStatus) {
  return path.join(CONTENT_DIR, status === "published" ? "posts" : "drafts");
}

async function listSlugs(status: PostStatus): Promise<string[]> {
  try {
    const files = await fs.readdir(dirOf(status));
    return files.filter((f) => f.endsWith(".mdx")).map((f) => f.replace(/\.mdx$/, ""));
  } catch {
    return [];
  }
}

export async function getPost(
  slug: string,
  status: PostStatus = "published",
): Promise<(PostDerived & { body: string }) | null> {
  if (!isValidSlug(slug)) return null;
  let source: string;
  try {
    source = await fs.readFile(path.join(dirOf(status), `${slug}.mdx`), "utf8");
  } catch {
    return null;
  }
  const { frontmatter, body } = parsePostSource(source);
  return { ...withDerived({ ...frontmatter, slug, status }, body), body };
}

/** 발행 글 목록 — 최신순, 파생값 포함(R6). 발행 글은 커밋 전 검증을 통과했으므로 파싱 실패는 빌드 실패로 드러나는 게 맞다. */
export async function getPublishedPosts(): Promise<PostDerived[]> {
  const slugs = await listSlugs("published");
  const posts = await Promise.all(
    slugs.map(async (slug) => {
      const post = await getPost(slug, "published");
      if (!post) throw new Error(`발행 글을 읽을 수 없습니다: ${slug}`);
      const { body, ...meta } = post;
      void body; // 목록에는 본문 제외 (파생값만 유지)
      return meta;
    }),
  );
  // 발행일 내림차순, 동일 날짜는 slug 사전순 — 이전/다음 내비의 안정 정렬 근거 (data-model §3)
  return posts.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.slug < b.slug ? -1 : 1;
  });
}

/** 초안 목록 — 형식 오류 초안도 목록에 포함(오류 표시), 사이트는 깨지지 않는다 (FR-014). */
export async function getDrafts(): Promise<DraftListItem[]> {
  const slugs = await listSlugs("draft");
  return Promise.all(
    slugs.map(async (slug): Promise<DraftListItem> => {
      try {
        const source = await fs.readFile(path.join(dirOf("draft"), `${slug}.mdx`), "utf8");
        const { frontmatter } = parsePostSource(source);
        return { ...frontmatter, slug, status: "draft" };
      } catch (err) {
        return { slug, status: "invalid", error: (err as Error).message };
      }
    }),
  );
}

export async function getAllTags(): Promise<string[]> {
  const posts = await getPublishedPosts();
  return [...new Set(posts.flatMap((p) => p.tags))].sort();
}
