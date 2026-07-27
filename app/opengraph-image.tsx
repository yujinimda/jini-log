// 사이트 기본 OG 이미지 (T036) — 글별 이미지가 없는 경로의 폴백. 소유: 레인 B
import { OG_SIZE, ogImage } from "@/components/blog/og-image";
import { SITE_DESCRIPTION, siteName } from "@/components/blog/site";

export const size = OG_SIZE;
export const contentType = "image/png";
// 문구를 다시 쓰지 않는다 — 아래 ogImage에 넘기는 값과 같은 출처여야 한다
export const alt = SITE_DESCRIPTION;

export default function Image() {
  return ogImage({ title: siteName(), label: SITE_DESCRIPTION });
}
