// 유입 출처 분류 (C4) — 저장 전 정규화 지점.
// 두 가지 계약을 지킨다:
//   1) 입력은 호스트명만 (전체 URL을 받지 않는다 — 경로·검색어가 서버로 넘어오지 않도록)
//   2) 출력은 안정 키 집합 (한글 표시 문구를 DB에 넣지 않는다)
import { describe, expect, it } from "vitest";
import {
  classifyReferrerHost,
  REFERRER_KEYS,
  REFERRER_LABELS,
  referrerLabel,
} from "@/lib/referrers";

const SELF = "jini-log-smoky.vercel.app";

describe("classifyReferrerHost", () => {
  it("호스트가 비어 있으면 direct다", () => {
    expect(classifyReferrerHost("", SELF)).toBe("direct");
    expect(classifyReferrerHost("   ", SELF)).toBe("direct");
  });

  it("사이트 내 이동은 유입이 아니므로 null을 반환한다", () => {
    // 글 → 글 이동이 "유입"으로 집계되면 지표가 자기 트래픽으로 부풀어 오른다
    expect(classifyReferrerHost(SELF, SELF)).toBeNull();
    expect(classifyReferrerHost(`www.${SELF}`, SELF)).toBeNull();
    expect(classifyReferrerHost(`preview.${SELF}`, SELF)).toBeNull();
  });

  it.each([
    ["www.google.com", "google"],
    ["google.co.kr", "google"],
    ["search.naver.com", "naver"],
    ["m.search.daum.net", "daum"],
    ["www.bing.com", "bing"],
    ["duckduckgo.com", "duckduckgo"],
    ["t.co", "x"],
    ["x.com", "x"],
    ["twitter.com", "x"],
    ["www.facebook.com", "facebook"],
    ["www.linkedin.com", "linkedin"],
    ["github.com", "github"],
    ["yujinimda.github.io", "github"],
  ])("%s → %s", (host, expected) => {
    expect(classifyReferrerHost(host, SELF)).toBe(expected);
  });

  it("알 수 없는 도메인은 other로 묶는다", () => {
    expect(classifyReferrerHost("news.ycombinator.com", SELF)).toBe("other");
    expect(classifyReferrerHost("blog.example.co.kr", SELF)).toBe("other");
  });

  it("호스트명이 아닌 값은 신뢰하지 않고 other로 처리한다", () => {
    // 비콘 body는 클라이언트가 보내는 값 — 조작 가능성을 전제한다.
    // 전체 URL이 넘어오면 계약 위반이므로 분류하지 않고 other로 떨군다.
    expect(classifyReferrerHost("https://www.google.com/search?q=secret", SELF)).toBe("other");
    expect(classifyReferrerHost("not a host", SELF)).toBe("other");
    expect(classifyReferrerHost("javascript:alert(1)", SELF)).toBe("other");
  });

  it("점 없는 호스트도 self와 같으면 내부 이동으로 본다", () => {
    // 개발 환경의 localhost — 형식 검증이 self 판정보다 앞서면 내부 이동이 other로 샌다
    expect(classifyReferrerHost("localhost", "localhost")).toBeNull();
    expect(classifyReferrerHost("localhost", SELF)).toBe("other");
  });

  it.each(["google.co.jp", "www.google.de", "google.com.br", "images.google.fr"])(
    "구글 국가 도메인 %s도 google로 분류한다",
    (host) => {
      // 접미사 목록으로는 다 담을 수 없어 정규식으로 처리 (codex-review 반영)
      expect(classifyReferrerHost(host, SELF)).toBe("google");
    },
  );

  it("google이 들어가도 구글이 아닌 도메인은 오분류하지 않는다", () => {
    expect(classifyReferrerHost("mygoogle.example.com", SELF)).toBe("other");
    expect(classifyReferrerHost("google.example.com", SELF)).toBe("other");
    expect(classifyReferrerHost("notgoogle.com", SELF)).toBe("other");
  });

  it("서브도메인·www·대소문자와 무관하게 같은 출처로 묶는다", () => {
    expect(classifyReferrerHost("google.com", SELF)).toBe("google");
    expect(classifyReferrerHost("images.google.com", SELF)).toBe("google");
    expect(classifyReferrerHost("WWW.NAVER.COM", SELF)).toBe("naver");
  });

  it("self 호스트를 모르면(null) 내부 이동도 일반 출처로 분류한다", () => {
    // host 헤더·요청 URL 모두 실패한 비정상 요청 — 기록을 막기보다 other로 남긴다
    expect(classifyReferrerHost(SELF, null)).toBe("other");
  });

  it("반환값은 항상 정의된 키 집합 안에 있다", () => {
    const samples = ["", "www.google.com", "unknown.example", "not a host", "x.com", SELF];
    for (const sample of samples) {
      const result = classifyReferrerHost(sample, SELF);
      if (result !== null) {
        // 자유 문자열이 DB에 들어가면 집계가 무한히 갈라진다
        expect(REFERRER_KEYS).toContain(result);
      }
    }
  });
});

describe("referrerLabel", () => {
  it("모든 키에 표시 문구가 있다", () => {
    for (const key of REFERRER_KEYS) {
      expect(REFERRER_LABELS[key]).toBeTruthy();
      expect(referrerLabel(key)).toBe(REFERRER_LABELS[key]);
    }
  });

  it("미등록 키는 원문 그대로 표시한다", () => {
    // 스키마가 코드보다 앞서 나가도 대시보드가 빈칸이 되지 않게
    expect(referrerLabel("threads")).toBe("threads");
  });

  it("표시 문구는 DB에 저장되지 않는 값이다 — 키와 라벨이 서로 다르다", () => {
    // 라벨을 바꿔도 집계 키가 갈라지지 않는 구조인지 (codex-review 반영)
    expect(REFERRER_LABELS.google).not.toBe("google");
    expect(REFERRER_LABELS.direct).not.toBe("direct");
  });
});
