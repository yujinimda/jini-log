// 이벤트 루프 글 스모크 (FR-011, US1/US2) — 글은 레인 C 소유라 404면 skip. 소유: 레인 B
// 근거: quickstart §3, spec US1-AC1~4, FR-013(제출 전 잠금).
import { expect, test } from "@playwright/test";

const POST_URL = "/posts/js-event-loop";

test.describe("이벤트 루프 시뮬레이터", () => {
  test.beforeEach(async ({ page }) => {
    const response = await page.goto(POST_URL);
    test.skip(response?.status() === 404, "글(레인 C) 머지 전 — skip");
  });

  test("시뮬레이터를 다음/처음부터로 조작하면 스텝이 움직인다", async ({ page }) => {
    // 첫 번째 일반 시뮬레이터 (도입 퀴즈의 잠금 영역과 무관한, 콜스택 섹션의 것)
    const sim = page.getByRole("group", { name: /동기 함수 호출과 콜스택/ });
    await expect(sim).toBeVisible();

    const next = sim.getByRole("button", { name: "다음 스텝" });
    const reset = sim.getByRole("button", { name: "처음부터" });

    // 첫 스텝: 이전·처음부터는 비활성 (US1-AC3 경계)
    await expect(reset).toBeDisabled();
    await expect(sim.getByText(/^1 \/ \d+$/)).toBeVisible();

    await next.click();
    await expect(sim.getByText(/^2 \/ \d+$/)).toBeVisible();

    await reset.click();
    await expect(sim.getByText(/^1 \/ \d+$/)).toBeVisible();
  });

  test("퀴즈는 제출 전 시뮬레이터가 잠겨 있고 제출하면 열린다", async ({ page }) => {
    // 도입 퀴즈 블록 — 잠금 플레이스홀더 문구로 찾는다 (FR-013)
    const placeholder = page.getByText("예측을 제출하면 시뮬레이터가 열려요", { exact: false }).first();
    await expect(placeholder).toBeVisible();

    // 잠금 상태에서는 퀴즈 예제 시뮬레이터가 없다
    const quizSim = page.getByRole("group", { name: /출력 순서 맞히기/ });
    await expect(quizSim).toHaveCount(1); // 6번 섹션 재등장분 1개만 (퀴즈 안은 잠김)

    // 보기 선택 → 제출
    const quizBlock = page.locator("div").filter({ has: placeholder }).first();
    await quizBlock.getByRole("radio").first().check();
    await quizBlock.getByRole("button", { name: "예측 제출" }).click();

    // 해금: 퀴즈 안 시뮬레이터가 추가로 렌더된다
    await expect(page.getByRole("group", { name: /출력 순서 맞히기/ })).toHaveCount(2);
    await expect(placeholder).not.toBeVisible();
  });
});
