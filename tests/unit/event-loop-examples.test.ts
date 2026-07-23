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

    it("I3: 인접 스텝의 콜스택 변화는 공통 접두사 + pop들 + push들 형태다", () => {
      // 혼합 굵기(grilling Q4)라 한 스텝에 여러 pop/push 허용 — 접두사 바깥을 바꾸는 변화만 금지
      for (let i = 1; i < example.steps.length; i++) {
        const prev = example.steps[i - 1].callstack;
        const curr = example.steps[i].callstack;
        let common = 0;
        while (common < prev.length && common < curr.length && prev[common] === curr[common]) {
          common++;
        }
        // 공통 접두사 이후: prev의 나머지는 전부 pop, curr의 나머지는 전부 push — 어떤 조합이든
        // "prev[0..common) === curr[0..common)"만 만족하면 성립한다. 접두사가 어긋난 경우만 실패.
        expect(prev.slice(0, common)).toEqual(curr.slice(0, common));
        expect(common === prev.length || common === curr.length || prev[common] !== curr[common]).toBe(true);
      }
    });

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
