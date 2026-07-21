// /feed.xml — RSS (T038, research R7). 빌드 시 정적 생성. 소유: 레인 B
import { Feed } from "feed";
import { SITE_DESCRIPTION, postUrl, siteName, siteUrl } from "@/components/blog/site";
import { getPublishedPosts } from "@/lib/content";

export const dynamic = "force-static";

export async function GET(): Promise<Response> {
  const posts = await getPublishedPosts();

  const feed = new Feed({
    id: `${siteUrl()}/`,
    link: `${siteUrl()}/`,
    title: siteName(),
    description: SITE_DESCRIPTION,
    language: "ko",
    copyright: `© ${new Date().getFullYear()} ${siteName()}`,
    feedLinks: { rss: `${siteUrl()}/feed.xml` },
  });

  for (const post of posts) {
    feed.addItem({
      id: postUrl(post.slug),
      link: postUrl(post.slug),
      title: post.title,
      description: post.description,
      date: new Date(`${post.date}T00:00:00Z`),
      category: post.tags.map((tag) => ({ name: tag })),
    });
  }

  return new Response(feed.rss2(), {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
