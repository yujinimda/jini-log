// 레인 B/C 구현 전까지 실패가 정상입니다.
// 근거: quickstart V4, spec US3, SC-003, FR-012, FR-013.

import { expect, test } from "@playwright/test";

type JsonLdObject = {
  "@type"?: string | string[];
  headline?: string;
  "@graph"?: JsonLdObject[];
};

function isJsonLdObject(value: unknown): value is JsonLdObject {
  return typeof value === "object" && value !== null;
}

function findArticleJsonLd(value: unknown): JsonLdObject | undefined {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findArticleJsonLd(item);
      if (found) return found;
    }
    return undefined;
  }

  if (!isJsonLdObject(value)) return undefined;

  const type = value["@type"];
  const isArticle = type === "Article" || (Array.isArray(type) && type.includes("Article"));
  if (isArticle) return value;

  if (value["@graph"]) return findArticleJsonLd(value["@graph"]);

  return undefined;
}

function getMetaContent(html: string, attribute: "name" | "property", value: string): string | undefined {
  const pattern = new RegExp(
    `<meta[^>]+${attribute}=["']${value}["'][^>]+content=["']([^"']+)["'][^>]*>|<meta[^>]+content=["']([^"']+)["'][^>]+${attribute}=["']${value}["'][^>]*>`,
    "i",
  );
  const match = html.match(pattern);
  return match?.[1] ?? match?.[2];
}

function getCanonicalHref(html: string): string | undefined {
  const match = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i);
  return match?.[1];
}

test.describe("SEO 메타·sitemap·robots·feed·OG", () => {
  test("글 상세 HTML은 title, description, OG, canonical, Article JSON-LD를 포함한다", async ({ request }) => {
    const response = await request.get("/posts/hello-world");
    expect(response.status()).toBe(200);

    const html = await response.text();

    expect(html).toMatch(/<title[^>]*>[^<]*지니로그 시작[^<]*<\/title>/i);
    expect(getMetaContent(html, "name", "description")).toBeTruthy();
    expect(getMetaContent(html, "property", "og:title")).toContain("지니로그 시작");
    expect(getMetaContent(html, "property", "og:description")).toBeTruthy();
    expect(getMetaContent(html, "property", "og:image")).toBeTruthy();
    expect(getCanonicalHref(html)).toBeTruthy();

    const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    const article = scripts
      .map((script) => {
        try {
          return findArticleJsonLd(JSON.parse(script[1] ?? ""));
        } catch {
          return undefined;
        }
      })
      .find((item): item is JsonLdObject => item !== undefined);

    expect(article).toBeTruthy();
    expect(article?.headline).toContain("지니로그 시작");
  });

  test("sitemap.xml은 발행 글 URL을 포함하는 XML을 반환한다", async ({ request }) => {
    const response = await request.get("/sitemap.xml");

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("xml");

    const body = await response.text();
    expect(body).toContain("/posts/hello-world");
  });

  test("robots.txt는 크롤러 규칙과 sitemap 참조를 반환한다", async ({ request }) => {
    const response = await request.get("/robots.txt");

    expect(response.status()).toBe(200);

    const body = await response.text();
    expect(body).toMatch(/User-Agent|User-agent/);
    expect(body).toMatch(/Sitemap:/i);
  });

  test("feed.xml은 발행 글 항목을 포함하는 RSS 또는 Atom 문서를 반환한다", async ({ request }) => {
    const response = await request.get("/feed.xml");

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("xml");

    const body = await response.text();
    expect(body).toMatch(/<rss|<feed/i);
    expect(body).toContain("지니로그 시작");
    expect(body).toContain("/posts/hello-world");
  });

  test("og:image 메타 URL은 실제 이미지 응답을 반환한다", async ({ request }) => {
    const postResponse = await request.get("/posts/hello-world");
    expect(postResponse.status()).toBe(200);

    const html = await postResponse.text();
    const ogImage = getMetaContent(html, "property", "og:image");
    expect(ogImage).toBeTruthy();

    const imageUrl = new URL(ogImage ?? "", postResponse.url()).toString();
    const imageResponse = await request.get(imageUrl);

    expect(imageResponse.status()).toBe(200);
    expect(imageResponse.headers()["content-type"]).toMatch(/^image\//);
  });
});
