// 파일 기반 콘텐츠 로더 — 빌드(SSG)와 로컬 조회용. 소유: 레인 A
// 어드민은 GitHub API 최신본을 읽지만(레인 C), 파싱 로직은 여기 parsePostSource를 공유한다.
import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { formatFrontmatterErrors, frontmatterSchema, isValidSlug } from "./content-schema";
import type { DraftListItem, PostFrontmatter, PostMeta, PostStatus } from "./types";

const CONTENT_DIR = path.join(process.cwd(), "content");

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
): Promise<(PostMeta & { body: string }) | null> {
  if (!isValidSlug(slug)) return null;
  let source: string;
  try {
    source = await fs.readFile(path.join(dirOf(status), `${slug}.mdx`), "utf8");
  } catch {
    return null;
  }
  const { frontmatter, body } = parsePostSource(source);
  return { ...frontmatter, slug, status, body };
}

/** 발행 글 목록 — 최신순. 발행 글은 커밋 전 검증을 통과했으므로 파싱 실패는 빌드 실패로 드러나는 게 맞다. */
export async function getPublishedPosts(): Promise<PostMeta[]> {
  const slugs = await listSlugs("published");
  const posts = await Promise.all(
    slugs.map(async (slug) => {
      const post = await getPost(slug, "published");
      if (!post) throw new Error(`발행 글을 읽을 수 없습니다: ${slug}`);
      return {
        slug: post.slug,
        status: post.status,
        title: post.title,
        description: post.description,
        date: post.date,
        tags: post.tags,
      };
    }),
  );
  return posts.sort((a, b) => (a.date < b.date ? 1 : -1));
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
