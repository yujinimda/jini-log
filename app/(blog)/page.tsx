// 홈 = 글 목록 (T030) — SSG, 최신순. 소유: 레인 B
import type { Metadata } from "next";
import { PostList } from "@/components/blog/post-list";
import { RSS_ALTERNATE, SITE_DESCRIPTION, siteName, siteUrl } from "@/components/blog/site";
import { getPublishedPosts } from "@/lib/content";

// T035: 홈 메타데이터 — canonical + OG
export const metadata: Metadata = {
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/", types: RSS_ALTERNATE },
  openGraph: {
    type: "website",
    title: siteName(),
    description: SITE_DESCRIPTION,
    url: siteUrl(),
    siteName: siteName(),
    locale: "ko_KR",
  },
};

export default async function HomePage() {
  const posts = await getPublishedPosts();
  return <PostList posts={posts} />;
}
