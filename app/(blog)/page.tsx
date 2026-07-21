// 홈 = 글 목록 (T030) — SSG, 최신순. 소유: 레인 B
import { PostList } from "@/components/blog/post-list";
import { getPublishedPosts } from "@/lib/content";

export default async function HomePage() {
  const posts = await getPublishedPosts();
  return <PostList posts={posts} />;
}
