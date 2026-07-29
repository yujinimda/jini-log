// 좌측 레일의 분류 → 글 2단 그룹핑.
//
// 이 함수가 서버(app/(blog)/layout.tsx)에서 돌아야 하는 이유: 결과가 정적 HTML에 들어가
// SSG가 유지된다. 그래서 **출력이 결정적**이어야 한다 — 같은 입력에 항상 같은 순서가
// 나오지 않으면 빌드마다 HTML이 흔들린다. 동률 처리 규칙을 여기서 고정한다.
import { describe, expect, it } from "vitest";
import { groupPostsByCategory } from "@/lib/content";
import type { PostMeta } from "@/lib/types";

function post(slug: string, category: string, date: string, title = slug): PostMeta {
  return { slug, title, description: "요약", date, tags: [], category, status: "published" };
}

describe("groupPostsByCategory", () => {
  it("분류로 묶고, 분류·글 모두 최신순으로 세우고, 글은 한 번만 등장시킨다", () => {
    // 분류 순서 = 그 분류의 최신 글 날짜 내림차순. 가나다순이면 최근에 뭘 쓰는지가 안 드러나고,
    // 글 수 순이면 오래된 분류가 계속 위에 남는다.
    const groups = groupPostsByCategory([
      post("css-grid", "CSS", "2026-03-01"),
      post("js-old", "JavaScript", "2026-01-01"),
      post("js-new", "JavaScript", "2026-07-01"),
    ]);

    expect(groups).toEqual([
      {
        category: "JavaScript",
        posts: [
          { slug: "js-new", title: "js-new" },
          { slug: "js-old", title: "js-old" },
        ],
      },
      { category: "CSS", posts: [{ slug: "css-grid", title: "css-grid" }] },
    ]);
  });

  it("동률은 이름으로 깬다 — 같은 입력에 항상 같은 순서가 나와야 한다", () => {
    // 날짜만으로 정렬하면 동률 순서가 입력 순서에 좌우돼 빌드마다 HTML이 흔들린다
    const groups = groupPostsByCategory([
      post("banana", "Beta", "2026-07-01"),
      post("apple", "Beta", "2026-07-01"),
      post("cherry", "Alpha", "2026-07-01"),
    ]);

    expect(groups.map((g) => g.category)).toEqual(["Alpha", "Beta"]);
    expect(groups[1].posts.map((p) => p.slug)).toEqual(["apple", "banana"]);
  });

  it("대소문자가 다르면 다른 분류다 — 표기는 사용자 의도다", () => {
    // 자동 병합은 하지 않는다. 표기 흔들림은 에디터 자동완성으로 줄인다.
    expect(
      groupPostsByCategory([
        post("a", "JavaScript", "2026-07-01"),
        post("b", "javascript", "2026-07-02"),
      ]),
    ).toHaveLength(2);
  });

  it("본문·발췌는 넘기지 않는다 — 클라이언트 번들에 실리지 않도록 slug·title만", () => {
    const groups = groupPostsByCategory([post("a", "JS", "2026-07-01", "제목")]);

    expect(groups[0].posts[0]).toEqual({ slug: "a", title: "제목" });
  });

  it("글이 없으면 빈 배열이다", () => {
    expect(groupPostsByCategory([])).toEqual([]);
  });
});
