// 레인 B/C 구현 전까지 실패가 정상입니다.
// 근거: quickstart V5, spec US4, SC-005, FR-010, POST /api/views 계약.

import { expect, type Page, test } from "@playwright/test";
import { adminSessionCookie } from "./helpers/auth";
import { anyPost } from "./helpers/content";

const sample = anyPost();
const POST_SLUG = sample.slug;

/**
 * 대시보드에 이 글이 떠 있는가 — 조회수를 읽기 전에 확인할 전제.
 *
 * 대시보드는 로컬 파일이 아니라 **GitHub 기본 브랜치**를 읽는다(lib/github.ts).
 * 그래서 아직 푸시하지 않은 새 글은 로컬 빌드에는 있어도 대시보드에는 없다.
 * 픽스처는 로컬 `content/posts`에서 고르므로(helpers/content.ts), 파일명이
 * 사전순으로 앞서는 글을 새로 만들면 픽스처가 그쪽으로 바뀌면서 이 테스트가 깨졌다.
 *
 * 콘텐츠 결함이 아니라 "아직 안 올라간 글"이므로 실패가 아니라 skip이 맞다.
 */
async function isListedInDashboard(page: Page, slug: string): Promise<boolean> {
  await page.goto("/admin");
  return await page
    .getByText(slug)
    .first()
    .isVisible()
    .catch(() => false);
}

async function readDashboardViewCount(page: Page, slug: string): Promise<number> {
  await page.goto("/admin");

  await expect(page.getByText(slug)).toBeVisible();

  // 레인 C 구현 후 셀렉터 조정 가능: 현재는 slug가 있는 행/카드 근처 숫자를 느슨하게 읽는다.
  const row = page
    .locator("tr, [role='row'], article, li, section, div")
    .filter({ hasText: slug })
    .first();

  await expect(row).toBeVisible();

  const text = (await row.textContent()) ?? "";
  const numbers = text.match(/\d+/g) ?? [];
  const lastNumber = numbers.at(-1);

  expect(lastNumber, `대시보드에서 ${slug} 근처 조회수 숫자를 찾지 못했습니다.`).toBeTruthy();

  return Number(lastNumber);
}

test.describe("조회수 표시", () => {
  test("홈 카드에 조회수가 채워지고, 카드가 N개여도 GET /api/views는 1번만 나간다", async ({
    page,
  }) => {
    const getRequests: string[] = [];
    page.on("request", (request) => {
      if (request.method() === "GET" && request.url().includes("/api/views")) {
        getRequests.push(request.url());
      }
    });

    await page.goto("/");

    const counts = page.locator("article .tabular-nums");
    await expect(counts.first()).toHaveText(/^조회 [\d,]+$/);

    // 카드마다 fetch하면 N번 나간다 — in-flight 프로미스 공유로 1번이어야 한다.
    // 글 수는 운영 중에 변하므로 "1개 초과"를 전제하지 않는다 (C5)
    expect(await counts.count()).toBeGreaterThanOrEqual(1);
    expect(getRequests).toHaveLength(1);
  });

  test("글 상세는 조회 기록(POST)과 표시(GET)를 각각 1번씩 수행한다", async ({ page }) => {
    const calls: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/api/views")) calls.push(request.method());
    });

    await page.goto(`/posts/${POST_SLUG}`);
    await expect(page.locator(".tabular-nums").first()).toHaveText(/^조회 [\d,]+$/);

    expect(calls.filter((m) => m === "POST")).toHaveLength(1);
    expect(calls.filter((m) => m === "GET")).toHaveLength(1);
  });
});

test.describe("운영자 조회 제외", () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies([await adminSessionCookie()]);
  });

  test("운영자 로그인 상태로 글을 반복 방문해도 조회수가 변하지 않는다", async ({ page }) => {
    test.skip(
      !(await isListedInDashboard(page, POST_SLUG)),
      `${POST_SLUG}가 아직 GitHub 기본 브랜치에 없어 대시보드에 뜨지 않습니다 (푸시 후 자동 활성화)`,
    );

    const before = await readDashboardViewCount(page, POST_SLUG);
    const viewRequests: string[] = [];

    page.on("request", (request) => {
      if (request.method() === "POST" && request.url().includes("/api/views")) {
        viewRequests.push(request.url());
      }
    });

    await page.goto(`/posts/${POST_SLUG}`);
    await expect(page.getByRole("heading", { level: 1, name: sample.title })).toBeVisible();

    await page.goto("/");
    await page.goto(`/posts/${POST_SLUG}`);
    await expect(page.getByRole("heading", { level: 1, name: sample.title })).toBeVisible();

    const after = await readDashboardViewCount(page, POST_SLUG);

    expect(after).toBe(before);
    expect(viewRequests.length).toBeGreaterThanOrEqual(1);
  });

  test("봇 User-Agent의 POST /api/views는 204를 반환하고 조회수를 올리지 않는다", async ({ page, request }) => {
    test.skip(
      !(await isListedInDashboard(page, POST_SLUG)),
      `${POST_SLUG}가 아직 GitHub 기본 브랜치에 없어 대시보드에 뜨지 않습니다 (푸시 후 자동 활성화)`,
    );

    const before = await readDashboardViewCount(page, POST_SLUG);

    const response = await request.post("/api/views", {
      headers: {
        "user-agent": "Googlebot/2.1",
      },
      data: {
        slug: POST_SLUG,
      },
    });

    expect(response.status()).toBe(204);

    await expect.poll(async () => readDashboardViewCount(page, POST_SLUG)).toBe(before);
  });

  test("존재하지 않는 slug의 POST /api/views도 항상 204를 반환한다", async ({ request }) => {
    const response = await request.post("/api/views", {
      data: {
        slug: "no-such-post",
      },
    });

    expect(response.status()).toBe(204);
  });
});
