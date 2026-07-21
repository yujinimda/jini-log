// 사이트 정체성 (SEO 공용) — SITE_URL·SITE_NAME은 배포 시 주입 (data-model §5). 소유: 레인 B
// lib/는 레인 A 소유라 B 소유 영역에 둔다.

/** 후행 슬래시 없는 절대 origin (canonical·OG·sitemap·feed 공용) */
export function siteUrl(): string {
  return (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

export function siteName(): string {
  return process.env.SITE_NAME ?? "jini-log";
}

export const SITE_DESCRIPTION = "만지면서 이해하는 기술 블로그";

export function postUrl(slug: string): string {
  return `${siteUrl()}/posts/${slug}`;
}

export function tagUrl(tag: string): string {
  return `${siteUrl()}/tags/${encodeURIComponent(tag)}`;
}

/**
 * RSS 자동 발견 링크 — Next 메타데이터 병합은 최상위 키 단위 얕은 병합이라
 * 페이지가 alternates(canonical)를 정의하면 레이아웃의 types가 사라진다.
 * 페이지마다 alternates.types에 이 값을 함께 넣는다.
 */
export const RSS_ALTERNATE = { "application/rss+xml": "/feed.xml" };
