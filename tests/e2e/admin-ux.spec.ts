// 레인 C 구현 전까지 skip
// 근거: spec US3, FR-012, FR-013, FR-014, T025.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, type Locator, type Page, test } from "@playwright/test";
import { adminSessionCookie } from "./helpers/auth";

const postRowActionsPath = resolve(__dirname, "../../components/admin/dashboard/post-row-actions.tsx");
const adminLayoutPath = resolve(__dirname, "../../app/admin/layout.tsx");
const adminRootDirs = [resolve(__dirname, "../../app/admin"), resolve(__dirname, "../../components/admin")];

const postRowActionsSource = existsSync(postRowActionsPath) ? readFileSync(postRowActionsPath, "utf8") : "";
const hasAppDialog = existsSync(postRowActionsPath) && !postRowActionsSource.includes("window.confirm");
const hasAdminToaster = existsSync(adminLayoutPath) && readFileSync(adminLayoutPath, "utf8").includes("Toaster");
const hasSortableTable = findAdminSourceFiles(adminRootDirs).some((filePath) =>
  readFileSync(filePath, "utf8").includes("components/ui/table"),
);

function findAdminSourceFiles(rootDirs: string[]): string[] {
  const files: string[] = [];

  for (const rootDir of rootDirs) {
    if (!existsSync(rootDir)) continue;
    walk(rootDir, files);
  }

  return files;
}

function walk(dirPath: string, files: string[]) {
  for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
    const nextPath = resolve(dirPath, entry.name);

    if (entry.isDirectory()) {
      walk(nextPath, files);
      continue;
    }

    if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      files.push(nextPath);
    }
  }
}

async function dashboardTable(page: Page): Promise<Locator> {
  const table = page.getByRole("table").first();
  await expect(table).toBeVisible();
  return table;
}

async function postRow(page: Page, slug: string): Promise<Locator> {
  const matchingRow = page.locator("tbody tr").filter({ hasText: slug }).first();

  if ((await matchingRow.count()) > 0) {
    await expect(matchingRow).toBeVisible();
    return matchingRow;
  }

  const firstRow = page.locator("tbody tr").first();
  await expect(firstRow).toBeVisible();
  return firstRow;
}

async function openDeleteDialog(page: Page, slug: string): Promise<Locator> {
  const row = await postRow(page, slug);
  await row.getByRole("button", { name: "삭제" }).click();

  const dialog = page.locator('[role="dialog"], [role="alertdialog"]').first();
  await expect(dialog).toBeVisible();

  return dialog;
}

async function confirmDeleteWithRoute(
  page: Page,
  status: number,
  body: Record<string, unknown>,
): Promise<{ deleteRequests: number }> {
  let deleteRequests = 0;

  await page.route("**/api/admin/posts", async (route) => {
    const request = route.request();
    const method = request.method();
    const postData = request.postData() ?? "";
    const isDeleteAction = method === "POST" && /"action"\s*:\s*"delete"/.test(postData);

    if (isDeleteAction) {
      deleteRequests += 1;
      await route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
      return;
    }

    await route.continue();
  });

  const dialog = await openDeleteDialog(page, "test");

  // 클릭 직후 반환하면 요청이 아직 전송 전일 수 있음 — 응답 완료까지 대기 (라우트 fulfill 포함)
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/admin/posts") && response.request().method() === "POST",
  );
  await dialog.getByRole("button", { name: /확인|삭제/ }).click();
  await responsePromise;

  return { deleteRequests };
}

async function rowTitleTexts(table: Locator): Promise<string[]> {
  const rows = table.locator("tbody tr");
  const count = await rows.count();
  const titles: string[] = [];

  for (let index = 0; index < count; index += 1) {
    const row = rows.nth(index);
    const titleLink = row.getByRole("link").first();
    const title = (await titleLink.textContent())?.trim() ?? "";
    titles.push(title);
  }

  return titles;
}

test.beforeEach(async ({ context }) => {
  await context.addCookies([await adminSessionCookie()]);
});

test.describe("대시보드 앱 다이얼로그", () => {
  test.skip(!hasAppDialog, "레인 C Dialog 교체 전까지 skip");

  test("삭제 취소 시 앱 다이얼로그만 열리고 삭제 요청은 보내지 않는다", async ({ page }) => {
    const nativeDialogs: string[] = [];
    const deleteRequests: string[] = [];

    page.on("dialog", (dialog) => {
      nativeDialogs.push(dialog.message());
      void dialog.dismiss();
    });

    page.on("request", (request) => {
      if (request.method() !== "POST" || !request.url().includes("/api/admin/posts")) return;

      const postData = request.postData() ?? "";
      if (/"action"\s*:\s*"delete"/.test(postData)) {
        deleteRequests.push(postData);
      }
    });

    await page.goto("/admin");

    const dialog = await openDeleteDialog(page, "test");
    await expect(dialog.getByRole("button", { name: /취소/ })).toBeVisible();

    await dialog.getByRole("button", { name: /취소/ }).click();
    await expect(dialog).toBeHidden();
    await page.waitForTimeout(300);

    expect(deleteRequests).toHaveLength(0);
    expect(nativeDialogs).toEqual([]);
  });

  test("삭제 확인 시 브라우저 confirm 없이 delete 액션 요청을 보낸다", async ({ page }) => {
    const nativeDialogs: string[] = [];

    page.on("dialog", (dialog) => {
      nativeDialogs.push(dialog.message());
      void dialog.dismiss();
    });

    await page.goto("/admin");

    const result = await confirmDeleteWithRoute(page, 200, {
      ok: true,
      status: "deleted",
      commitUrl: "https://example.com/c",
      commitSha: "abc",
    });

    expect(result.deleteRequests).toBeGreaterThan(0);
    expect(nativeDialogs).toEqual([]);
  });
});

test.describe("대시보드 토스트", () => {
  test.skip(!hasAdminToaster, "레인 C Toaster 도입 전까지 skip");

  test("삭제 성공 후 성공 토스트를 표시한다", async ({ page }) => {
    await page.goto("/admin");

    await confirmDeleteWithRoute(page, 200, {
      ok: true,
      status: "deleted",
      commitUrl: "https://example.com/c",
      commitSha: "abc",
    });

    // sonner 기준, 셀렉터 조정 가능
    const toast = page
      .locator('[data-sonner-toast], [role="status"]')
      .filter({ hasText: /삭제|성공/ })
      .first();

    await expect(toast).toBeVisible();
  });

  test("삭제 실패 시 사유가 포함된 토스트를 표시하고 화면은 유지된다", async ({ page }) => {
    await page.goto("/admin");

    await confirmDeleteWithRoute(page, 500, {
      error: {
        code: "github-error",
        message: "GitHub API 오류가 발생했습니다",
      },
    });

    await expect(page.getByText(/GitHub API 오류/)).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "대시보드" })).toBeVisible();
  });
});

test.describe("대시보드 정렬", () => {
  test.skip(!hasSortableTable, "레인 C 대시보드 Table 정렬 전까지 skip");

  test("제목 정렬을 토글하면 행 순서가 반대로 바뀐다", async ({ page }) => {
    await page.goto("/admin");

    const table = await dashboardTable(page);
    const rows = table.locator("tbody tr");
    const rowCount = await rows.count();

    test.skip(rowCount < 2, "정렬 역전 검증에는 최소 2개 이상의 행이 필요합니다.");

    const titleHeader = table.getByRole("columnheader", { name: "제목" });
    await expect(titleHeader).toBeVisible();

    await titleHeader.click();
    const firstOrder = await rowTitleTexts(table);

    await titleHeader.click();
    const secondOrder = await rowTitleTexts(table);

    expect(secondOrder).toEqual([...firstOrder].reverse());
  });

  test("기본 정렬은 발행일 기준 내림차순 계약을 따른다", async ({ page }) => {
    await page.goto("/admin");

    const table = await dashboardTable(page);
    await expect(table.getByRole("columnheader", { name: "발행일" })).toBeVisible();
    expect(await table.locator("tbody tr").count()).toBeGreaterThan(0);

    // 근거: 계약 "기본 = 발행일 내림차순", 값 검증은 데이터 고정 후 보강
  });
});
