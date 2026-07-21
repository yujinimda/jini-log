import { existsSync } from "node:fs";
import path from "node:path";
import { Buffer } from "node:buffer";
import { beforeAll, beforeEach, afterEach, afterAll, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import type { ApiErrorBody, PostActionRequest, PostActionResponse } from "@/lib/types";
import type { Frontmatter } from "@/lib/content-schema";

const authMocks = vi.hoisted(() => ({
  auth: vi.fn(),
  isOperator: vi.fn(),
  isOperatorSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: authMocks.auth,
  isOperator: authMocks.isOperator,
  isOperatorSession: authMocks.isOperatorSession,
}));

type RouteModule = {
  POST: (request: Request) => Promise<Response> | Response;
};

// 레인 C가 아직 라우트를 구현하지 않음 — 모듈 부재 시 skip (구현 머지 후 자동 활성화)
// specifier를 변수로 우회: tsc가 미존재 모듈을 정적 해석하지 않게 함 (vitest는 런타임에 alias 해석)
const routeFile = path.resolve(__dirname, "../../app/api/admin/posts/route.ts");
const routeSpecifier: string = "@/app/api/admin/posts/route";
const routeModule = existsSync(routeFile)
  ? ((await import(routeSpecifier)) as RouteModule)
  : null;
const describeRoute = describe.skipIf(!routeModule);

const GITHUB_API = "https://api.github.com";
const repoBase = `${GITHUB_API}/repos/test-owner/test-repo`;

const validFrontmatter: Frontmatter = {
  title: "Test Post",
  description: "A post for API contract tests",
  date: "2026-07-21",
  tags: ["test"],
};

function operatorSession() {
  return {
    user: { name: "Test Admin" },
    expires: "2099-01-01T00:00:00.000Z",
    login: process.env.ADMIN_GITHUB_LOGIN,
  };
}

function setOperatorAuth() {
  authMocks.auth.mockResolvedValue(operatorSession());
  authMocks.isOperator.mockResolvedValue(true);
  authMocks.isOperatorSession.mockReturnValue(true);
}

function setAnonymousAuth() {
  authMocks.auth.mockResolvedValue(null);
  authMocks.isOperator.mockResolvedValue(false);
  authMocks.isOperatorSession.mockReturnValue(false);
}

function setNonOperatorAuth() {
  authMocks.auth.mockResolvedValue({
    user: { name: "Other User" },
    expires: "2099-01-01T00:00:00.000Z",
    login: "someone-else",
  });
  authMocks.isOperator.mockResolvedValue(false);
  authMocks.isOperatorSession.mockReturnValue(false);
}

function postRequest(req: PostActionRequest | Record<string, unknown>) {
  return new Request("http://localhost/api/admin/posts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req),
  });
}

async function callPost(req: PostActionRequest | Record<string, unknown>) {
  return await routeModule!.POST(postRequest(req));
}

async function jsonOf<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

function githubContentPath(url: string) {
  return new URL(url).pathname.replace("/repos/test-owner/test-repo/contents/", "");
}

function encodedMdx(frontmatter: Frontmatter = validFrontmatter, body = "Hello content") {
  const tags = frontmatter.tags.map((tag) => `  - ${tag}`).join("\n");
  return Buffer.from(
    `---\ntitle: ${frontmatter.title}\ndescription: ${frontmatter.description}\ndate: ${frontmatter.date}\ntags:\n${tags}\n---\n\n${body}\n`,
  ).toString("base64");
}

function githubContentFile(pathname: string, sha = "existing-sha") {
  return {
    name: pathname.split("/").at(-1),
    path: pathname,
    sha,
    content: encodedMdx(),
    encoding: "base64",
  };
}

function useGitDataCommitStubs(capture: { messages: string[]; paths: string[] }) {
  server.use(
    http.get(`${repoBase}/contents/*`, ({ request }) => {
      const contentPath = githubContentPath(request.url);
      if (contentPath === "content/drafts/publish-me.mdx") {
        return HttpResponse.json(githubContentFile(contentPath, "draft-sha"));
      }
      if (contentPath === "content/posts/unpublish-me.mdx") {
        return HttpResponse.json(githubContentFile(contentPath, "post-sha"));
      }

      return HttpResponse.json({ message: "Not Found" }, { status: 404 });
    }),
    http.get(`${repoBase}/git/ref/heads/:branch`, ({ request }) => {
      capture.paths.push(new URL(request.url).pathname);
      return HttpResponse.json({
        ref: "refs/heads/main",
        object: { type: "commit", sha: "base-commit-sha" },
      });
    }),
    http.get(`${repoBase}/git/refs/heads/:branch`, ({ request }) => {
      capture.paths.push(new URL(request.url).pathname);
      return HttpResponse.json({
        ref: "refs/heads/main",
        object: { type: "commit", sha: "base-commit-sha" },
      });
    }),
    http.get(`${repoBase}/git/commits/:sha`, ({ request }) => {
      capture.paths.push(new URL(request.url).pathname);
      return HttpResponse.json({
        sha: "base-commit-sha",
        tree: { sha: "base-tree-sha" },
      });
    }),
    http.post(`${repoBase}/git/trees`, async ({ request }) => {
      capture.paths.push(new URL(request.url).pathname);
      return HttpResponse.json({ sha: "new-tree-sha" }, { status: 201 });
    }),
    http.post(`${repoBase}/git/commits`, async ({ request }) => {
      capture.paths.push(new URL(request.url).pathname);
      const body = (await request.json()) as Record<string, unknown>;
      capture.messages.push(String(body.message));
      return HttpResponse.json(
        {
          sha: "git-data-commit-sha",
          html_url: "https://github.com/test-owner/test-repo/commit/git-data-commit-sha",
        },
        { status: 201 },
      );
    }),
    http.patch(`${repoBase}/git/ref/heads/:branch`, ({ request }) => {
      capture.paths.push(new URL(request.url).pathname);
      return HttpResponse.json({
        ref: "refs/heads/main",
        object: { type: "commit", sha: "git-data-commit-sha" },
      });
    }),
    http.patch(`${repoBase}/git/refs/heads/:branch`, ({ request }) => {
      capture.paths.push(new URL(request.url).pathname);
      return HttpResponse.json({
        ref: "refs/heads/main",
        object: { type: "commit", sha: "git-data-commit-sha" },
      });
    }),
  );
}

describeRoute("POST /api/admin/posts", () => {
  beforeAll(() => {
    vi.stubEnv("GITHUB_REPO", "test-owner/test-repo");
    vi.stubEnv("GITHUB_CONTENT_TOKEN", "test-token");
    vi.stubEnv("ADMIN_GITHUB_LOGIN", "test-admin");
    server.listen({ onUnhandledRequest: "bypass" });
  });

  beforeEach(() => {
    setOperatorAuth();
  });

  afterEach(() => {
    server.resetHandlers();
    vi.clearAllMocks();
  });

  afterAll(() => {
    server.close();
    vi.unstubAllEnvs();
  });

  it("미인증 요청은 401을 반환한다", async () => {
    // contracts/api.md 공통 규약: 모든 /api/admin/* 미인증 401
    setAnonymousAuth();

    const response = await callPost({
      action: "save-draft",
      slug: "auth-test",
      frontmatter: validFrontmatter,
      body: "body",
    });

    const json = await jsonOf<ApiErrorBody>(response);
    expect(response.status).toBe(401);
    // 계약은 401 + 공통 에러 형식만 규정 — code 문자열은 구현 재량
    expect(json.error.code).toEqual(expect.any(String));
  });

  it("비운영자 세션은 403을 반환한다", async () => {
    // FR-008: 허용된 단일 운영자 계정만 관리 기능 접근 가능
    setNonOperatorAuth();

    const response = await callPost({
      action: "save-draft",
      slug: "operator-test",
      frontmatter: validFrontmatter,
      body: "body",
    });

    const json = await jsonOf<ApiErrorBody>(response);
    expect(response.status).toBe(403);
    // 계약은 403 + 공통 에러 형식만 규정 — code 문자열은 구현 재량
    expect(json.error.code).toEqual(expect.any(String));
  });

  it("save-draft 신규 글은 drafts 경로에 Contents API PUT으로 커밋한다", async () => {
    // contracts/api.md: save-draft 성공은 content/drafts/{slug}.mdx 저장
    let putPath = "";
    let putBody: Record<string, unknown> | null = null;

    server.use(
      http.put(`${repoBase}/contents/*`, async ({ request }) => {
        putPath = githubContentPath(request.url);
        putBody = (await request.json()) as Record<string, unknown>;

        return HttpResponse.json({
          content: { sha: "draft-content-sha" },
          commit: {
            sha: "draft-commit-sha",
            html_url: "https://github.com/test-owner/test-repo/commit/draft-commit-sha",
          },
        });
      }),
    );

    const response = await callPost({
      action: "save-draft",
      slug: "first-draft",
      frontmatter: validFrontmatter,
      body: "Draft body",
    });

    const json = await jsonOf<PostActionResponse>(response);
    expect(response.status).toBe(200);
    expect(json).toEqual({
      ok: true,
      status: "draft",
      commitUrl: "https://github.com/test-owner/test-repo/commit/draft-commit-sha",
      commitSha: "draft-commit-sha",
    });
    expect(putPath).toBe("content/drafts/first-draft.mdx");
    expect(putBody).toEqual(expect.objectContaining({ message: "content: save-draft first-draft" }));

    const decoded = Buffer.from(String(putBody!.content), "base64").toString("utf8");
    expect(decoded).toContain("title");
    expect(decoded).toContain("Test Post");
    expect(decoded).toContain("description");
    expect(decoded).toContain("A post for API contract tests");
    expect(decoded).toContain("Draft body");
  });

  it("커밋 규약(FR-009): PUT body에 message와 author 또는 committer가 포함된다", async () => {
    // FR-009: 누가·언제·무엇을 바꿨는지 추적 가능해야 함
    let putBody: Record<string, unknown> | null = null;

    server.use(
      http.put(`${repoBase}/contents/*`, async ({ request }) => {
        putBody = (await request.json()) as Record<string, unknown>;

        return HttpResponse.json({
          content: { sha: "tracked-content-sha" },
          commit: {
            sha: "tracked-commit-sha",
            html_url: "https://github.com/test-owner/test-repo/commit/tracked-commit-sha",
          },
        });
      }),
    );

    const response = await callPost({
      action: "save-draft",
      slug: "tracked-draft",
      frontmatter: validFrontmatter,
      body: "Tracked body",
    });

    expect(response.status).toBe(200);
    expect(putBody).not.toBeNull();
    expect(putBody!.message).toBe("content: save-draft tracked-draft");
    expect("author" in putBody! || "committer" in putBody!).toBe(true);
  });

  it("publish는 drafts에서 posts로 Git Data API 단일 커밋을 만들고 published를 반환한다", async () => {
    // contracts/api.md: publish/unpublish 2파일 이동은 Git Data API 단일 원자 커밋
    const capture = { messages: [] as string[], paths: [] as string[] };
    useGitDataCommitStubs(capture);

    const response = await callPost({
      action: "publish",
      slug: "publish-me",
      originalSlug: "publish-me",
      frontmatter: validFrontmatter,
      body: "Published body",
      sha: "draft-sha",
      overwrite: true,
    });

    const json = await jsonOf<PostActionResponse>(response);
    expect(response.status).toBe(200);
    expect(json.status).toBe("published");
    expect(json.commitSha).toBe("git-data-commit-sha");
    expect(capture.messages).toContain("content: publish publish-me");
    expect(capture.paths.some((requestPath) => requestPath.includes("/git/trees"))).toBe(true);
    expect(capture.paths.some((requestPath) => requestPath.includes("/git/commits"))).toBe(true);
    expect(capture.paths.some((requestPath) => requestPath.includes("/git/ref"))).toBe(true);
  });

  it("unpublish는 posts에서 drafts로 Git Data API 단일 커밋을 만들고 draft를 반환한다", async () => {
    // FR-017: 발행취소된 글은 초안으로 돌아가 공개 페이지에서 내려감
    const capture = { messages: [] as string[], paths: [] as string[] };
    useGitDataCommitStubs(capture);

    const response = await callPost({
      action: "unpublish",
      slug: "unpublish-me",
      originalSlug: "unpublish-me",
      sha: "post-sha",
    });

    const json = await jsonOf<PostActionResponse>(response);
    expect(response.status).toBe(200);
    expect(json.status).toBe("draft");
    expect(json.commitSha).toBe("git-data-commit-sha");
    expect(capture.messages).toContain("content: unpublish unpublish-me");
    expect(capture.paths.some((requestPath) => requestPath.includes("/git/trees"))).toBe(true);
    expect(capture.paths.some((requestPath) => requestPath.includes("/git/commits"))).toBe(true);
    expect(capture.paths.some((requestPath) => requestPath.includes("/git/ref"))).toBe(true);
  });

  it("delete는 Contents API DELETE와 sha로 삭제 커밋을 만들고 deleted를 반환한다", async () => {
    // FR-017: 삭제는 변경 이력에 보존되어야 함
    let deletePath = "";
    let deleteBody: Record<string, unknown> | null = null;

    server.use(
      http.delete(`${repoBase}/contents/*`, async ({ request }) => {
        deletePath = githubContentPath(request.url);
        deleteBody = (await request.json()) as Record<string, unknown>;

        return HttpResponse.json({
          commit: {
            sha: "delete-commit-sha",
            html_url: "https://github.com/test-owner/test-repo/commit/delete-commit-sha",
          },
        });
      }),
    );

    const response = await callPost({
      action: "delete",
      slug: "delete-me",
      sha: "delete-target-sha",
    });

    const json = await jsonOf<PostActionResponse>(response);
    expect(response.status).toBe(200);
    expect(json.status).toBe("deleted");
    expect(json.commitSha).toBe("delete-commit-sha");
    expect(deletePath).toBe("content/posts/delete-me.mdx");
    expect(deleteBody).toEqual(
      expect.objectContaining({
        message: "content: delete delete-me",
        sha: "delete-target-sha",
      }),
    );
  });

  it("처리 순서 1: slug 형식 오류가 frontmatter 오류보다 먼저 invalid-slug로 실패한다", async () => {
    // contracts/api.md 처리 순서 1
    const response = await callPost({
      action: "save-draft",
      slug: "Bad_Slug",
      frontmatter: { description: "", date: "not-a-date", tags: [] },
      body: "<NoSuchComponent />",
    });

    const json = await jsonOf<ApiErrorBody>(response);
    expect(response.status).toBe(400);
    expect(json.error.code).toBe("invalid-slug");
  });

  it("처리 순서 2: 발행 글의 slug 변경은 slug-immutable로 실패한다", async () => {
    // contracts/api.md 처리 순서 2, FR-016 서버 강제
    server.use(
      http.get(`${repoBase}/contents/*`, ({ request }) => {
        const contentPath = githubContentPath(request.url);
        if (contentPath === "content/posts/old-post.mdx") {
          return HttpResponse.json(githubContentFile(contentPath));
        }

        return HttpResponse.json({ message: "Not Found" }, { status: 404 });
      }),
    );

    const response = await callPost({
      action: "publish",
      originalSlug: "old-post",
      slug: "new-post",
      frontmatter: validFrontmatter,
      body: "Attempt slug change",
      sha: "existing-sha",
    });

    const json = await jsonOf<ApiErrorBody>(response);
    expect(response.status).toBe(400);
    expect(json.error.code).toBe("slug-immutable");
  });

  it("처리 순서 3: frontmatter title 누락은 invalid-frontmatter와 필드 메시지를 반환한다", async () => {
    // contracts/api.md 처리 순서 3
    const response = await callPost({
      action: "save-draft",
      slug: "missing-title",
      frontmatter: {
        description: "Missing title",
        date: "2026-07-21",
        tags: [],
      },
      body: "Valid body",
    });

    const json = await jsonOf<ApiErrorBody>(response);
    expect(response.status).toBe(400);
    expect(json.error.code).toBe("invalid-frontmatter");
    expect(JSON.stringify(json.error.detail ?? json.error.message)).toContain("title");
  });

  it("처리 순서 4: 미등록 컴포넌트는 invalid-mdx와 detail을 반환한다", async () => {
    // contracts/api.md 처리 순서 4
    const response = await callPost({
      action: "save-draft",
      slug: "bad-component",
      frontmatter: validFrontmatter,
      body: "<NoSuchComponent />",
    });

    const json = await jsonOf<ApiErrorBody>(response);
    expect(response.status).toBe(422);
    expect(json.error.code).toBe("invalid-mdx");
    expect(json.error.detail).toBeDefined();
  });

  it("처리 순서 4: MDX import 문은 invalid-mdx와 detail을 반환한다", async () => {
    // contracts/api.md 처리 순서 4: import/export 금지
    const response = await callPost({
      action: "save-draft",
      slug: "bad-import",
      frontmatter: validFrontmatter,
      body: 'import x from "y"\n\n# Body',
    });

    const json = await jsonOf<ApiErrorBody>(response);
    expect(response.status).toBe(422);
    expect(json.error.code).toBe("invalid-mdx");
    expect(json.error.detail).toBeDefined();
  });

  it("처리 순서 5: 대상 경로가 존재하고 overwrite가 없으면 slug-exists로 실패한다", async () => {
    // contracts/api.md 처리 순서 5
    let putCalled = false;

    server.use(
      http.get(`${repoBase}/contents/*`, ({ request }) => {
        const contentPath = githubContentPath(request.url);
        if (contentPath === "content/drafts/existing-post.mdx") {
          return HttpResponse.json(githubContentFile(contentPath));
        }

        return HttpResponse.json({ message: "Not Found" }, { status: 404 });
      }),
      http.put(`${repoBase}/contents/*`, () => {
        putCalled = true;
        return HttpResponse.json({});
      }),
    );

    const response = await callPost({
      action: "save-draft",
      slug: "existing-post",
      frontmatter: validFrontmatter,
      body: "Collision body",
    });

    const json = await jsonOf<ApiErrorBody>(response);
    expect(response.status).toBe(409);
    expect(json.error.code).toBe("slug-exists");
    expect(putCalled).toBe(false);
  });

  it("처리 순서 5: overwrite=true이면 대상 경로 충돌 후에도 PUT을 진행한다", async () => {
    // contracts/api.md 처리 순서 5
    let putCalled = false;

    server.use(
      http.get(`${repoBase}/contents/*`, ({ request }) => {
        const contentPath = githubContentPath(request.url);
        if (contentPath === "content/drafts/existing-post.mdx") {
          return HttpResponse.json(githubContentFile(contentPath, "overwrite-sha"));
        }

        return HttpResponse.json({ message: "Not Found" }, { status: 404 });
      }),
      http.put(`${repoBase}/contents/*`, async () => {
        putCalled = true;
        return HttpResponse.json({
          content: { sha: "overwritten-content-sha" },
          commit: {
            sha: "overwrite-commit-sha",
            html_url: "https://github.com/test-owner/test-repo/commit/overwrite-commit-sha",
          },
        });
      }),
    );

    const response = await callPost({
      action: "save-draft",
      slug: "existing-post",
      frontmatter: validFrontmatter,
      body: "Overwrite body",
      overwrite: true,
    });

    const json = await jsonOf<PostActionResponse>(response);
    expect(response.status).toBe(200);
    expect(json.status).toBe("draft");
    expect(putCalled).toBe(true);
  });

  it("처리 순서 6: GitHub PUT 409는 stale-sha로 변환한다", async () => {
    // contracts/api.md 처리 순서 6
    server.use(
      http.put(`${repoBase}/contents/*`, () =>
        HttpResponse.json({ message: "sha does not match" }, { status: 409 }),
      ),
    );

    const response = await callPost({
      action: "save-draft",
      slug: "stale-post",
      frontmatter: validFrontmatter,
      body: "Stale body",
      sha: "old-sha",
    });

    const json = await jsonOf<ApiErrorBody>(response);
    expect(response.status).toBe(409);
    expect(json.error.code).toBe("stale-sha");
  });
});
