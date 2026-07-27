// 초안/발행 검증 정책 분리 (C7)
//
// 배경: 초안 저장도 발행과 같은 완전 검증을 요구해 "쓰다 만 글을 잠깐 저장"이 불가능했다.
// 초안은 형식(길이·날짜 포맷)만 강제하고 필수 여부를 풀되, MDX는 두 경우 모두 엄격하게 본다.
import { describe, expect, it } from "vitest";
import { validatePostInput } from "@/app/api/admin/_lib/validate-post";

const base = { title: "쓰다 만 글", description: "", date: "2026-07-27", tags: [] as string[] };
const BODY = "## 절\n\n본문입니다.";

describe("초안 검증 (mode: draft)", () => {
  it("요약이 비어도 저장할 수 있다", async () => {
    await expect(validatePostInput(base, BODY, "draft")).resolves.toMatchObject({ ok: true });
  });

  it("제목·요약이 모두 비어도 저장할 수 있다", async () => {
    const empty = { ...base, title: "", description: "" };
    await expect(validatePostInput(empty, BODY, "draft")).resolves.toMatchObject({ ok: true });
  });

  it("형식은 그대로 강제한다 — 제목 길이 초과는 거부", async () => {
    const tooLong = { ...base, title: "가".repeat(121) };
    const result = await validatePostInput(tooLong, BODY, "draft");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("invalid-frontmatter");
  });

  it("날짜 형식이 어긋나면 거부한다", async () => {
    const badDate = { ...base, date: "2026/07/27" };
    await expect(validatePostInput(badDate, BODY, "draft")).resolves.toMatchObject({ ok: false });
  });

  it("MDX는 초안에서도 엄격하다 — 파싱 실패는 거부", async () => {
    // 깨진 본문을 파일로 남기면 나중에 그 초안을 여는 것 자체가 깨진다
    const result = await validatePostInput(base, "<Unclosed>", "draft");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("invalid-mdx");
  });
});

describe("발행 검증 (mode: publish)", () => {
  it("요약이 비면 거부한다 — 공개 글의 품질 기준은 낮추지 않는다", async () => {
    const result = await validatePostInput(base, BODY, "publish");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("invalid-frontmatter");
  });

  it("제목이 비면 거부한다", async () => {
    const noTitle = { ...base, title: "", description: "요약" };
    await expect(validatePostInput(noTitle, BODY, "publish")).resolves.toMatchObject({ ok: false });
  });

  it("모두 채우면 통과한다", async () => {
    const full = { ...base, description: "요약입니다" };
    await expect(validatePostInput(full, BODY, "publish")).resolves.toMatchObject({ ok: true });
  });

  it("mode를 생략하면 publish 기준이다 — 기존 호출자의 엄격도가 유지된다", async () => {
    await expect(validatePostInput(base, BODY)).resolves.toMatchObject({ ok: false });
  });
});
