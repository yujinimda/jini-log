import { existsSync } from "node:fs";
import path from "node:path";
import { Buffer } from "node:buffer";
import { beforeAll, beforeEach, afterEach, afterAll, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import type { ApiErrorBody } from "@/lib/types";

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

type ImageResponse = {
  ok: true;
  path: string;
};

// 레인 C가 아직 라우트를 구현하지 않음 — 모듈 부재 시 skip (구현 머지 후 자동 활성화)
// specifier를 변수로 우회: tsc가 미존재 모듈을 정적 해석하지 않게 함 (vitest는 런타임에 alias 해석)
const routeFile = path.resolve(__dirname, "../../app/api/admin/images/route.ts");
const routeSpecifier: string = "@/app/api/admin/images/route";
const routeModule = existsSync(routeFile)
  ? ((await import(routeSpecifier)) as RouteModule)
  : null;
const describeRoute = describe.skipIf(!routeModule);

const GITHUB_API = "https://api.github.com";
const repoBase = `${GITHUB_API}/repos/test-owner/test-repo`;

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

function imageRequest(req: Record<string, unknown>) {
  return new Request("http://localhost/api/admin/images", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req),
  });
}

async function callPost(req: Record<string, unknown>) {
  return await routeModule!.POST(imageRequest(req));
}

async function jsonOf<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

function githubContentPath(url: string) {
  // Octokit은 path 파라미터를 통째로 인코딩한다(%2F 포함) — 실제 GitHub API는 양쪽 다 수용
  return decodeURIComponent(
    new URL(url).pathname.replace("/repos/test-owner/test-repo/contents/", ""),
  );
}

function pngBase64(extraBytes = 16) {
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ...Array.from({ length: extraBytes }, () => 0x00),
  ]).toString("base64");
}

describeRoute("POST /api/admin/images", () => {
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

  it("유효 PNG는 public/images/{slug}/shot.png에 PUT하고 공개 path를 반환한다", async () => {
    // contracts/api.md images: 허용 이미지 매직 바이트 검증 후 저장
    let putPath = "";
    let putBody: Record<string, unknown> | null = null;

    server.use(
      http.put(`${repoBase}/contents/*`, async ({ request }) => {
        putPath = githubContentPath(request.url);
        putBody = (await request.json()) as Record<string, unknown>;

        return HttpResponse.json({
          content: { sha: "image-content-sha" },
          commit: {
            sha: "image-commit-sha",
            html_url: "https://github.com/test-owner/test-repo/commit/image-commit-sha",
          },
        });
      }),
    );

    const response = await callPost({
      slug: "image-post",
      filename: "shot.png",
      data: pngBase64(),
    });

    const json = await jsonOf<ImageResponse>(response);
    expect(response.status).toBe(200);
    expect(json).toEqual({ ok: true, path: "/images/image-post/shot.png" });
    expect(putPath).toBe("public/images/image-post/shot.png");
    // 이미지 커밋 메시지 문구는 계약에 미규정 — 커밋 메시지 존재만 단언
    expect(putBody).toEqual(expect.objectContaining({ message: expect.any(String) }));
    expect(String(putBody!.content).length).toBeGreaterThan(0);
  });

  it("SVG 파일명은 invalid-image로 거부한다", async () => {
    // contracts/api.md images: SVG 제외
    const response = await callPost({
      slug: "image-post",
      filename: "x.svg",
      data: Buffer.from("<svg></svg>").toString("base64"),
    });

    const json = await jsonOf<ApiErrorBody>(response);
    expect(response.status).toBe(400);
    expect(json.error.code).toBe("invalid-image");
  });

  it("SVG 내용은 확장자와 무관하게 invalid-image로 거부한다", async () => {
    // contracts/api.md images: 매직 바이트 검증
    const response = await callPost({
      slug: "image-post",
      filename: "x.png",
      data: Buffer.from("<svg></svg>").toString("base64"),
    });

    const json = await jsonOf<ApiErrorBody>(response);
    expect(response.status).toBe(400);
    expect(json.error.code).toBe("invalid-image");
  });

  it("확장자는 png지만 데이터 매직 바이트가 맞지 않으면 invalid-image로 거부한다", async () => {
    // contracts/api.md images: 확장자 위장 방지
    const response = await callPost({
      slug: "image-post",
      filename: "fake.png",
      data: Buffer.from("not a png").toString("base64"),
    });

    const json = await jsonOf<ApiErrorBody>(response);
    expect(response.status).toBe(400);
    expect(json.error.code).toBe("invalid-image");
  });

  it("3MB 초과 데이터는 invalid-image로 거부한다", async () => {
    // contracts/api.md images: 원본 최대 3MB (base64 팽창 고려 — 계약 v2)
    const oversized = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.alloc(3 * 1024 * 1024 + 1),
    ]).toString("base64");

    const response = await callPost({
      slug: "image-post",
      filename: "large.png",
      data: oversized,
    });

    const json = await jsonOf<ApiErrorBody>(response);
    expect(response.status).toBe(400);
    expect(json.error.code).toBe("invalid-image");
  });

  it("파일명 충돌 시 -1 접미사를 붙여 저장한다", async () => {
    // contracts/api.md images: 파일명 충돌 시 -1, -2 접미사 자동 부여
    let putPath = "";

    server.use(
      http.get(`${repoBase}/contents/*`, ({ request }) => {
        const contentPath = githubContentPath(request.url);
        if (contentPath === "public/images/image-post/shot.png") {
          return HttpResponse.json({
            type: "file", // lib/github.ts getFile이 type을 검사한다
            name: "shot.png",
            path: contentPath,
            sha: "existing-image-sha",
            content: "",
            encoding: "base64",
          });
        }

        return HttpResponse.json({ message: "Not Found" }, { status: 404 });
      }),
      http.put(`${repoBase}/contents/*`, ({ request }) => {
        putPath = githubContentPath(request.url);

        return HttpResponse.json({
          content: { sha: "image-content-sha" },
          commit: {
            sha: "image-commit-sha",
            html_url: "https://github.com/test-owner/test-repo/commit/image-commit-sha",
          },
        });
      }),
    );

    const response = await callPost({
      slug: "image-post",
      filename: "shot.png",
      data: pngBase64(),
    });

    const json = await jsonOf<ImageResponse>(response);
    expect(response.status).toBe(200);
    expect(json.path).toBe("/images/image-post/shot-1.png");
    expect(putPath).toBe("public/images/image-post/shot-1.png");
  });

  it("GitHub 5xx는 github-error 502로 변환한다", async () => {
    // contracts/api.md images: GitHub 실패는 502 github-error
    server.use(
      http.put(`${repoBase}/contents/*`, () =>
        HttpResponse.json({ message: "GitHub unavailable" }, { status: 500 }),
      ),
    );

    const response = await callPost({
      slug: "image-post",
      filename: "shot.png",
      data: pngBase64(),
    });

    const json = await jsonOf<ApiErrorBody>(response);
    expect(response.status).toBe(502);
    expect(json.error.code).toBe("github-error");
  });

  it("미인증 요청은 401을 반환한다", async () => {
    // contracts/api.md 공통 규약: 모든 /api/admin/* 미인증 401
    setAnonymousAuth();

    const response = await callPost({
      slug: "image-post",
      filename: "shot.png",
      data: pngBase64(),
    });

    const json = await jsonOf<ApiErrorBody>(response);
    expect(response.status).toBe(401);
    // 계약은 401 + 공통 에러 형식만 규정 — code 문자열은 구현 재량
    expect(json.error.code).toEqual(expect.any(String));
  });
});
