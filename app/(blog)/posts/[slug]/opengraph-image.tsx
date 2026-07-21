// 글별 OG 이미지 (T036) — 제목 기반 자동 생성 (research R7). 소유: 레인 B
import { notFound } from "next/navigation";
import { OG_SIZE, ogImage } from "@/components/blog/og-image";
import { siteName } from "@/components/blog/site";
import { getPost, getPublishedPosts } from "@/lib/content";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "글 제목이 담긴 미리보기 이미지";

export async function generateStaticParams() {
  const posts = await getPublishedPosts();
  return posts.map(({ slug }) => ({ slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();
  return ogImage({ title: post.title, label: siteName() });
}
