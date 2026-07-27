// POST /api/views — 조회 기록 (T033, contracts/api.md·research R5). 소유: 레인 B
// GET  /api/views — 글별 누적 조회수 맵 (공개 표시용)
// fire-and-forget: 어떤 경우에도 204 — 실패가 독자 경험에 새어 나가지 않는다.
import { isbot } from "isbot";
import { isOperator } from "@/lib/auth";
import { getPublishedPosts } from "@/lib/content";
import { classifyReferrerHost, incrementReferrer } from "@/lib/referrers";
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
 * 사이트 자신의 호스트 — 내부 이동을 유입으로 오집계하지 않기 위한 기준값 (C4).
 *
 * host 헤더를 우선하되(프록시 뒤에서도 실제 접속 호스트를 반영) 없으면 요청 URL에서
 * 뽑는다. 둘 다 실패해 null이 되면 내부 이동이 "기타"로 집계돼 지표가 자기 트래픽으로
 * 부풀기 때문에, 폴백을 두는 것이 중요하다.
 */
function selfHost(request: Request): string | null {
  const header = request.headers.get("host");
  if (header) return header.split(":")[0];
  try {
    return new URL(request.url).hostname;
  } catch {
    return null;
  }
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
    const { slug, referrerHost } = (body ?? {}) as { slug?: unknown; referrerHost?: unknown };
    if (typeof slug !== "string") return noContent();

    // 발행 글 목록에 없는 slug는 기록하지 않음 (테이블 오염 방지)
    const published = await getPublishedPosts();
    if (!published.some((post) => post.slug === slug)) return noContent();

    await incrementView(slug);

    // 유입 출처 기록 (C4) — 조회수와 같은 제외 규칙을 이미 통과한 뒤에만 도달한다.
    // 키가 없으면(세션의 첫 글이 아님) 건너뛴다 — 지표 의미는 "세션 최초 유입".
    // 실패해도 조회수 기록을 되돌리지 않는다: 부가 지표가 본 지표를 깨면 안 된다.
    if (typeof referrerHost === "string") {
      const source = classifyReferrerHost(referrerHost, selfHost(request));
      // null = 사이트 내 이동 — 유입이 아니므로 기록하지 않는다
      if (source) {
        try {
          await incrementReferrer(slug, source);
        } catch {
          // 삼킴 (계약: 항상 204)
        }
      }
    }
  } catch {
    // 실패도 삼킴 (계약: 항상 204)
  }
  return noContent();
}
