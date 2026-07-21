import { describe, expect, it } from "vitest";
import { validateMdx } from "@/lib/mdx";

describe("validateMdx", () => {
  it("일반 마크다운 제목, 리스트, 코드펜스를 유효한 본문으로 허용한다", async () => {
    // FR-006, SC-004
    const result = await validateMdx(`# 제목

- 첫 번째
- 두 번째

\`\`\`ts
const value = 1;
\`\`\`
`);

    expect(result).toEqual({ valid: true, errors: [] });
  });

  it("레지스트리에 등록된 Callout과 Collapse 컴포넌트를 허용한다", async () => {
    // FR-005, FR-006, SC-004
    const result = await validateMdx(`<Callout type="info">안내 문구</Callout>

<Collapse summary="s">접힌 내용</Collapse>
`);

    expect(result).toEqual({ valid: true, errors: [] });
  });

  it("레지스트리에 없는 대문자 JSX 컴포넌트를 거부하고 이름을 오류에 포함한다", async () => {
    // FR-006, SC-004
    const result = await validateMdx("<NoSuchComponent />");

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.message).toContain("NoSuchComponent");
  });

  it("등록 컴포넌트와 미등록 컴포넌트를 함께 쓰면 미등록 컴포넌트만 오류로 보고한다", async () => {
    // FR-005, FR-006, SC-004
    const result = await validateMdx(`<Callout type="info">정상</Callout>

<NoSuchComponent />
`);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.message).toContain("NoSuchComponent");
    expect(result.errors[0]?.message).not.toContain("Callout");
  });

  it("본문 import 구문을 거부한다", async () => {
    // FR-006, SC-004
    const result = await validateMdx("import x from 'y'\n\n# 제목");

    expect(result.valid).toBe(false);
    expect(result.errors[0]?.message).toContain("import/export");
  });

  it("본문 export 구문을 거부한다", async () => {
    // FR-006, SC-004
    const result = await validateMdx("export const a = 1\n\n# 제목");

    expect(result.valid).toBe(false);
    expect(result.errors[0]?.message).toContain("import/export");
  });

  it("깨진 JSX는 컴파일 오류로 거부하고 메시지와 위치 정보를 보존한다", async () => {
    // FR-006, SC-004
    const result = await validateMdx("<Callout>");

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]?.message).toEqual(expect.any(String));
    expect(result.errors[0]?.message.length).toBeGreaterThan(0);

    if (result.errors[0]?.line !== undefined) {
      expect(result.errors[0].line).toEqual(expect.any(Number));
    }
    if (result.errors[0]?.column !== undefined) {
      expect(result.errors[0].column).toEqual(expect.any(Number));
    }
  });

  it("GFM 표 문법을 유효한 본문으로 허용한다", async () => {
    // FR-006, SC-004
    const result = await validateMdx(`| 이름 | 값 |
| --- | --- |
| a | 1 |
`);

    expect(result).toEqual({ valid: true, errors: [] });
  });
});
