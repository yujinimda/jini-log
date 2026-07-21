// 글 상세 (T029) — 전부 SSG. 소유: 레인 B
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatDate } from "@/components/blog/format-date";
import { postUrl, RSS_ALTERNATE, siteName } from "@/components/blog/site";
import { TagLink } from "@/components/blog/tag-link";
import { ViewBeacon } from "@/components/blog/view-beacon";
import { getPost, getPublishedPosts } from "@/lib/content";
import { renderMdx } from "@/lib/mdx";

/** 빌드 시점의 발행 글만 존재 — 그 외 slug는 404 */
export const dynamicParams = false;

export async function generateStaticParams() {
  const posts = await getPublishedPosts();
  return posts.map(({ slug }) => ({ slug }));
}

// T035: 글별 메타데이터 — title·description·OG(article)·canonical
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};

  const url = postUrl(post.slug);
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: url, types: RSS_ALTERNATE },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      url,
      siteName: siteName(),
      locale: "ko_KR",
      publishedTime: post.date,
      tags: post.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
  };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const content = await renderMdx(post.body);

  // T039: JSON-LD(Article) — 검색엔진 구조화 데이터
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: {
      "@type": "Person",
      name: process.env.ADMIN_GITHUB_LOGIN ?? siteName(),
    },
    mainEntityOfPage: postUrl(post.slug),
    keywords: post.tags,
    inLanguage: "ko",
  };

  return (
    <article>
      <script
        type="application/ld+json"
        // JSON 내 "<" 이스케이프 — script 조기 종료 방지
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <ViewBeacon slug={post.slug} />
      <header className="mb-10">
        <time dateTime={post.date} className="text-sm text-zinc-500">
          {formatDate(post.date)}
        </time>
        <h1 className="mt-2 text-3xl leading-tight font-bold tracking-tight text-zinc-900">
          {post.title}
        </h1>
        <p className="mt-3 text-lg text-zinc-600">{post.description}</p>
        {post.tags.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <li key={tag}>
                <TagLink tag={tag} />
              </li>
            ))}
          </ul>
        )}
      </header>
      <div className="prose">{content}</div>
    </article>
  );
}
