// POST /api/admin/posts 액션 4종의 실행 로직 (T020) — 소유: 레인 C
// contracts/api.md의 검증 순서 6단계를 그대로 구현한다:
// 1 invalid-slug(400) → 2 slug-immutable(400) → 3 invalid-frontmatter(400)
// → 4 invalid-mdx(422) → 5 slug-exists(409, overwrite로 통과) → 6 stale-sha(409)
import matter from "gray-matter";
import { isValidSlug } from "@/lib/content-schema";
import {
  commitAtomic,
  commitMessage,
  contentPath,
  deleteFile,
  getFile,
  putFile,
  StaleShaError,
  type CommitResult,
  type GitHubFile,
} from "@/lib/github";
import type { PostActionRequest, PostActionResponse, PostFrontmatter } from "@/lib/types";
import { validatePostInput } from "./validate-post";

export class PostActionError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public detail?: unknown,
  ) {
    super(message);
    this.name = "PostActionError";
  }
}

function fail(status: number, code: string, message: string, detail?: unknown): never {
  throw new PostActionError(status, code, message, detail);
}

/** frontmatter + 본문 → MDX 파일 원본 (frontmatter 필드 순서 고정) */
function serializePost(frontmatter: PostFrontmatter, body: string): string {
  const { title, description, date, tags } = frontmatter;
  return matter.stringify(body.replace(/^\n+/, ""), { title, description, date, tags });
}

/** 1단계: slug 형식 (FR-016) */
function assertSlug(slug: string) {
  if (!isValidSlug(slug)) {
    fail(400, "invalid-slug", "slug은 영문 소문자·숫자·하이픈(a-z, 0-9, -)만 허용합니다");
  }
}

/** 낙관적 잠금: 클라이언트 sha와 현재 파일 sha 비교 (6단계) */
function assertFreshSha(file: GitHubFile | null, sha: string | undefined, what: string) {
  if (!sha) return;
  if (!file) {
    fail(409, "stale-sha", `${what}이(가) 다른 곳에서 삭제되었습니다. 목록을 다시 불러오세요.`);
  }
  if (file.sha !== sha) {
    fail(409, "stale-sha", `${what}이(가) 다른 곳에서 변경되었습니다. 최신 내용을 다시 불러오세요.`);
  }
}

interface ValidatedInput {
  frontmatter: PostFrontmatter;
  body: string;
}

/** 2~4단계: slug 불변(발행 글) → frontmatter → MDX */
async function validateWriteInput(req: PostActionRequest): Promise<ValidatedInput> {
  // 2단계: slug 불변 강제 (FR-016, 서버 강제) — 대상이 발행 글이면 slug 변경 거부
  if (req.originalSlug && req.originalSlug !== req.slug) {
    if (!isValidSlug(req.originalSlug)) {
      fail(400, "invalid-slug", "originalSlug 형식이 올바르지 않습니다");
    }
    const published = await getFile(contentPath("published", req.originalSlug));
    if (published) {
      fail(400, "slug-immutable", "발행된 글의 slug은 변경할 수 없습니다 (FR-016)");
    }
  }

  if (req.frontmatter === undefined || typeof req.body !== "string") {
    fail(400, "invalid-request", "frontmatter와 body가 필요합니다");
  }

  // 3~4단계: 판정 로직은 validate API와 공유 (T018)
  const result = await validatePostInput(req.frontmatter, req.body);
  if (!result.ok) {
    fail(result.code === "invalid-frontmatter" ? 400 : 422, result.code, result.message, result.detail);
  }
  return { frontmatter: result.frontmatter, body: req.body };
}

async function saveDraft(req: PostActionRequest): Promise<PostActionResponse> {
  const { frontmatter, body } = await validateWriteInput(req);
  const source = serializePost(frontmatter, body);
  const targetPath = contentPath("draft", req.slug);

  const isRename = !!req.originalSlug && req.originalSlug !== req.slug;
  const originalPath = req.originalSlug ? contentPath("draft", req.originalSlug) : targetPath;

  // isRename이 아니면 originalPath === targetPath — 같은 파일이라 한 번만 읽는다
  const originalFile = await getFile(originalPath);
  const existingTarget = isRename ? await getFile(targetPath) : originalFile;

  // 5단계: 대상 경로 충돌 — 새 글 생성(또는 rename 도착지)에 이미 파일이 있으면 확인 필요
  const isNewTarget = isRename || !req.originalSlug;
  if (isNewTarget && existingTarget && !req.overwrite) {
    fail(409, "slug-exists", `이미 같은 slug의 초안이 있습니다: ${req.slug}`);
  }

  // 6단계: 낙관적 잠금 — 편집 시작 시점 파일이 그대로인지
  if (req.sha) assertFreshSha(originalFile, req.sha, "초안");

  let commit: CommitResult;
  try {
    if (isRename && originalFile) {
      // 초안 rename: 삭제+생성을 단일 커밋으로 (반쪽 상태 방지, R4)
      commit = await commitAtomic(
        [
          { path: originalPath, content: null },
          { path: targetPath, content: source },
        ],
        commitMessage("save-draft", req.slug),
      );
    } else {
      commit = await putFile({
        path: targetPath,
        content: source,
        message: commitMessage("save-draft", req.slug),
        sha: existingTarget?.sha,
      });
    }
  } catch (err) {
    if (err instanceof StaleShaError) fail(409, "stale-sha", err.message);
    throw err;
  }

  return { ok: true, status: "draft", ...commit };
}

async function publish(req: PostActionRequest): Promise<PostActionResponse> {
  const { frontmatter, body } = await validateWriteInput(req);
  const source = serializePost(frontmatter, body);
  const targetPath = contentPath("published", req.slug);
  const draftPath = contentPath("draft", req.originalSlug ?? req.slug);

  // 편집 세션의 출처(originalStatus)로 판정한다 — 추측 금지 (codex-review 반영):
  // - 재발행: 발행본을 열어 편집한 세션만. 신규 세션이 기존 발행 slug와 겹치면 덮어쓰기 확인 강제.
  // - 초안 소비: 그 초안을 열어 편집한 세션만. 무관한 동명 초안을 이동 커밋에 휩쓸지 않는다.
  const editingPublished =
    req.originalStatus === "published" && (req.originalSlug ?? req.slug) === req.slug;
  const editingDraft = req.originalStatus === "draft";

  const [draftFile, publishedFile] = await Promise.all([
    editingDraft ? getFile(draftPath) : Promise.resolve(null),
    getFile(targetPath),
  ]);

  const isRepublish = !!publishedFile && editingPublished;

  // 5단계: 대상 경로 충돌 — 재발행(같은 글 갱신)이 아닌데 발행본이 이미 있으면 확인 필요
  if (publishedFile && !isRepublish && !req.overwrite) {
    fail(409, "slug-exists", `이미 같은 slug의 발행 글이 있습니다: ${req.slug}`);
  }

  // 6단계: 낙관적 잠금 — 편집 시작 시점의 파일(재발행=발행본, 초안 발행=초안) 기준
  if (req.sha) assertFreshSha(editingDraft ? draftFile : publishedFile, req.sha, "글");

  let commit: CommitResult;
  try {
    if (editingDraft && draftFile) {
      // 초안 → 발행: 2파일 이동을 Git Data API 단일 커밋으로 (원자적, R4)
      commit = await commitAtomic(
        [
          { path: draftPath, content: null },
          { path: targetPath, content: source },
        ],
        commitMessage("publish", req.slug),
      );
    } else {
      // 재발행(즉시 재발행, FR-017) 또는 신규 세션에서 바로 발행
      commit = await putFile({
        path: targetPath,
        content: source,
        message: commitMessage("publish", req.slug),
        sha: publishedFile?.sha,
      });
    }
  } catch (err) {
    if (err instanceof StaleShaError) fail(409, "stale-sha", err.message);
    throw err;
  }

  return { ok: true, status: "published", ...commit };
}

async function unpublish(req: PostActionRequest): Promise<PostActionResponse> {
  if (!req.sha) fail(400, "invalid-request", "발행취소에는 sha가 필요합니다 (낙관적 잠금)");

  const publishedPath = contentPath("published", req.slug);
  const draftPath = contentPath("draft", req.slug);
  const [publishedFile, draftFile] = await Promise.all([
    getFile(publishedPath),
    getFile(draftPath),
  ]);

  if (!publishedFile) {
    fail(404, "not-found", `발행 글이 없습니다: ${req.slug}`);
  }
  // 5단계: 초안 자리에 이미 다른 파일이 있으면 덮어쓰기 확인
  if (draftFile && !req.overwrite) {
    fail(409, "slug-exists", `이미 같은 slug의 초안이 있습니다: ${req.slug}`);
  }
  // 6단계
  assertFreshSha(publishedFile, req.sha, "발행 글");

  // 발행 → 초안: 2파일 이동 단일 커밋 (원자적, R4)
  const commit = await commitAtomic(
    [
      { path: publishedPath, content: null },
      { path: draftPath, content: publishedFile.content },
    ],
    commitMessage("unpublish", req.slug),
  );

  return { ok: true, status: "draft", ...commit };
}

async function deletePost(req: PostActionRequest): Promise<PostActionResponse> {
  if (!req.sha) fail(400, "invalid-request", "삭제에는 sha가 필요합니다 (낙관적 잠금)");

  const [publishedFile, draftFile] = await Promise.all([
    getFile(contentPath("published", req.slug)),
    getFile(contentPath("draft", req.slug)),
  ]);

  if (!publishedFile && !draftFile) {
    fail(404, "not-found", `글이 없습니다: ${req.slug}`);
  }

  // 제공된 sha와 일치하는 파일을 삭제 대상으로 특정 (발행·초안 동시 존재 대비)
  let target: { path: string; file: GitHubFile };
  if (publishedFile && publishedFile.sha === req.sha) {
    target = { path: contentPath("published", req.slug), file: publishedFile };
  } else if (draftFile && draftFile.sha === req.sha) {
    target = { path: contentPath("draft", req.slug), file: draftFile };
  } else {
    fail(409, "stale-sha", "글이 다른 곳에서 변경되었습니다. 목록을 다시 불러오세요.");
  }

  let commit: CommitResult;
  try {
    // 파일 제거 커밋 — git 이력에는 보존 (FR-018)
    commit = await deleteFile({
      path: target.path,
      message: commitMessage("delete", req.slug),
      sha: target.file.sha,
    });
  } catch (err) {
    if (err instanceof StaleShaError) fail(409, "stale-sha", err.message);
    throw err;
  }

  return { ok: true, status: "deleted", ...commit };
}

export async function executePostAction(req: PostActionRequest): Promise<PostActionResponse> {
  // 1단계: slug 형식 (모든 액션 공통)
  assertSlug(req.slug);

  switch (req.action) {
    case "save-draft":
      return saveDraft(req);
    case "publish":
      return publish(req);
    case "unpublish":
      return unpublish(req);
    case "delete":
      return deletePost(req);
    default:
      fail(400, "invalid-request", `알 수 없는 action입니다: ${String(req.action)}`);
  }
}
