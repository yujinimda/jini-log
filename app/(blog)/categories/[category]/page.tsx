// 분류별 전체 글 목록 (C14) — SSG.
//
// C13에서 "분류당 글 1개라 빈 페이지만 는다"며 만들지 않았던 페이지다. 분류당 글이
// 늘어나면 계산이 뒤집힌다: 12rem 레일 안에서 글 수십 개를 보여주는 편한 방법은 없고,
// 레일은 "분류당 최신 5개 + 전체 N개 →"로 요약만 맡는다. 전체 목록은 여기가 맡는다 —
// 전체 폭에서는 날짜·요약이 붙은 목록 수십 개도 훑을 만하다(여느 블로그 아카이브 모양).
//
// 태그 페이지와 다르게 PostList(카드)가 아니라 압축 목록인 이유: 이 페이지의 일은
// "발견"이 아니라 "훑기"다. 카드 그리드는 수십 개일 때 스크롤만 길어진다.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { categoryUrl, RSS_ALTERNATE, siteName } from "@/components/blog/site";
import { getAllCategories, getPublishedPosts } from "@/lib/content";

/** 빌드 시점에 존재하는 분류만 — 그 외는 404 (태그 페이지와 동일 계약) */
export const dynamicParams = false;

export async function generateStaticParams() {
  const categories = await getAllCategories();
  return categories.map((category) => ({ category }));
}

/**
 * dev와 prod가 param을 다르게 준다: prod(SSG)는 generateStaticParams의 원본이,
 * dev는 URL에서 온 인코딩된 값("AI%20%ED%98%91%EC%97%85")이 들어온다.
 * 디코딩을 시도하되, "%"가 문자 그대로인 값(URIError)은 원본을 쓴다.
 */
function decodeParam(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const category = decodeParam((await params).category);
  const title = category;
  const description = `${siteName()}의 "${category}" 분류 글 전체 목록`;
  return {
    title,
    description,
    alternates: { canonical: categoryUrl(category), types: RSS_ALTERNATE },
    openGraph: {
      type: "website",
      title,
      description,
      url: categoryUrl(category),
      siteName: siteName(),
      locale: "ko_KR",
    },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const category = decodeParam((await params).category);
  // getPublishedPosts는 최신순 — 그 순서를 그대로 쓴다
  const posts = (await getPublishedPosts()).filter((post) => post.category.trim() === category);
  if (posts.length === 0) notFound();

  // 연도별 묶음 — 최신순 입력이므로 연도도 최신부터 쌓인다
  const byYear = new Map<string, typeof posts>();
  for (const post of posts) {
    const year = post.date.slice(0, 4);
    const bucket = byYear.get(year);
    if (bucket) bucket.push(post);
    else byYear.set(year, [post]);
  }

  return (
    <div>
      <header className="mb-10 flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">{category}</h1>
        <p className="shrink-0 text-sm text-zinc-500">글 {posts.length}개</p>
      </header>

      <div className="space-y-10">
        {[...byYear.entries()].map(([year, yearPosts]) => (
          <section key={year} aria-label={`${year}년`}>
            <h2 className="mb-4 text-sm font-semibold tracking-wide text-zinc-400">{year}</h2>
            <ul className="space-y-5">
              {yearPosts.map((post) => (
                <li key={post.slug} className="flex gap-4">
                  {/* MM-DD만 — 연도는 섹션 제목이 이미 말했다 */}
                  <time
                    dateTime={post.date}
                    className="w-12 shrink-0 pt-0.5 text-sm text-zinc-400 tabular-nums"
                  >
                    {post.date.slice(5)}
                  </time>
                  <div className="min-w-0">
                    <Link
                      href={`/posts/${post.slug}`}
                      className="font-medium text-zinc-900 transition-colors hover:text-zinc-600"
                    >
                      {post.title}
                    </Link>
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{post.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
