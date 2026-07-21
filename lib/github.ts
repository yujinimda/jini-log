// GitHub 콘텐츠 커밋 래퍼 (research R4) — 소유: 레인 C
// 단일 파일 생성·수정·삭제는 Contents API, publish/unpublish의 2파일 이동은
// Git Data API(createTree → createCommit → updateRef)로 단일 커밋(원자적).
// 커밋 규약: 메시지 `content: {action} {slug}`, author = 운영자 GitHub 계정 (FR-009).
import { Octokit } from "@octokit/rest";
import { parsePostSource } from "./content";
import type { DraftListItem, PostMeta, PostStatus } from "./types";

/** GitHub API 호출 실패 (계약의 502 github-error로 매핑) */
export class GitHubError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "GitHubError";
  }
}

/** 낙관적 잠금 실패 — 다른 곳에서 파일이 변경됨 (계약의 409 stale-sha로 매핑) */
export class StaleShaError extends Error {
  constructor(message = "다른 곳에서 변경된 파일입니다. 최신 내용을 다시 불러오세요.") {
    super(message);
    this.name = "StaleShaError";
  }
}

function repoEnv(): { owner: string; repo: string } {
  const repo = process.env.GITHUB_REPO;
  if (!repo || !repo.includes("/")) {
    throw new GitHubError("GITHUB_REPO가 'owner/repo' 형식으로 설정되지 않았습니다");
  }
  const [owner, name] = repo.split("/");
  return { owner, repo: name };
}

let cachedOctokit: Octokit | null = null;

function octokit(): Octokit {
  if (cachedOctokit) return cachedOctokit;
  const token = process.env.GITHUB_CONTENT_TOKEN;
  if (!token) throw new GitHubError("GITHUB_CONTENT_TOKEN이 설정되지 않았습니다");
  cachedOctokit = new Octokit({ auth: token });
  return cachedOctokit;
}

/** 커밋 author — 운영자 GitHub 계정으로 기록 (FR-009: "누가"를 이력에서 검증 가능) */
function operatorAuthor(): { name: string; email: string } {
  const login = process.env.ADMIN_GITHUB_LOGIN ?? "jini-log-admin";
  return { name: login, email: `${login}@users.noreply.github.com` };
}

/** 커밋 메시지 규약: `content: {action} {slug}` (research R4) */
export function commitMessage(action: string, slug: string): string {
  return `content: ${action} ${slug}`;
}

/** 저장 위치가 상태를 결정한다 (data-model.md §1) */
export function contentPath(status: PostStatus, slug: string): string {
  return `content/${status === "published" ? "posts" : "drafts"}/${slug}.mdx`;
}

export interface CommitResult {
  commitSha: string;
  commitUrl: string;
}

export interface GitHubFile {
  content: string;
  sha: string;
}

function isHttpError(err: unknown): err is { status: number; message: string } {
  return typeof err === "object" && err !== null && "status" in err;
}

function toGitHubError(err: unknown): never {
  if (err instanceof GitHubError || err instanceof StaleShaError) throw err;
  if (isHttpError(err)) {
    throw new GitHubError(`GitHub API 오류: ${err.message}`, err.status);
  }
  throw new GitHubError(`GitHub API 호출 실패: ${(err as Error).message}`);
}

/** 단건 읽기 — 없으면 null. 반환 sha는 이후 수정 커밋의 낙관적 잠금에 사용. */
export async function getFile(path: string): Promise<GitHubFile | null> {
  const { owner, repo } = repoEnv();
  try {
    const { data } = await octokit().repos.getContent({ owner, repo, path });
    if (Array.isArray(data) || data.type !== "file") {
      throw new GitHubError(`파일이 아닙니다: ${path}`);
    }
    return {
      content: Buffer.from(data.content, "base64").toString("utf8"),
      sha: data.sha,
    };
  } catch (err) {
    if (isHttpError(err) && err.status === 404) return null;
    toGitHubError(err);
  }
}

/** 디렉터리 파일 목록 — 없으면 빈 배열 */
export async function listDir(path: string): Promise<{ name: string; sha: string }[]> {
  const { owner, repo } = repoEnv();
  try {
    const { data } = await octokit().repos.getContent({ owner, repo, path });
    if (!Array.isArray(data)) return [];
    return data.filter((e) => e.type === "file").map((e) => ({ name: e.name, sha: e.sha }));
  } catch (err) {
    if (isHttpError(err) && err.status === 404) return [];
    toGitHubError(err);
  }
}

/**
 * 단일 파일 생성·수정 (Contents API). 기존 파일 수정 시 sha 필수 —
 * 불일치면 StaleShaError (409 stale-sha).
 */
export async function putFile(params: {
  path: string;
  /** base64=true면 이미 base64 인코딩된 바이너리, 아니면 utf8 텍스트 */
  content: string;
  message: string;
  sha?: string;
  base64?: boolean;
}): Promise<CommitResult> {
  const { owner, repo } = repoEnv();
  try {
    const { data } = await octokit().repos.createOrUpdateFileContents({
      owner,
      repo,
      path: params.path,
      message: params.message,
      content: params.base64
        ? params.content
        : Buffer.from(params.content, "utf8").toString("base64"),
      sha: params.sha,
      author: operatorAuthor(),
      committer: operatorAuthor(),
    });
    return {
      commitSha: data.commit.sha ?? "",
      commitUrl: data.commit.html_url ?? "",
    };
  } catch (err) {
    if (isHttpError(err) && (err.status === 409 || err.status === 422)) {
      throw new StaleShaError();
    }
    toGitHubError(err);
  }
}

/** 단일 파일 삭제 (Contents API). sha 불일치면 StaleShaError. */
export async function deleteFile(params: {
  path: string;
  message: string;
  sha: string;
}): Promise<CommitResult> {
  const { owner, repo } = repoEnv();
  try {
    const { data } = await octokit().repos.deleteFile({
      owner,
      repo,
      path: params.path,
      message: params.message,
      sha: params.sha,
      author: operatorAuthor(),
      committer: operatorAuthor(),
    });
    return {
      commitSha: data.commit.sha ?? "",
      commitUrl: data.commit.html_url ?? "",
    };
  } catch (err) {
    if (isHttpError(err) && (err.status === 409 || err.status === 422)) {
      throw new StaleShaError();
    }
    toGitHubError(err);
  }
}

let cachedDefaultBranch: string | null = null;

async function defaultBranch(): Promise<string> {
  if (cachedDefaultBranch) return cachedDefaultBranch;
  const { owner, repo } = repoEnv();
  try {
    const { data } = await octokit().repos.get({ owner, repo });
    cachedDefaultBranch = data.default_branch;
    return cachedDefaultBranch;
  } catch (err) {
    toGitHubError(err);
  }
}

export interface TreeChange {
  path: string;
  /** null = 삭제, 문자열 = utf8 내용으로 생성·수정 */
  content: string | null;
}

/**
 * 여러 파일 변경을 단일 커밋으로 원자 실행 (Git Data API, research R4).
 * publish/unpublish의 2파일 이동에 사용 — 중간 실패 시 반쪽 상태가 남지 않는다.
 * createTree → createCommit → updateRef 순서로, updateRef 전에는 아무것도 노출되지 않는다.
 */
export async function commitAtomic(changes: TreeChange[], message: string): Promise<CommitResult> {
  const { owner, repo } = repoEnv();
  const gh = octokit();
  try {
    const branch = await defaultBranch();
    const { data: ref } = await gh.git.getRef({ owner, repo, ref: `heads/${branch}` });
    const headSha = ref.object.sha;
    const { data: headCommit } = await gh.git.getCommit({ owner, repo, commit_sha: headSha });

    const tree = changes.map((c) =>
      c.content === null
        ? { path: c.path, mode: "100644" as const, type: "blob" as const, sha: null }
        : { path: c.path, mode: "100644" as const, type: "blob" as const, content: c.content },
    );
    const { data: newTree } = await gh.git.createTree({
      owner,
      repo,
      base_tree: headCommit.tree.sha,
      tree,
    });
    const { data: newCommit } = await gh.git.createCommit({
      owner,
      repo,
      message,
      tree: newTree.sha,
      parents: [headSha],
      author: operatorAuthor(),
      committer: operatorAuthor(),
    });
    await gh.git.updateRef({
      owner,
      repo,
      ref: `heads/${branch}`,
      sha: newCommit.sha,
    });
    return {
      commitSha: newCommit.sha,
      commitUrl: `https://github.com/${owner}/${repo}/commit/${newCommit.sha}`,
    };
  } catch (err) {
    toGitHubError(err);
  }
}

/**
 * 어드민 콘텐츠 목록 — GitHub 최신본 기준 (로컬 빌드 산출물 아님, contracts).
 * 형식 오류 초안은 InvalidDraft로 포함해 목록에 오류 표시 (FR-014).
 */
export async function getContentList(): Promise<{ posts: PostMeta[]; drafts: DraftListItem[] }> {
  const [postFiles, draftFiles] = await Promise.all([
    listDir("content/posts"),
    listDir("content/drafts"),
  ]);

  const slugsOf = (files: { name: string }[]) =>
    files.filter((f) => f.name.endsWith(".mdx")).map((f) => f.name.replace(/\.mdx$/, ""));

  const posts = (
    await Promise.all(
      slugsOf(postFiles).map(async (slug): Promise<PostMeta | null> => {
        const file = await getFile(contentPath("published", slug));
        if (!file) return null;
        // 발행 글은 커밋 전 검증을 통과했으므로 파싱 실패는 예외로 드러낸다
        const { frontmatter } = parsePostSource(file.content);
        return { ...frontmatter, slug, status: "published" };
      }),
    )
  ).filter((p): p is PostMeta => p !== null);

  const drafts = (
    await Promise.all(
      slugsOf(draftFiles).map(async (slug): Promise<DraftListItem | null> => {
        const file = await getFile(contentPath("draft", slug));
        if (!file) return null;
        try {
          const { frontmatter } = parsePostSource(file.content);
          return { ...frontmatter, slug, status: "draft" };
        } catch (err) {
          return { slug, status: "invalid", error: (err as Error).message };
        }
      }),
    )
  ).filter((d): d is DraftListItem => d !== null);

  const byDateDesc = (a: { date?: string }, b: { date?: string }) =>
    (a.date ?? "") < (b.date ?? "") ? 1 : -1;
  posts.sort(byDateDesc);
  drafts.sort((a, b) =>
    byDateDesc(
      a.status === "invalid" ? {} : a,
      b.status === "invalid" ? {} : b,
    ),
  );

  return { posts, drafts };
}
