// 사이트 기본 OG 이미지 (T036) — 글별 이미지가 없는 경로의 폴백. 소유: 레인 B
import { OG_SIZE, ogImage } from "@/components/blog/og-image";
import { SITE_DESCRIPTION, siteName } from "@/components/blog/site";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "만지면서 이해하는 기술 블로그";

export default function Image() {
  return ogImage({ title: siteName(), label: SITE_DESCRIPTION });
}
