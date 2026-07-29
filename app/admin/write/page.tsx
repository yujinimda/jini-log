// 에디터 페이지 (T023) — 신규/수정 공용. 소유: 레인 C
// /admin/write            → 새 글
// /admin/write?slug=x&status=draft|published → 기존 글 편집
import { PostEditor } from "@/components/admin/editor/post-editor";
import { getContentList } from "@/lib/github";

export const metadata = { title: "글쓰기" };

/**
 * 분류 자동완성 후보 — 이미 쓰인 분류를 중복 없이 모은다.
 *
 * 로컬 파일(getPublishedPosts)이 아니라 GitHub(getContentList)를 읽는 이유:
 * /admin/write는 런타임 동적 페이지인데 next.config.ts는 `content/posts/**`를
 * `/api/views`에만 트레이싱한다. 프로덕션 번들에 콘텐츠가 없어 후보가 조용히 빈 배열이
 * 된다 (codex 지적). 어드민 데이터의 단일 출처는 어차피 GitHub 최신본이다.
 *
 * 후보 조회 실패는 **편의 기능의 실패**다 — 에디터가 열리지 않으면 안 되므로 []로 떨어진다.
 */
async function knownCategories(): Promise<string[]> {
  try {
    const { posts, drafts } = await getContentList();
    const all = [...posts, ...drafts].map((item) =>
      "category" in item && typeof item.category === "string" ? item.category.trim() : "",
    );
    return [...new Set(all.filter(Boolean))];
  } catch {
    return [];
  }
}

export default async function WritePage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string; status?: string }>;
}) {
  const { slug, status } = await searchParams;

  return (
    <PostEditor
      key={slug ?? "new"}
      initialSlug={slug}
      initialStatus={status === "published" ? "published" : "draft"}
      knownCategories={await knownCategories()}
    />
  );
}
