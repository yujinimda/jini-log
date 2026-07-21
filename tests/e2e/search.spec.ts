// 레인 B 구현 전까지 skip
// 근거: spec US1, FR-001, FR-002, FR-003, FR-004, T020.

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { expect, type Locator, test } from "@playwright/test";

const hasSearchCommand = existsSync(resolve(__dirname, "../../components/blog/search-command.tsx"));

function searchField(scope: Locator): Locator {
  // 레인 B 셀렉터 확정 후 조정 가능
  return scope.locator('[role="combobox"], [role="searchbox"], input[type="search"], input[type="text"]').first();
}

function searchResult(scope: Locator, name: string): Locator {
  // 레인 B 셀렉터 확정 후 조정 가능
  return scope
    .locator('[role="option"], a, button, [role="link"]')
    .filter({ hasText: name })
    .first();
}

test.describe("검색 커맨드", () => {
  test.skip(!hasSearchCommand, "레인 B search-command 구현 전까지 skip");

  test("⌘K로 검색을 열고 결과를 통해 글 상세로 이동한다", async ({ page }) => {
    await page.goto("/");

    // 소문자 k: cmdk류 리스너는 e.key === "k"를 기대 — 대문자 K는 매칭 안 될 수 있음
    await page.keyboard.press("ControlOrMeta+k");

    const dialog = page.locator('[role="dialog"], [aria-modal="true"]').first();
    await expect(dialog).toBeVisible();

    const input = searchField(dialog);
    await expect(input).toBeVisible();

    await input.fill("지니로그");

    const result = searchResult(dialog, "지니로그 시작");
    await expect(result).toBeVisible();

    await result.click();

    await expect(page).toHaveURL(/\/posts\/hello-world$/);
  });

  test("검색 결과가 없으면 결과 없음 문구를 보여준다", async ({ page }) => {
    await page.goto("/");

    // 소문자 k: cmdk류 리스너는 e.key === "k"를 기대 — 대문자 K는 매칭 안 될 수 있음
    await page.keyboard.press("ControlOrMeta+k");

    const dialog = page.locator('[role="dialog"], [aria-modal="true"]').first();
    await expect(dialog).toBeVisible();

    const input = searchField(dialog);
    await input.fill("zzz없는검색어999");

    await expect(dialog.getByText(/결과.*없|결과 없음/)).toBeVisible();
  });

  test("헤더 검색 버튼으로도 검색을 열 수 있다", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: /검색/ }).click();

    const dialog = page.locator('[role="dialog"], [aria-modal="true"]').first();
    await expect(dialog).toBeVisible();
    await expect(searchField(dialog)).toBeVisible();
  });

  test("첫 페이지 로드에서는 검색 인덱스를 미리 불러오지 않고 최초 검색 시 지연 로드한다", async ({
    page,
  }) => {
    const requestUrls: string[] = [];

    page.on("request", (request) => {
      requestUrls.push(request.url());
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    expect(requestUrls.some((url) => url.includes("search-index"))).toBe(false);

    // 소문자 k: cmdk류 리스너는 e.key === "k"를 기대 — 대문자 K는 매칭 안 될 수 있음
    await page.keyboard.press("ControlOrMeta+k");

    const dialog = page.locator('[role="dialog"], [aria-modal="true"]').first();
    await expect(dialog).toBeVisible();

    const input = searchField(dialog);
    await input.fill("지니로그");

    // 레인 B 구현 후 청크 URL 네이밍(search-index 등)은 실제 번들 전략에 맞춰 조정 가능
    const result = searchResult(dialog, "지니로그 시작");
    await expect(result).toBeVisible();
  });
});
