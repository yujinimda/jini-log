// /sitemap.xml (T037) — 발행 글·태그 전체 반영. 소유: 레인 B
import type { MetadataRoute } from "next";
import { postUrl, siteUrl, tagUrl } from "@/components/blog/site";
import { getAllTags, getPublishedPosts } from "@/lib/content";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getPublishedPosts();
  const tags = await getAllTags();
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
  ];
}
