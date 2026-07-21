import { existsSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { isOperator } from "@/lib/auth";
import { getPublishedPosts } from "@/lib/content";
import { incrementView } from "@/lib/views";

// 레인 B/C가 아직 라우트를 구현하지 않음 — 모듈 부재 시 skip (구현 머지 후 자동 활성화)
// specifier를 변수로 우회: tsc가 미존재 모듈을 정적 해석하지 않게 함 (vitest는 런타임에 alias 해석)
const routeFile = path.resolve(__dirname, "../../app/api/views/route.ts");
const routeSpecifier: string = "@/app/api/views/route";
const routeModule = existsSync(routeFile)
  ? ((await import(routeSpecifier)) as { POST: (request: Request) => Promise<Response> })
  : null;
const describeRoute = describe.skipIf(!routeModule);

vi.mock("@/lib/auth", () => ({
  isOperator: vi.fn(),
}));

vi.mock("@/lib/views", () => ({
  incrementView: vi.fn(),
}));

vi.mock("@/lib/content", () => ({
  getPublishedPosts: vi.fn(),
}));

const publishedPost = {
  slug: "hello-world",
  title: "Hello World",
  description: "첫 글",
  date: "2026-07-21",
  tags: ["blog"],
  status: "published" as const,
};

function arrangeDefault() {
  vi.mocked(isOperator).mockResolvedValue(false);
  vi.mocked(incrementView).mockResolvedValue(undefined);
  vi.mocked(getPublishedPosts).mockResolvedValue([publishedPost]);
}

function postViews(body?: BodyInit | null, headers?: HeadersInit) {
  return routeModule!.POST(
    new Request("http://localhost/api/views", {
      method: "POST",
      body,
      headers,
    }),
  );
}

afterEach(() => {
  vi.clearAllMocks();
});

describeRoute("POST /api/views", () => {
  it("일반 독자의 발행 글 조회를 1회 기록하고 204 body 없음으로 응답한다", async () => {
    arrangeDefault();

    // FR-010 일반 독자 조회는 글별 조회수에 누적
    const response = await postViews(JSON.stringify({ slug: "hello-world" }), {
      "content-type": "application/json",
      // 밋밋한 "Mozilla/5.0" 단독 UA는 isbot이 봇으로 판정한다 — 실제 브라우저 UA 사용
"user-agent":
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    });

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(incrementView).toHaveBeenCalledTimes(1);
    expect(incrementView).toHaveBeenCalledWith("hello-world");
  });

  it("운영자 세션 조회는 기록하지 않고 204로 응답한다", async () => {
    arrangeDefault();
    vi.mocked(isOperator).mockResolvedValue(true);

    // FR-010 운영자 제외
    const response = await postViews(JSON.stringify({ slug: "hello-world" }), {
      "content-type": "application/json",
      // 밋밋한 "Mozilla/5.0" 단독 UA는 isbot이 봇으로 판정한다 — 실제 브라우저 UA 사용
"user-agent":
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    });

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(incrementView).not.toHaveBeenCalled();
  });

  it("알려진 봇 user-agent 조회는 기록하지 않고 204로 응답한다", async () => {
    arrangeDefault();

    // FR-010 알려진 봇 제외
    const response = await postViews(JSON.stringify({ slug: "hello-world" }), {
      "content-type": "application/json",
      "user-agent": "Googlebot/2.1 (+http://www.google.com/bot.html)",
    });

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(incrementView).not.toHaveBeenCalled();
  });

  it("미발행 slug는 테이블 오염 방지를 위해 기록하지 않고 204로 응답한다", async () => {
    arrangeDefault();

    // contracts/api.md: 발행 글 목록에 없으면 기록하지 않음
    const response = await postViews(JSON.stringify({ slug: "no-such-post" }), {
      "content-type": "application/json",
      // 밋밋한 "Mozilla/5.0" 단독 UA는 isbot이 봇으로 판정한다 — 실제 브라우저 UA 사용
"user-agent":
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    });

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(incrementView).not.toHaveBeenCalled();
  });

  it("incrementView가 실패해도 fire-and-forget으로 삼키고 204로 응답한다", async () => {
    arrangeDefault();
    vi.mocked(incrementView).mockRejectedValue(new Error("db down"));

    // FR-010 조회수 기록 실패는 독자 열람에 영향 없음
    const response = await postViews(JSON.stringify({ slug: "hello-world" }), {
      "content-type": "application/json",
      // 밋밋한 "Mozilla/5.0" 단독 UA는 isbot이 봇으로 판정한다 — 실제 브라우저 UA 사용
"user-agent":
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    });

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(incrementView).toHaveBeenCalledWith("hello-world");
  });

  it("body가 없거나 JSON이 아니어도 기록하지 않고 204로 응답한다", async () => {
    arrangeDefault();

    // contracts/api.md: POST /api/views는 항상 204
    const noBodyResponse = await postViews(undefined, {
      "content-type": "application/json",
      // 밋밋한 "Mozilla/5.0" 단독 UA는 isbot이 봇으로 판정한다 — 실제 브라우저 UA 사용
"user-agent":
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    });
    const invalidJsonResponse = await postViews("not-json", {
      "content-type": "application/json",
      // 밋밋한 "Mozilla/5.0" 단독 UA는 isbot이 봇으로 판정한다 — 실제 브라우저 UA 사용
"user-agent":
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    });

    expect(noBodyResponse.status).toBe(204);
    expect(await noBodyResponse.text()).toBe("");
    expect(invalidJsonResponse.status).toBe(204);
    expect(await invalidJsonResponse.text()).toBe("");
    expect(incrementView).not.toHaveBeenCalled();
  });

  it("sendBeacon 호환 text/plain JSON 문자열 body를 처리한다", async () => {
    arrangeDefault();

    // contracts/api.md: sendBeacon text/plain 허용
    const response = await postViews(JSON.stringify({ slug: "hello-world" }), {
      "content-type": "text/plain",
      // 밋밋한 "Mozilla/5.0" 단독 UA는 isbot이 봇으로 판정한다 — 실제 브라우저 UA 사용
"user-agent":
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    });

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(incrementView).toHaveBeenCalledTimes(1);
    expect(incrementView).toHaveBeenCalledWith("hello-world");
  });
});
