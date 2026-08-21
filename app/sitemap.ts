// /sitemap.xml (T037) — 발행 글·태그 전체 반영. 소유: 레인 B
import type { MetadataRoute } from "next";
import { categoryUrl, postUrl, siteUrl, tagUrl } from "@/components/blog/site";
import { getAllCategories, getAllTags, getPublishedPosts } from "@/lib/content";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getPublishedPosts();
  const tags = await getAllTags();
  const categories = await getAllCategories();
  const latest = posts[0]?.date; // getPublishedPosts는 최신순

  return [
    {
      url: `${siteUrl()}/`,
      lastModified: latest ? new Date(latest) : undefined,
    },
    ...posts.map((post) => ({
      url: postUrl(post.slug),
      lastModified: new Date(post.date),
    })),
    ...tags.map((tag) => ({ url: tagUrl(tag) })),
    // C14: 분류 페이지 — C13의 "sitemap 항목 불필요" 판단을 분류 페이지 신설과 함께 뒤집음
    ...categories.map((category) => ({ url: categoryUrl(category) })),
  ];
}
