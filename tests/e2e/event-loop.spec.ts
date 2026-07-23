// 이벤트 루프 글 스모크 (FR-011, US1/US2) — 글은 레인 C 소유라 404면 skip. 소유: 레인 B
// 근거: quickstart §3, spec US1-AC1~4, FR-013(제출 전 잠금).
import { expect, test } from "@playwright/test";

const POST_URL = "/posts/js-event-loop";

test.describe("이벤트 루프 시뮬레이터", () => {
  test.beforeEach(async ({ page }) => {
    const response = await page.goto(POST_URL);
    test.skip(response?.status() === 404, "글(레인 C) 머지 전 — skip");
  });

  test("시뮬레이터를 다음/이전/처음부터로 조작하면 스텝이 움직인다", async ({ page }) => {
    // 첫 번째 일반 시뮬레이터 (도입 퀴즈의 잠금 영역과 무관한, 콜스택 섹션의 것)
    const sim = page.getByRole("group", { name: /동기 함수 호출과 콜스택/ });
    await expect(sim).toBeVisible();

    const next = sim.getByRole("button", { name: "다음 스텝" });
    const prev = sim.getByRole("button", { name: "이전 스텝" });
    const reset = sim.getByRole("button", { name: "처음부터" });

    // 첫 스텝: 이전·처음부터는 비활성 (US1-AC3 경계)
    await expect(reset).toBeDisabled();
    await expect(prev).toBeDisabled();
    await expect(sim.getByText(/^1 \/ \d+$/)).toBeVisible();

    // 두 스텝 전진 후 이전으로 한 스텝 복귀 (FR-011: 다음·이전·처음부터 전부 커버, codex-review P2)
    await next.click();
    await next.click();
    await expect(sim.getByText(/^3 \/ \d+$/)).toBeVisible();

    await prev.click();
    await expect(sim.getByText(/^2 \/ \d+$/)).toBeVisible();

    await reset.click();
    await expect(sim.getByText(/^1 \/ \d+$/)).toBeVisible();
  });

  test("퀴즈는 제출 전 시뮬레이터가 잠겨 있고 제출하면 열린다", async ({ page }) => {
    // 퀴즈는 도입·마무리 2개 — 플레이스홀더는 개수로 검증한다 (.first() 재해석 함정 회피, codex-review P1)
    const placeholders = page.getByText("예측을 제출하면 시뮬레이터가 열려요", { exact: false });
    await expect(placeholders).toHaveCount(2);

    // 잠금 상태에서는 퀴즈 예제 시뮬레이터가 없다 — intro-quiz 예제는 6번 섹션 재등장분 1개만
    await expect(page.getByRole("group", { name: /출력 순서 맞히기/ })).toHaveCount(1);

    // 도입 퀴즈 카드를 질문 문구로 스코프 (rounded-xl은 시뮬레이터·퀴즈 루트에만 있다)
    const introQuiz = page
      .locator("div.rounded-xl")
      .filter({ hasText: "이 코드를 실행하면 어떤 순서로 출력될까요?" })
      .first();
    await introQuiz.getByRole("radio").first().check();
    await introQuiz.getByRole("button", { name: "예측 제출" }).click();

    // 해금: 도입 퀴즈의 플레이스홀더만 사라지고(2→1), 퀴즈 안 시뮬레이터가 추가 렌더된다
    await expect(placeholders).toHaveCount(1);
    await expect(page.getByRole("group", { name: /출력 순서 맞히기/ })).toHaveCount(2);
  });
});
