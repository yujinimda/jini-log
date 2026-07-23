// 글 MDX 정적 검증 (codex W2/W3 — 참조 오타가 "에러 박스 뜬 채 배포"되는 경로 차단). 소유: 레인 B
// 글 파일은 레인 C 소유 — 머지 전(파일 부재)에는 전부 skip한다. 최상위 eager read 금지.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { examples, quizzes } from "@/components/mdx/event-loop/examples";

const POST_PATH = path.resolve(__dirname, "../../content/posts/js-event-loop.mdx");
const VALID_PANELS = new Set(["stack", "webapis", "micro", "task", "output"]);

const postExists = fs.existsSync(POST_PATH);

describe.skipIf(!postExists)("event-loop 글 정적 검증 (js-event-loop.mdx)", () => {
  // skipIf 뒤라 여기서 읽는 것은 안전 (lazy read)
  const source = postExists ? fs.readFileSync(POST_PATH, "utf8") : "";

  it("EventLoopSimulator의 example 참조가 전부 등록돼 있다", () => {
    const uses = [...source.matchAll(/<EventLoopSimulator\s+([^/>]*)\/?>/g)];
    expect(uses.length).toBeGreaterThan(0);
    for (const [, attrs] of uses) {
      const example = attrs.match(/example="([^"]+)"/)?.[1];
      expect(example, `example 속성 누락: ${attrs}`).toBeDefined();
      expect(examples[example!], `미등록 예제 참조: ${example}`).toBeDefined();
    }
  });

  it("panels 값이 전부 유효한 패널 이름이다", () => {
    const uses = [...source.matchAll(/panels="([^"]+)"/g)];
    for (const [, value] of uses) {
      for (const name of value.split(",").map((part) => part.trim())) {
        expect(VALID_PANELS.has(name), `알 수 없는 패널: ${name}`).toBe(true);
      }
    }
  });

  it("EventLoopQuiz의 quiz 참조가 전부 등록돼 있다", () => {
    const uses = [...source.matchAll(/<EventLoopQuiz\s+quiz="([^"]+)"/g)];
    expect(uses.length).toBeGreaterThanOrEqual(2); // 도입 + 마무리 (FR-001/012)
    for (const [, id] of uses) {
      expect(quizzes[id], `미등록 퀴즈 참조: ${id}`).toBeDefined();
    }
  });

  it("개념 섹션마다 '실무에서는'과 '생각해볼 점' Callout이 있다 (FR-006, 각 4회 이상)", () => {
    expect(source.match(/실무에서는/g)?.length ?? 0).toBeGreaterThanOrEqual(4);
    expect(source.match(/생각해볼 점/g)?.length ?? 0).toBeGreaterThanOrEqual(4);
  });

  it("Node 심화 부록이 Collapse로 존재한다 (FR-007)", () => {
    expect(source).toMatch(/<Collapse\s+summary=/);
  });

  it("도입 퀴즈에 '지금은 이해 안 되는 게 정상' 카피가 있다 (US2-AC4)", () => {
    expect(source).toContain("지금은 이해 안 되는 게 정상");
  });
});
