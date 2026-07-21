// 에디터 페이지 (T023) — 신규/수정 공용. 소유: 레인 C
// /admin/write            → 새 글
// /admin/write?slug=x&status=draft|published → 기존 글 편집
import { PostEditor } from "@/components/admin/editor/post-editor";

export const metadata = { title: "글쓰기" };

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
    />
  );
}
