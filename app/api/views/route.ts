// POST /api/views — 조회 기록 (T033, contracts/api.md·research R5). 소유: 레인 B
// GET  /api/views — 글별 누적 조회수 맵 (공개 표시용)
// fire-and-forget: 어떤 경우에도 204 — 실패가 독자 경험에 새어 나가지 않는다.
import { isbot } from "isbot";
import { isOperator } from "@/lib/auth";
import { getPublishedPosts } from "@/lib/content";
import { getViewTotals, incrementView } from "@/lib/views";

// GET이 인자 없는 핸들러라 빌드 시점에 정적 평가될 수 있다 — 조회수는 매 요청 실측이어야 하므로 차단
export const dynamic = "force-dynamic";

function noContent(): Response {
  return new Response(null, { status: 204 });
}

/**
 * 조회를 기록해도 되는 런타임인가 — 프로덕션 배포에서만 참.
 *
 * 로컬 .env.local과 프로덕션이 같은 Supabase 프로젝트를 보기 때문에, 가드가 없으면
 * `pnpm dev`로 글을 열어보는 것만으로 실제 조회수가 올라간다. preview 배포도 같은
 * 이유로 제외한다(PR 미리보기 열람이 지표를 오염시키지 않도록).
 *
 * NODE_ENV 대신 VERCEL_ENV로 판정하는 이유: preview 배포도 NODE_ENV는 "production"이라
 * NODE_ENV만으로는 preview 열람을 걸러내지 못한다.
 */
function isCountingRuntime(): boolean {
  return process.env.VERCEL_ENV === "production";
}

/**
 * 전체 글의 누적 조회수를 한 번에 반환 — 클라이언트가 글마다 요청하지 않도록 맵으로 준다.
 * Supabase 장애가 독자 화면을 깨지 않도록 실패해도 빈 맵으로 200 (POST와 같은 정책).
 */
export async function GET(): Promise<Response> {
  let totals: Record<string, number> = {};
  try {
    totals = await getViewTotals();
  } catch {
    // 빈 맵 유지 — 소비처에서 "0"으로 표시된다
  }
  return Response.json(totals, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request): Promise<Response> {
  try {
    // 로컬 개발·preview 배포 제외 — 프로덕션 지표 오염 방지 (C2)
    if (!isCountingRuntime()) return noContent();

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
