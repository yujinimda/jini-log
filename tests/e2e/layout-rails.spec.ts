// 3단 레일 레이아웃 + 헤더 어드민 진입점 (C4)
// 근거: 좌측 "전체 글" 레일은 어느 공개 페이지에서든 노출되고, xl(1280px) 미만에서는 숨는다.
import { expect, test } from "@playwright/test";

const WIDE = { width: 1440, height: 900 };
const NARROW = { width: 1024, height: 900 };

test.describe("좌측 전체 글 레일", () => {
  test.use({ viewport: WIDE });

  for (const [label, path] of [
    ["홈", "/"],
    ["태그", "/tags/meta"],
    ["글 상세", "/posts/hello-world"],
  ] as const) {
    test(`${label}에서 전체 글 레일이 보이고 발행 글 전부를 링크한다`, async ({ page }) => {
      await page.goto(path);

      const rail = page.getByRole("navigation", { name: "전체 글" });
      await expect(rail).toBeVisible();

      // 발행 글 2건 모두 — 어디서든 전체 목록에 닿을 수 있어야 한다
      await expect(rail.getByRole("link", { name: /지니로그 시작/ })).toBeVisible();
      await expect(rail.getByRole("link", { name: /Promise/ })).toBeVisible();
    });
  }

  test("현재 보고 있는 글은 레일에서 aria-current로 표시된다", async ({ page }) => {
    await page.goto("/posts/hello-world");

    const rail = page.getByRole("navigation", { name: "전체 글" });
    await expect(rail.getByRole("link", { name: /지니로그 시작/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    // 다른 글에는 붙지 않는다
    await expect(rail.getByRole("link", { name: /Promise/ })).not.toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("레일 링크로 글을 이동할 수 있다", async ({ page }) => {
    await page.goto("/posts/hello-world");

    await page.getByRole("navigation", { name: "전체 글" }).getByRole("link", { name: /Promise/ }).click();

    await expect(page).toHaveURL(/\/posts\/js-event-loop$/);
  });

  test("글 상세에서는 좌측 전체 글과 우측 목차가 함께 보인다", async ({ page }) => {
    await page.goto("/posts/js-event-loop");

    await expect(page.getByRole("navigation", { name: "전체 글" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "목차" }).first()).toBeVisible();
  });
});

test.describe("좁은 화면", () => {
  test.use({ viewport: NARROW });

  test("xl 미만에서는 전체 글 레일을 숨긴다", async ({ page }) => {
    await page.goto("/");

    // DOM에는 있지만 보이지 않아야 한다 (xl:block)
    await expect(page.getByRole("navigation", { name: "전체 글" })).toBeHidden();
  });

  test("레일이 숨어도 본문 글 목록은 그대로 동작한다", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("main").getByRole("link", { name: /지니로그 시작/ })).toBeVisible();
  });
});

test.describe("헤더 어드민 진입점", () => {
  test("비로그인 상태에서는 '로그인'으로 표시되고 /admin을 가리킨다", async ({ page }) => {
    await page.goto("/");

    const link = page.locator('header a[href="/admin"]');
    await expect(link).toHaveText("로그인");
  });

  test("정적 HTML에는 항상 '로그인'이 들어간다 — SSG를 잃지 않기 위한 계약", async ({
    request,
  }) => {
    // 서버에서 세션을 조회하면 전 페이지가 동적이 된다. 문구 교체는 클라이언트 몫이다.
    const html = await (await request.get("/")).text();
    expect(html).toContain(">로그인</a>");
    expect(html).not.toContain(">대시보드</a>");
  });
});
