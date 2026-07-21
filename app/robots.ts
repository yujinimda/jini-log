// /robots.txt (T037) — 공개 영역 허용, 어드민·API 차단. 소유: 레인 B
import type { MetadataRoute } from "next";
import { siteUrl } from "@/components/blog/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
