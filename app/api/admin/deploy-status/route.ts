// GET /api/admin/deploy-status?sha= — 배포 반영 확인 (research R10). 소유: 레인 C
// 어드민이 폴링해 "반영 중 → 반영 완료 / 배포 실패"를 표시한다.
import { NextResponse } from "next/server";
import { getDeployStatus } from "@/lib/deploy";
import { apiError } from "../_lib/http";

export async function GET(req: Request) {
  const sha = new URL(req.url).searchParams.get("sha");
  if (!sha || !/^[0-9a-f]{7,40}$/i.test(sha)) {
    return apiError(400, "invalid-request", "sha 쿼리(커밋 SHA)가 필요합니다");
  }

  try {
    const state = await getDeployStatus(sha);
    return NextResponse.json({ state });
  } catch (err) {
    return apiError(502, "vercel-error", (err as Error).message);
  }
}
