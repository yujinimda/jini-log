import { existsSync } from "node:fs";
import path from "node:path";
import { beforeAll, beforeEach, afterEach, afterAll, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import type { ApiErrorBody } from "@/lib/types";
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

type ValidateResponse = {
  valid: true;
};

// 레인 C가 아직 라우트를 구현하지 않음 — 모듈 부재 시 skip (구현 머지 후 자동 활성화)
// specifier를 변수로 우회: tsc가 미존재 모듈을 정적 해석하지 않게 함 (vitest는 런타임에 alias 해석)
const routeFile = path.resolve(__dirname, "../../app/api/admin/validate/route.ts");
const routeSpecifier: string = "@/app/api/admin/validate/route";
const routeModule = existsSync(routeFile)
  ? ((await import(routeSpecifier)) as RouteModule)
  : null;
const describeRoute = describe.skipIf(!routeModule);

const validFrontmatter: Frontmatter = {
  title: "Valid Post",
  description: "Valid frontmatter for validate API",
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

function validateRequest(req: Record<string, unknown>) {
  return new Request("http://localhost/api/admin/validate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req),
  });
}

async function callPost(req: Record<string, unknown>) {
  return await routeModule!.POST(validateRequest(req));
}

async function jsonOf<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

describeRoute("POST /api/admin/validate", () => {
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

  it("유효 frontmatter와 body는 valid true를 반환한다", async () => {
    // contracts/api.md validate: 저장 없이 저장 API와 동일 판정
    const response = await callPost({
      frontmatter: validFrontmatter,
      body: "## Valid body\n\nPlain MDX content.",
    });

    const json = await jsonOf<ValidateResponse>(response);
    expect(response.status).toBe(200);
    expect(json).toEqual({ valid: true });
  });

  it("frontmatter 오류는 422 invalid-frontmatter를 반환한다", async () => {
    // contracts/api.md validate: invalid-frontmatter 상세 반환
    const response = await callPost({
      frontmatter: {
        description: "Missing title",
        date: "2026-07-21",
        tags: [],
      },
      body: "Valid body",
    });

    const json = await jsonOf<ApiErrorBody>(response);
    expect(response.status).toBe(422);
    expect(json.error.code).toBe("invalid-frontmatter");
    expect(JSON.stringify(json.error.detail ?? json.error.message)).toContain("title");
  });

  it("미등록 컴포넌트는 422 invalid-mdx와 detail을 반환한다", async () => {
    // contracts/api.md validate: MDX 컴파일 검증은 미등록 컴포넌트 거부
    const response = await callPost({
      frontmatter: validFrontmatter,
      body: "<NoSuchComponent />",
    });

    const json = await jsonOf<ApiErrorBody>(response);
    expect(response.status).toBe(422);
    expect(json.error.code).toBe("invalid-mdx");
    expect(json.error.detail).toBeDefined();
  });

  it("깨진 JSX는 422 invalid-mdx와 detail을 반환한다", async () => {
    // contracts/api.md validate: 오류 위치/메시지를 detail에 포함
    const response = await callPost({
      frontmatter: validFrontmatter,
      body: "<div><span>broken</div>",
    });

    const json = await jsonOf<ApiErrorBody>(response);
    expect(response.status).toBe(422);
    expect(json.error.code).toBe("invalid-mdx");
    expect(json.error.detail).toBeDefined();
  });

  it("검증만 수행하고 GitHub API를 호출하지 않는다", async () => {
    // contracts/api.md validate: 저장 없이 검증만 수행
    let githubCalls = 0;

    server.use(
      http.all("https://api.github.com/*", () => {
        githubCalls += 1;
        return HttpResponse.json({ message: "unexpected github call" }, { status: 500 });
      }),
    );

    const response = await callPost({
      frontmatter: validFrontmatter,
      body: "No GitHub should be called.",
    });

    const json = await jsonOf<ValidateResponse>(response);
    expect(response.status).toBe(200);
    expect(json).toEqual({ valid: true });
    expect(githubCalls).toBe(0);
  });
});
