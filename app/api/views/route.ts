// POST /api/views — 조회 기록 (T033, contracts/api.md·research R5). 소유: 레인 B
// fire-and-forget: 어떤 경우에도 204 — 실패가 독자 경험에 새어 나가지 않는다.
import { isbot } from "isbot";
import { isOperator } from "@/lib/auth";
import { getPublishedPosts } from "@/lib/content";
import { incrementView } from "@/lib/views";

function noContent(): Response {
  return new Response(null, { status: 204 });
}

export async function POST(request: Request): Promise<Response> {
  try {
    // 운영자 세션 제외 (FR-010)
    if (await isOperator()) return noContent();

    // 봇 제외 (FR-010)
    if (isbot(request.headers.get("user-agent") ?? "")) return noContent();

    // sendBeacon은 content-type text/plain으로 옴 — 직접 파싱
    const body: unknown = JSON.parse(await request.text());
    const slug = (body as { slug?: unknown } | null)?.slug;
    if (typeof slug !== "string") return noContent();

    // 발행 글 목록에 없는 slug는 기록하지 않음 (테이블 오염 방지)
    const published = await getPublishedPosts();
    if (!published.some((post) => post.slug === slug)) return noContent();

    await incrementView(slug);
  } catch {
    // 실패도 삼킴 (계약: 항상 204)
  }
  return noContent();
}
