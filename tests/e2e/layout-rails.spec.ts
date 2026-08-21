// 3단 레일 레이아웃 + 헤더 어드민 진입점 (C4 → C14 접기·분류 페이지)
// 근거: 좌측 "전체 글" 레일은 어느 공개 페이지에서든 노출되고, xl(1280px) 미만에서는 숨는다.
//
// 픽스처는 content/posts에서 읽는다 — 특정 글을 하드코딩하면 그 글을 지우는 순간 깨진다.
import { expect, test } from "@playwright/test";
import { anyPost, publishedPosts, titlePattern } from "./helpers/content";

const WIDE = { width: 1440, height: 900 };
const NARROW = { width: 1024, height: 900 };

const posts = publishedPosts();
const sample = anyPost();

// C14 계약: 레일은 전수 목록이 아니라 요약이다.
//   기본 전부 접힘 → 글 상세에서 현재 분류만 자동 열림 → 열린 분류는 최신 5개
//   (+ 현재 글이 그 밖이면 6번째) + 6개 초과 분류는 "전체 N개 →"(분류 페이지).
// 예전 "레일 링크 수 = 발행 글 수" 계약은 폐기 — 접힌 details 안의 링크는
// 접근성 트리에서 숨겨져 세지지 않고, 그게 맞는 동작이다.

const RECENT_COUNT = 5;

/** 분류별 글 (최신순) — 레일과 같은 규칙: 날짜 내림차순, 동률은 slug 오름차순 */
function postsOfCategory(category: string) {
  return posts
    .filter((p) => p.category === category)
    .sort((a, b) => (a.date === b.date ? (a.slug < b.slug ? -1 : 1) : a.date < b.date ? 1 : -1));
}

test.describe("좌측 전체 글 레일", () => {
  test.use({ viewport: WIDE });

  test("홈에서는 전부 접혀 있고, 분류명과 개수만 보인다", async ({ page }) => {
    await page.goto("/");

    const rail = page.getByRole("navigation", { name: "전체 글" });
    await expect(rail).toBeVisible();

    const categories = [...new Set(posts.map((p) => p.category))];
    for (const category of categories) {
      await expect(rail.getByText(category, { exact: true })).toBeVisible();
    }
    // 접힌 상태에서는 글 링크가 접근성 트리에 없어야 한다
    await expect(rail.getByRole("link")).toHaveCount(0);
  });

  test("분류를 클릭하면 최신 글이 열리고, 6개 초과면 '전체 →' 링크가 붙는다", async ({
    page,
  }) => {
    // 하이드레이션 전 클릭은 네이티브로 열렸다가 React(제어 컴포넌트)가 닫아버린다.
    // 홈은 마운트 후 GET /api/views 를 쏘므로 그 응답이 곧 "하이드레이션 완료" 신호다 —
    // 병렬 실행으로 dev 서버가 느릴 때도 결정적으로 기다릴 수 있다.
    const hydrated = page.waitForResponse((r) => r.url().includes("/api/views"));
    await page.goto("/");
    await hydrated;
    const rail = page.getByRole("navigation", { name: "전체 글" });

    const category = sample.category;
    const expected = postsOfCategory(category);
    const visible = expected.slice(0, RECENT_COUNT);

    // 재시도는 이중 안전장치 — 위 신호가 있어도 첫 클릭이 미끄러질 수 있다
    await expect(async () => {
      await rail.getByText(category, { exact: true }).click();
      await expect(rail.getByRole("link", { name: titlePattern(visible[0]) })).toBeVisible({
        timeout: 700,
      });
    }).toPass({ timeout: 10_000 });

    for (const post of visible) {
      await expect(rail.getByRole("link", { name: titlePattern(post) })).toBeVisible();
    }
    if (expected.length > RECENT_COUNT) {
      const more = rail.getByRole("link", { name: new RegExp(`전체`) });
      await expect(more).toBeVisible();
      await expect(more).toHaveAttribute(
        "href",
        `/categories/${encodeURIComponent(category)}`,
      );
    }
  });

  test("글 상세에서는 그 글의 분류만 열려 있다", async ({ page }) => {
    await page.goto(`/posts/${sample.slug}`);

    const rail = page.getByRole("navigation", { name: "전체 글" });
    const mine = postsOfCategory(sample.category);
    const latest = mine[0];
    await expect(rail.getByRole("link", { name: titlePattern(latest) })).toBeVisible();

    // 다른 분류는 접혀 있다 — 그 분류의 최신 글 링크가 보이지 않는다
    const otherCategory = [...new Set(posts.map((p) => p.category))].find(
      (c) => c !== sample.category,
    );
    if (otherCategory) {
      const otherLatest = postsOfCategory(otherCategory)[0];
      await expect(rail.getByRole("link", { name: titlePattern(otherLatest) })).toHaveCount(0);
    }
  });

  test("현재 보고 있는 글은 aria-current로 표시된다 — 최신 5개 밖이어도 6번째로 보인다", async ({
    page,
  }) => {
    // 최신 5개 밖의 글이 있으면 그 글로 검증 (6번째 노출 규칙까지 한 번에),
    // 없으면 아무 글이나 (aria-current만)
    const overflow = posts.find(
      (p) => postsOfCategory(p.category).findIndex((q) => q.slug === p.slug) >= RECENT_COUNT,
    );
    const target = overflow ?? sample;

    await page.goto(`/posts/${target.slug}`);

    const rail = page.getByRole("navigation", { name: "전체 글" });
    await expect(rail.getByRole("link", { name: titlePattern(target) })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("레일 링크로 다른 글로 이동하면 열리는 분류도 따라간다", async ({ page }) => {
    const mine = postsOfCategory(sample.category);
    const other = mine.slice(0, RECENT_COUNT).find((p) => p.slug !== sample.slug);
    test.skip(!other, "같은 분류에 최신 5개 안 다른 글이 없어 이동 검증 대상이 없습니다");

    await page.goto(`/posts/${sample.slug}`);
    await page
      .getByRole("navigation", { name: "전체 글" })
      .getByRole("link", { name: titlePattern(other!) })
      .click();

    await expect(page).toHaveURL(new RegExp(`/posts/${other!.slug}$`));
    // 이동한 글에 aria-current가 넘어왔는지 — 분류 자동 열림이 pathname을 따라간다는 계약
    await expect(
      page
        .getByRole("navigation", { name: "전체 글" })
        .getByRole("link", { name: titlePattern(other!) }),
    ).toHaveAttribute("aria-current", "page");
  });

  test("글 상세에서는 좌측 전체 글과 우측 목차가 함께 보인다", async ({ page }) => {
    const withToc = posts.find((p) => p.hasHeadings);
    test.skip(!withToc, "절 제목이 있는 글이 없어 목차 검증 대상이 없습니다");

    await page.goto(`/posts/${withToc!.slug}`);

    await expect(page.getByRole("navigation", { name: "전체 글" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "목차" }).first()).toBeVisible();
  });
});

test.describe("분류 페이지 (C14)", () => {
  test.use({ viewport: WIDE });

  test("분류의 글 전부가 날짜·요약과 함께 나열된다", async ({ page }) => {
    const category = sample.category;
    const expected = postsOfCategory(category);

    await page.goto(`/categories/${encodeURIComponent(category)}`);

    await expect(page.getByRole("heading", { level: 1, name: category })).toBeVisible();
    await expect(page.getByText(`글 ${expected.length}개`)).toBeVisible();
    for (const post of expected) {
      await expect(
        page.getByRole("main").getByRole("link", { name: titlePattern(post) }),
      ).toBeVisible();
    }
  });

  test("없는 분류는 404다", async ({ request }) => {
    const res = await request.get(`/categories/${encodeURIComponent("no-such-category")}`);
    expect(res.status()).toBe(404);
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

    await expect(
      page.getByRole("main").getByRole("link", { name: titlePattern(sample) }),
    ).toBeVisible();
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
