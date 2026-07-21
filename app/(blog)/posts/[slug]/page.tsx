// 글 상세 (T029 → 002 T011 개편: 세리프 대제목·읽기시간 메타·목차·이전/다음) — 전부 SSG. 소유: 레인 B
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatDate } from "@/components/blog/format-date";
import { PostNav } from "@/components/blog/post-nav";
import { postUrl, RSS_ALTERNATE, siteName } from "@/components/blog/site";
import { TagLink } from "@/components/blog/tag-link";
import { Toc } from "@/components/blog/toc";
import { ViewBeacon } from "@/components/blog/view-beacon";
import { getPost, getPublishedPosts } from "@/lib/content";
import { renderMdx } from "@/lib/mdx";
import { getToc } from "@/lib/toc";

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

  const [content, toc] = await Promise.all([renderMdx(post.body), getToc(post.body)]);

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
      <header className="mx-auto mb-10 max-w-2xl">
        <h1 className="font-serif text-3xl leading-snug font-bold tracking-tight text-zinc-900 sm:text-4xl">
          {post.title}
        </h1>
        <p className="mt-4 text-lg text-zinc-600">{post.description}</p>
        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-zinc-500">
          <time dateTime={post.date}>{formatDate(post.date)}</time>
          <span aria-hidden="true" className="text-zinc-300">
            ·
          </span>
          <span>{post.readingMinutes}분</span>
          {post.tags.length > 0 && (
            <>
              <span aria-hidden="true" className="text-zinc-300">
                ·
              </span>
              <ul className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <li key={tag}>
                    <TagLink tag={tag} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </header>
      <Toc entries={toc} />
      <div className="prose">{content}</div>
      <PostNav slug={post.slug} />
    </article>
  );
}
