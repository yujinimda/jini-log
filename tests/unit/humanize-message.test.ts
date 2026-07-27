// 검증 메시지 사람 말 변환 (C7)
//
// 배경: 에디터가 `서버 검증 실패 (invalid-frontmatter): title: title은 비울 수 없습니다`처럼
// 에러 코드와 내부 필드명을 그대로 노출했다. 운영자에게 필요한 건 무엇을 고칠지뿐이다.
import { describe, expect, it } from "vitest";
import { humanizeValidationMessage } from "@/components/admin/editor/types";

describe("humanizeValidationMessage", () => {
  it("필드명을 한글 라벨로 바꾸고 중복을 제거한다", () => {
    expect(humanizeValidationMessage("title: title은 비울 수 없습니다")).toBe(
      "제목은 비울 수 없습니다",
    );
  });

  it("여러 오류를 읽기 좋게 잇는다", () => {
    expect(
      humanizeValidationMessage(
        "title: title은 비울 수 없습니다; description: description은 비울 수 없습니다",
      ),
    ).toBe("제목은 비울 수 없습니다 · 요약은 비울 수 없습니다");
  });

  it("라벨을 바꾼 뒤 조사를 받침에 맞게 교정한다", () => {
    // "date는" → "발행일는"이 아니라 "발행일은"
    expect(humanizeValidationMessage("date: date는 YYYY-MM-DD 형식이어야 합니다")).toBe(
      "발행일은 YYYY-MM-DD 형식이어야 합니다",
    );
    // 받침 없는 라벨은 그대로 는/가/를
    expect(humanizeValidationMessage("tags: tags는 10개를 넘을 수 없습니다")).toBe(
      "태그는 10개를 넘을 수 없습니다",
    );
    expect(humanizeValidationMessage("description: description이 필요합니다")).toBe(
      "요약이 필요합니다",
    );
  });

  it("한글 라벨이 없는 필드는 원래 이름을 유지한다", () => {
    expect(humanizeValidationMessage("slug: slug는 영문 소문자여야 합니다")).toBe(
      "slug는 영문 소문자여야 합니다",
    );
  });

  it("필드 접두어가 없는 메시지는 그대로 둔다", () => {
    expect(humanizeValidationMessage("알 수 없는 오류")).toBe("알 수 없는 오류");
  });

  it("에러 코드나 내부 필드명이 결과에 남지 않는다", () => {
    const out = humanizeValidationMessage(
      "title: title은 비울 수 없습니다; description: description은 비울 수 없습니다",
    );
    expect(out).not.toContain("title");
    expect(out).not.toContain("description");
  });
});
