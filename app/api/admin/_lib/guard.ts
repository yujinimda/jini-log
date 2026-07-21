// 어드민 API 라우트 레벨 인증 가드 — 소유: 레인 C
// 미들웨어가 1차 차단하지만, 라우트에서도 재검증한다 (심층 방어 + 계약의 401/403 구분).
import { auth, isOperatorSession, type SessionWithLogin } from "@/lib/auth";
import { apiError } from "./http";

/** 운영자가 아니면 에러 Response, 운영자면 null — 각 핸들러 첫 줄에서 사용 */
export async function requireOperator(): Promise<Response | null> {
  const session = (await auth()) as SessionWithLogin | null;
  if (!session) return apiError(401, "unauthorized", "인증이 필요합니다");
  if (!isOperatorSession(session)) {
    return apiError(403, "forbidden", "운영자만 접근할 수 있습니다");
  }
  return null;
}
