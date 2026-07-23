// 시뮬레이션 거짓말 방지 게이트 (FR-009/010, US3) — 소유: 레인 B
// 레코드에 존재하는 예제 전부를 검사한다 — user 예제(examples-user)가 채워지면 자동으로 검사 대상에 들어온다.
import { describe, expect, it } from "vitest";
import { examples } from "@/components/mdx/event-loop/examples";
import { runExample } from "../helpers/event-loop-runner";

// I8: 예제 코드에 등장하면 안 되는 진입점·전역 (data-model §2 — 정적 스캔 방어선)
const BANNED_IDENTIFIERS = /\b(setInterval|fetch|setImmediate|XMLHttpRequest|location|document|window|process)\b/;

const entries = Object.entries(examples);

describe("event-loop 예제 데이터", () => {
  it("예제가 최소 1개는 등록되어 있다", () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  describe.each(entries)("%s", (id, example) => {
    it("FR-009: 실제 실행 출력이 마지막 스텝 output과 일치한다", async () => {
      const actual = await runExample(id, example.code);
      expect(actual).toEqual(example.steps.at(-1)?.output);
    });

    it("I8: 금지 식별자를 쓰지 않는다 (결정적 API 화이트리스트)", () => {
      for (const line of example.code) {
        expect(line).not.toMatch(BANNED_IDENTIFIERS);
      }
    });

    it("I6: 레코드 키와 id가 일치하고 스텝이 1개 이상이다", () => {
      expect(example.id).toBe(id);
      expect(example.steps.length).toBeGreaterThan(0);
    });

    it("I1: line은 null이거나 1-base 코드 범위 안이다", () => {
      for (const step of example.steps) {
        if (step.line !== null) {
          expect(step.line).toBeGreaterThanOrEqual(1);
          expect(step.line).toBeLessThanOrEqual(example.code.length);
        }
      }
    });

    it("I2: output은 append-only다 (이전 스텝 output이 접두사)", () => {
      for (let i = 1; i < example.steps.length; i++) {
        const prev = example.steps[i - 1].output;
        const curr = example.steps[i].output;
        expect(curr.slice(0, prev.length)).toEqual(prev);
      }
    });

    // I3(콜스택 pop/push 정합)는 스냅샷 쌍만으로는 기계 판별이 불가능하다 — 임의의 두 스택은
    // 항상 "공통 접두사 + pop들 + push들"로 표현 가능해서 어떤 검사도 항진이 된다 (codex-review P2).
    // I3는 리뷰 책임으로 강등하고, 기계 방어선은 FR-009 실행 대조가 맡는다 (data-model.md §1 개정).

    it("I4: 첫 스텝과 마지막 스텝은 스택·큐가 비어 있다 (마지막은 webApis도)", () => {
      const first = example.steps[0];
      const last = example.steps.at(-1)!;
      expect(first.callstack).toEqual([]);
      expect(first.micro).toEqual([]);
      expect(first.task).toEqual([]);
      expect(last.callstack).toEqual([]);
      expect(last.micro).toEqual([]);
      expect(last.task).toEqual([]);
      expect(last.webApis).toEqual([]);
    });

    it("I5: 항목 문자열과 note는 비어 있지 않다", () => {
      for (const step of example.steps) {
        expect(step.note.trim().length).toBeGreaterThan(0);
        for (const list of [step.callstack, step.webApis, step.micro, step.task, step.output]) {
          for (const item of list) {
            expect(item.trim().length).toBeGreaterThan(0);
          }
        }
      }
    });
  });
});
