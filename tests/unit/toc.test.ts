import { existsSync } from "node:fs";
import path from "node:path";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { renderMdx } from "@/lib/mdx";

type TocEntry = {
  id: string;
  text: string;
  depth: 2 | 3;
};

type TocModule = {
  getToc: (body: string) => TocEntry[] | Promise<TocEntry[]>;
};

// 레인 A가 아직 모듈을 구현하지 않음 — 모듈 부재 시 skip (구현 머지 후 자동 활성화)
// specifier를 변수로 우회: tsc가 미존재 모듈을 정적 해석하지 않게 함 (vitest는 런타임에 alias 해석)
const tocFile = path.resolve(__dirname, "../../lib/toc.ts");
const tocSpecifier: string = "@/lib/toc";
const tocModule = existsSync(tocFile) ? ((await import(tocSpecifier)) as TocModule) : null;
const describeToc = describe.skipIf(!tocModule);

async function renderedHeadingIds(body: string): Promise<Array<{ depth: number; id: string }>> {
  const html = renderToStaticMarkup((await renderMdx(body)) as ReactElement);
  return [...html.matchAll(/<h([23])[^>]*\bid="([^"]+)"/g)].map((match) => ({
    depth: Number(match[1]),
    id: match[2] ?? "",
  }));
}

async function getTocEntries(body: string): Promise<TocEntry[]> {
  if (!tocModule) {
    return [];
  }
  return await tocModule.getToc(body);
}

describeToc("getToc", () => {
  it("한글 제목의 h2/h3만 추출하고 렌더된 앵커 id와 순서를 일치시킨다", async () => {
    // R5, T015
    const body = `## 코드 블록

본문

## 접기/펼치기

본문

### 세부 절

본문
`;

    const toc = await getTocEntries(body);
    const rendered = await renderedHeadingIds(body);

    expect(toc).toHaveLength(3);
    expect(toc).toEqual([
      { id: rendered[0]?.id ?? "", text: "코드 블록", depth: 2 },
      { id: rendered[1]?.id ?? "", text: "접기/펼치기", depth: 2 },
      { id: rendered[2]?.id ?? "", text: "세부 절", depth: 3 },
    ]);
    expect(toc.map((entry) => ({ depth: entry.depth, id: entry.id }))).toEqual(rendered);
  });

  it("중복 제목은 서로 다른 id로 dedupe되고 렌더된 앵커와 동일한 순서를 유지한다", async () => {
    // R5, T015
    const body = `## 중복 제목

본문 A

## 중복 제목

본문 B
`;

    const toc = await getTocEntries(body);
    const rendered = await renderedHeadingIds(body);

    expect(toc).toHaveLength(2);
    expect(toc[0]?.text).toBe("중복 제목");
    expect(toc[1]?.text).toBe("중복 제목");
    expect(toc[0]?.depth).toBe(2);
    expect(toc[1]?.depth).toBe(2);
    expect(toc[0]?.id).not.toBe(toc[1]?.id);
    expect(toc.map((entry) => ({ depth: entry.depth, id: entry.id }))).toEqual(rendered);
  });

  it("인라인 마크업을 제거한 평문 제목을 반환하고 id는 렌더 결과와 일치한다", async () => {
    // R5, T015
    const body = "## **강조**된 `코드` 제목";

    const toc = await getTocEntries(body);
    const rendered = await renderedHeadingIds(body);

    expect(toc).toHaveLength(1);
    expect(toc[0]).toEqual({
      id: rendered[0]?.id ?? "",
      text: "강조된 코드 제목",
      depth: 2,
    });
    expect(toc[0]?.text).not.toContain("**");
    expect(toc[0]?.text).not.toContain("`");
    expect(toc.map((entry) => ({ depth: entry.depth, id: entry.id }))).toEqual(rendered);
  });

  it("h1과 h4 이하는 제외하고 h2만 포함한다", async () => {
    // R5, T015
    const body = `# 제목

## 절

#### 깊은절
`;

    const toc = await getTocEntries(body);
    const rendered = await renderedHeadingIds(body);

    expect(toc).toEqual([
      {
        id: rendered[0]?.id ?? "",
        text: "절",
        depth: 2,
      },
    ]);
    expect(toc.map((entry) => ({ depth: entry.depth, id: entry.id }))).toEqual(rendered);
  });

  it("절 제목이 없으면 빈 배열을 반환한다", async () => {
    // FR-008, R5, T015
    const body = `본문만 있습니다.

두 번째 문단입니다.
`;

    const toc = await getTocEntries(body);

    expect(toc).toEqual([]);
  });
});
