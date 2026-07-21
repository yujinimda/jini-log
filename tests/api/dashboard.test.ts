import { existsSync } from "node:fs";
import path from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { auth, isOperator } from "@/lib/auth";
import type { DraftListItem, PostMeta } from "@/lib/types";
import { server } from "@/tests/mocks/server";

// 레인 C가 아직 라우트를 구현하지 않음 — 모듈 부재 시 skip (구현 머지 후 자동 활성화)
// specifier를 변수로 우회: tsc가 미존재 모듈을 정적 해석하지 않게 함 (vitest는 런타임에 alias 해석)
type ListRouteModule = {
  GET: (request: Request) => Promise<Response>;
  POST: (request: Request) => Promise<Response>;
};
type DetailRouteModule = {
  GET: (
    request: Request,
    context: { params: Promise<{ slug: string }> },
  ) => Promise<Response>;
};

const listRouteFile = path.resolve(__dirname, "../../app/api/admin/posts/route.ts");
const listRouteSpecifier: string = "@/app/api/admin/posts/route";
const listRouteModule = existsSync(listRouteFile)
  ? ((await import(listRouteSpecifier)) as ListRouteModule)
  : null;
const describeListRoute = describe.skipIf(!listRouteModule);

const detailRouteFile = path.resolve(__dirname, "../../app/api/admin/posts/[slug]/route.ts");
const detailRouteSpecifier: string = "@/app/api/admin/posts/[slug]/route";
const detailRouteModule = existsSync(detailRouteFile)
  ? ((await import(detailRouteSpecifier)) as DetailRouteModule)
  : null;
const describeDetailRoute = describe.skipIf(!detailRouteModule);

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
  isOperator: vi.fn(),
}));

const githubApi = "https://api.github.com/repos/test-owner/test-repo";

const publishedSource = `---
title: Hello World
description: 첫 발행 글
date: 2026-07-21
tags:
  - blog
---
Published body
`;

const draftSource = `---
title: Draft Note
description: 정상 초안
date: 2026-07-20
tags:
  - draft
---
Draft body
`;

const invalidDraftSource = `---
title: Broken Draft
date: 2026-07-19
tags:
  - draft
---
Missing description
`;

interface PostsResponse {
  posts: PostMeta[];
  drafts: DraftListItem[];
}

interface DetailResponse {
  frontmatter: {
    title: string;
    description: string;
    date: string;
    tags: string[];
  };
  body: string;
  sha: string;
}

interface ActionResponse {
  ok: true;
  status: "published" | "draft" | "deleted";
  commitUrl: string;
  commitSha: string;
}

interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    detail?: unknown;
  };
}

interface TreeChange {
  path: string;
  mode?: string;
  type?: string;
  sha?: string | null;
  content?: string;
}

interface TreeRequest {
  base_tree?: string;
  tree: TreeChange[];
}

interface CommitRequest {
  message: string;
  tree: string;
  parents: string[];
}

interface ContentsDeleteRequest {
  message: string;
  sha: string;
  branch?: string;
}

function stubGithubEnv() {
  vi.stubEnv("GITHUB_REPO", "test-owner/test-repo");
  vi.stubEnv("GITHUB_CONTENT_TOKEN", "test-token");
  vi.stubEnv("ADMIN_GITHUB_LOGIN", "test-admin");
}

function setAuth(session: unknown, operator: boolean) {
  (auth as unknown as { mockResolvedValue: (value: unknown) => void }).mockResolvedValue(session);
  vi.mocked(isOperator).mockResolvedValue(operator);
}

function operatorSession() {
  return {
    user: { name: "Test Admin" },
    login: "test-admin",
    expires: "2099-01-01T00:00:00.000Z",
  };
}

function encodedFile(source: string, sha: string, pathName: string) {
  return {
    name: path.basename(pathName),
    path: pathName,
    sha,
    type: "file",
    encoding: "base64",
    content: Buffer.from(source).toString("base64"),
  };
}

function directoryItem(name: string, pathName: string, sha: string) {
  return { name, path: pathName, sha, type: "file" };
}

function listRequest() {
  return new Request("http://localhost/api/admin/posts", { method: "GET" });
}

function actionRequest(body: unknown) {
  return new Request("http://localhost/api/admin/posts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function detailRequest(slug: string, status: "draft" | "published") {
  return new Request(`http://localhost/api/admin/posts/${slug}?status=${status}`, {
    method: "GET",
  });
}

function routeContext(slug: string) {
  const params = Promise.resolve({ slug }) as Promise<{ slug: string }> & { slug: string };
  params.slug = slug;
  return { params };
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

function stubContentsListing() {
  server.use(
    http.get(`${githubApi}/contents/content/posts`, () =>
      HttpResponse.json([directoryItem("hello-world.mdx", "content/posts/hello-world.mdx", "post-sha")]),
    ),
    http.get(`${githubApi}/contents/content/drafts`, () =>
      HttpResponse.json([
        directoryItem("draft-note.mdx", "content/drafts/draft-note.mdx", "draft-sha"),
        directoryItem("broken-draft.mdx", "content/drafts/broken-draft.mdx", "invalid-draft-sha"),
      ]),
    ),
    http.get(`${githubApi}/contents/content/posts/hello-world.mdx`, () =>
      HttpResponse.json(encodedFile(publishedSource, "post-sha", "content/posts/hello-world.mdx")),
    ),
    http.get(`${githubApi}/contents/content/drafts/draft-note.mdx`, () =>
      HttpResponse.json(encodedFile(draftSource, "draft-sha", "content/drafts/draft-note.mdx")),
    ),
    http.get(`${githubApi}/contents/content/drafts/broken-draft.mdx`, () =>
      HttpResponse.json(
        encodedFile(invalidDraftSource, "invalid-draft-sha", "content/drafts/broken-draft.mdx"),
      ),
    ),
  );
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "bypass" });
});

afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

afterAll(() => {
  server.close();
});

describeListRoute("GET /api/admin/posts", () => {
  it("미인증 요청은 401과 공통 에러 형식으로 거부한다", async () => {
    stubGithubEnv();
    setAuth(null, false);

    // FR-008 모든 관리 API는 인증 필요
    const response = await listRouteModule!.GET(listRequest());
    const body = await readJson<ApiErrorResponse>(response);

    expect(response.status).toBe(401);
    expect(body).toEqual({
      error: {
        code: expect.any(String),
        message: expect.any(String),
      },
    });
  });

  it("비운영자 요청은 403과 공통 에러 형식으로 거부한다", async () => {
    stubGithubEnv();
    setAuth({ user: { name: "Other User" }, login: "someone-else" }, false);

    // FR-008 허용된 단일 운영자 외 접근 차단
    const response = await listRouteModule!.GET(listRequest());
    const body = await readJson<ApiErrorResponse>(response);

    expect(response.status).toBe(403);
    expect(body).toEqual({
      error: {
        code: expect.any(String),
        message: expect.any(String),
      },
    });
  });

  it("발행 글과 정상 초안, invalid 초안을 GitHub 최신본 기준으로 함께 반환한다", async () => {
    stubGithubEnv();
    setAuth(operatorSession(), true);
    stubContentsListing();

    // FR-011 대시보드 목록, FR-014 형식 오류 초안도 목록에 표시
    const response = await listRouteModule!.GET(listRequest());
    const body = await readJson<PostsResponse>(response);

    expect(response.status).toBe(200);
    expect(body.posts).toContainEqual({
      slug: "hello-world",
      title: "Hello World",
      description: "첫 발행 글",
      date: "2026-07-21",
      tags: ["blog"],
      status: "published",
    });
    expect(body.drafts).toContainEqual({
      slug: "draft-note",
      title: "Draft Note",
      description: "정상 초안",
      date: "2026-07-20",
      tags: ["draft"],
      status: "draft",
    });
    expect(body.drafts).toContainEqual({
      slug: "broken-draft",
      status: "invalid",
      error: expect.any(String),
    });
  });
});

describeDetailRoute("GET /api/admin/posts/[slug]", () => {
  it("초안 파일이 존재하면 frontmatter, body, GitHub blob sha를 반환한다", async () => {
    stubGithubEnv();
    setAuth(operatorSession(), true);
    server.use(
      http.get(`${githubApi}/contents/content/drafts/draft-note.mdx`, () =>
        HttpResponse.json(encodedFile(draftSource, "draft-blob-sha", "content/drafts/draft-note.mdx")),
      ),
    );

    // contracts/api.md: 편집 시작 시 이후 커밋에 필요한 sha 반환
    const response = await detailRouteModule!.GET(detailRequest("draft-note", "draft"), routeContext("draft-note"));
    const body = await readJson<DetailResponse>(response);

    expect(response.status).toBe(200);
    expect(body.frontmatter).toEqual({
      title: "Draft Note",
      description: "정상 초안",
      date: "2026-07-20",
      tags: ["draft"],
    });
    expect(body.body.trim()).toBe("Draft body");
    expect(body.sha).toBe("draft-blob-sha");
  });

  it("요청한 파일이 없으면 404와 공통 에러 형식으로 응답한다", async () => {
    stubGithubEnv();
    setAuth(operatorSession(), true);
    server.use(
      http.get(`${githubApi}/contents/content/drafts/missing-post.mdx`, () =>
        HttpResponse.json({ message: "Not Found" }, { status: 404 }),
      ),
    );

    // contracts/api.md: 단건 조회 파일 없음은 404
    const response = await detailRouteModule!.GET(
      detailRequest("missing-post", "draft"),
      routeContext("missing-post"),
    );
    const body = await readJson<ApiErrorResponse>(response);

    expect(response.status).toBe(404);
    expect(body).toEqual({
      error: {
        code: expect.any(String),
        message: expect.any(String),
      },
    });
  });
});

describeListRoute("POST /api/admin/posts dashboard actions", () => {
  it("발행취소는 posts에서 drafts로 이동하는 단일 Git Data API 커밋을 만든다", async () => {
    stubGithubEnv();
    setAuth(operatorSession(), true);

    const treeRequests: TreeRequest[] = [];
    const commitRequests: CommitRequest[] = [];

    server.use(
      http.get(`${githubApi}/contents/content/posts/hello-world.mdx`, () =>
        HttpResponse.json(encodedFile(publishedSource, "published-sha", "content/posts/hello-world.mdx")),
      ),
      http.get(`${githubApi}/contents/content/drafts/hello-world.mdx`, () =>
        HttpResponse.json({ message: "Not Found" }, { status: 404 }),
      ),
      http.get(`${githubApi}/git/ref/heads/main`, () =>
        HttpResponse.json({ object: { sha: "base-commit-sha" } }),
      ),
      http.get(`${githubApi}/git/commits/base-commit-sha`, () =>
        HttpResponse.json({ sha: "base-commit-sha", tree: { sha: "base-tree-sha" } }),
      ),
      http.post(`${githubApi}/git/blobs`, () => HttpResponse.json({ sha: "new-draft-blob-sha" })),
      http.post(`${githubApi}/git/trees`, async ({ request }) => {
        treeRequests.push((await request.json()) as TreeRequest);
        return HttpResponse.json({ sha: "new-tree-sha" });
      }),
      http.post(`${githubApi}/git/commits`, async ({ request }) => {
        commitRequests.push((await request.json()) as CommitRequest);
        return HttpResponse.json({
          sha: "unpublish-commit-sha",
          html_url: "https://github.com/test-owner/test-repo/commit/unpublish-commit-sha",
        });
      }),
      http.patch(`${githubApi}/git/refs/heads/main`, () =>
        HttpResponse.json({ object: { sha: "unpublish-commit-sha" } }),
      ),
    );

    // FR-017 발행취소는 공개 글을 초안으로 되돌리고 변경 이력을 보존
    const response = await listRouteModule!.POST(
      actionRequest({ action: "unpublish", slug: "hello-world", sha: "published-sha" }),
    );
    const body = await readJson<ActionResponse>(response);

    expect(response.status).toBe(200);
    expect(body.status).toBe("draft");
    expect(body.status).not.toBe("published");
    expect(body.commitSha).toBe("unpublish-commit-sha");
    expect(commitRequests).toContainEqual(
      expect.objectContaining({ message: "content: unpublish hello-world" }),
    );
    expect(treeRequests.flatMap((request) => request.tree)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "content/drafts/hello-world.mdx" }),
        expect.objectContaining({ path: "content/posts/hello-world.mdx", sha: null }),
      ]),
    );
  });

  it("삭제는 sha 확인 후 파일 제거 커밋을 만들고 deleted 상태를 반환한다", async () => {
    stubGithubEnv();
    setAuth(operatorSession(), true);

    const deleteRequests: ContentsDeleteRequest[] = [];

    server.use(
      http.get(`${githubApi}/contents/content/posts/hello-world.mdx`, () =>
        HttpResponse.json(encodedFile(publishedSource, "published-sha", "content/posts/hello-world.mdx")),
      ),
      http.delete(`${githubApi}/contents/content/posts/hello-world.mdx`, async ({ request }) => {
        deleteRequests.push((await request.json()) as ContentsDeleteRequest);
        return HttpResponse.json({
          commit: {
            sha: "delete-commit-sha",
            html_url: "https://github.com/test-owner/test-repo/commit/delete-commit-sha",
          },
        });
      }),
    );

    // FR-017 삭제는 확인 절차 후 제거되며 변경 이력에는 보존
    const response = await listRouteModule!.POST(
      actionRequest({ action: "delete", slug: "hello-world", sha: "published-sha" }),
    );
    const body = await readJson<ActionResponse>(response);

    expect(response.status).toBe(200);
    expect(body.status).toBe("deleted");
    expect(body.commitSha).toBe("delete-commit-sha");
    expect(deleteRequests).toContainEqual(
      expect.objectContaining({
        message: "content: delete hello-world",
        sha: "published-sha",
      }),
    );
  });
});
