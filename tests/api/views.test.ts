import { existsSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { isOperator } from "@/lib/auth";
import { getPublishedPosts } from "@/lib/content";
import { incrementReferrer } from "@/lib/referrers";
import { getViewTotals, incrementView } from "@/lib/views";

// 레인 B/C가 아직 라우트를 구현하지 않음 — 모듈 부재 시 skip (구현 머지 후 자동 활성화)
// specifier를 변수로 우회: tsc가 미존재 모듈을 정적 해석하지 않게 함 (vitest는 런타임에 alias 해석)
const routeFile = path.resolve(__dirname, "../../app/api/views/route.ts");
const routeSpecifier: string = "@/app/api/views/route";
const routeModule = existsSync(routeFile)
  ? ((await import(routeSpecifier)) as {
      POST: (request: Request) => Promise<Response>;
      GET: () => Promise<Response>;
    })
  : null;
const describeRoute = describe.skipIf(!routeModule);

vi.mock("@/lib/auth", () => ({
  isOperator: vi.fn(),
}));

vi.mock("@/lib/views", () => ({
  incrementView: vi.fn(),
  // 라우트 모듈이 GET에서도 import한다 — 팩토리에 없으면 named import가 터진다
  getViewTotals: vi.fn(),
}));

vi.mock("@/lib/content", () => ({
  getPublishedPosts: vi.fn(),
}));

// 분류(classifyReferrerHost)는 순수 함수라 실제 구현을 쓰고, 기록만 가로챈다 (C4)
vi.mock("@/lib/referrers", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/referrers")>()),
  incrementReferrer: vi.fn(),
}));

const publishedPost = {
  slug: "hello-world",
  title: "Hello World",
  description: "첫 글",
  date: "2026-07-21",
  tags: ["blog"],
  status: "published" as const,
  // getPublishedPosts가 PostDerived[]로 확장됨 (002 R6)
  excerpt: "첫 글",
};

function arrangeDefault() {
  // 조회 기록은 프로덕션 배포에서만 동작한다 (C2) — 기본 케이스는 그 런타임을 가정
  vi.stubEnv("VERCEL_ENV", "production");
  vi.mocked(isOperator).mockResolvedValue(false);
  vi.mocked(incrementView).mockResolvedValue(undefined);
  vi.mocked(incrementReferrer).mockResolvedValue(undefined);
  vi.mocked(getPublishedPosts).mockResolvedValue([publishedPost]);
}

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

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
  vi.unstubAllEnvs();
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

  it.each([
    ["로컬 개발 (VERCEL_ENV 없음)", undefined],
    ["preview 배포", "preview"],
    ["development 배포", "development"],
  ])("%s에서는 기록하지 않고 204로 응답한다", async (_label, vercelEnv) => {
    arrangeDefault();
    // C2: 로컬·preview가 프로덕션 조회수를 오염시키지 않아야 한다
    if (vercelEnv === undefined) vi.stubEnv("VERCEL_ENV", "");
    else vi.stubEnv("VERCEL_ENV", vercelEnv);

    const response = await postViews(JSON.stringify({ slug: "hello-world" }), {
      "content-type": "application/json",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    });

    expect(response.status).toBe(204);
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

describeRoute("POST /api/views — 유입 출처 (C4)", () => {
  it("유입 호스트를 안정 키로 정규화해 기록한다", async () => {
    arrangeDefault();

    await postViews(
      JSON.stringify({ slug: "hello-world", referrerHost: "www.google.com" }),
      { "content-type": "text/plain", "user-agent": BROWSER_UA },
    );

    expect(incrementReferrer).toHaveBeenCalledExactlyOnceWith("hello-world", "google");
    // 저장되는 값은 안정 키뿐 — 호스트명조차 그대로 들어가지 않는다
    expect(JSON.stringify(vi.mocked(incrementReferrer).mock.calls)).not.toContain("google.com");
  });

  it("사이트 내 이동은 유입으로 기록하지 않는다", async () => {
    arrangeDefault();

    // Request host = localhost — 같은 호스트에서 온 리퍼러
    await postViews(
      JSON.stringify({ slug: "hello-world", referrerHost: "localhost" }),
      { "content-type": "text/plain", "user-agent": BROWSER_UA },
    );

    expect(incrementView).toHaveBeenCalledTimes(1);
    expect(incrementReferrer).not.toHaveBeenCalled();
  });

  it("호스트가 빈 문자열이면 direct로 기록한다", async () => {
    arrangeDefault();

    await postViews(JSON.stringify({ slug: "hello-world", referrerHost: "" }), {
      "content-type": "text/plain",
      "user-agent": BROWSER_UA,
    });

    expect(incrementReferrer).toHaveBeenCalledExactlyOnceWith("hello-world", "direct");
  });

  it("referrerHost 필드가 없으면(세션 첫 글이 아님) 조회수만 기록한다", async () => {
    arrangeDefault();

    await postViews(JSON.stringify({ slug: "hello-world" }), {
      "content-type": "text/plain",
      "user-agent": BROWSER_UA,
    });

    expect(incrementView).toHaveBeenCalledTimes(1);
    expect(incrementReferrer).not.toHaveBeenCalled();
  });

  it("유입 기록이 실패해도 조회수 기록은 유지되고 204로 응답한다", async () => {
    arrangeDefault();
    vi.mocked(incrementReferrer).mockRejectedValue(new Error("db down"));

    // 부가 지표 실패가 본 지표를 깨면 안 된다
    const response = await postViews(
      JSON.stringify({ slug: "hello-world", referrerHost: "x.com" }),
      { "content-type": "text/plain", "user-agent": BROWSER_UA },
    );

    expect(response.status).toBe(204);
    expect(incrementView).toHaveBeenCalledTimes(1);
  });

  it("봇·운영자·비프로덕션에서는 유입도 기록하지 않는다", async () => {
    arrangeDefault();
    await postViews(JSON.stringify({ slug: "hello-world", referrerHost: "www.google.com" }), {
      "content-type": "text/plain",
      "user-agent": "Googlebot/2.1 (+http://www.google.com/bot.html)",
    });
    expect(incrementReferrer).not.toHaveBeenCalled();

    vi.clearAllMocks();
    arrangeDefault();
    vi.mocked(isOperator).mockResolvedValue(true);
    await postViews(JSON.stringify({ slug: "hello-world", referrerHost: "www.google.com" }), {
      "content-type": "text/plain",
      "user-agent": BROWSER_UA,
    });
    expect(incrementReferrer).not.toHaveBeenCalled();

    vi.clearAllMocks();
    arrangeDefault();
    vi.stubEnv("VERCEL_ENV", "preview");
    await postViews(JSON.stringify({ slug: "hello-world", referrerHost: "www.google.com" }), {
      "content-type": "text/plain",
      "user-agent": BROWSER_UA,
    });
    expect(incrementReferrer).not.toHaveBeenCalled();
  });
});

describeRoute("GET /api/views", () => {
  it("글별 누적 조회수 맵을 반환한다", async () => {
    vi.mocked(getViewTotals).mockResolvedValue({ "hello-world": 12, "js-event-loop": 340 });

    const response = await routeModule!.GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ "hello-world": 12, "js-event-loop": 340 });
  });

  it("조회수 조회가 실패해도 빈 맵으로 200을 반환한다 (독자 화면 보호)", async () => {
    vi.mocked(getViewTotals).mockRejectedValue(new Error("db down"));

    const response = await routeModule!.GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({});
  });

  it("캐시되지 않도록 no-store로 응답한다", async () => {
    vi.mocked(getViewTotals).mockResolvedValue({});

    const response = await routeModule!.GET();

    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
