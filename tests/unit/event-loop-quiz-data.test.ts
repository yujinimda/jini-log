// 퀴즈 데이터 정합 (data-model I9/I10) — 정답 보기가 예제의 실제 최종 출력과 일치해야 한다. 소유: 레인 B
import { describe, expect, it } from "vitest";
import { examples, quizzes } from "@/components/mdx/event-loop/examples";

const entries = Object.entries(quizzes);

describe("event-loop 퀴즈 데이터", () => {
  it("퀴즈가 최소 1개는 등록되어 있다", () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  describe.each(entries)("%s", (id, quiz) => {
    it("I9: 보기는 2~4개, answerIndex는 범위 안이다", () => {
      expect(quiz.id).toBe(id);
      expect(quiz.choices.length).toBeGreaterThanOrEqual(2);
      expect(quiz.choices.length).toBeLessThanOrEqual(4);
      expect(quiz.answerIndex).toBeGreaterThanOrEqual(0);
      expect(quiz.answerIndex).toBeLessThan(quiz.choices.length);
    });

    it("결합된 예제가 존재한다", () => {
      expect(examples[quiz.example]).toBeDefined();
    });

    it("I10: 정답 보기를 분해하면 예제 마지막 스텝 output과 일치한다", () => {
      const answer = quiz.choices[quiz.answerIndex];
      const parsed = answer.split("→").map((part) => part.trim());
      expect(parsed).toEqual(examples[quiz.example].steps.at(-1)?.output);
    });

    it("오답 보기는 정답과 다르다 (중복 보기 금지)", () => {
      expect(new Set(quiz.choices).size).toBe(quiz.choices.length);
    });
  });
});
