// /admin·/api/admin 전체 보호 (FR-008). 소유: 레인 A
import { NextResponse } from "next/server";
import { auth, isOperatorSession, type SessionWithLogin } from "@/lib/auth";

export default auth((req) => {
  // 세션 존재가 아니라 "현재 운영자인가"로 판정 (codex-review 반영)
  if (isOperatorSession(req.auth as SessionWithLogin | null)) return;

  if (req.nextUrl.pathname.startsWith("/api/admin")) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "인증이 필요합니다" } },
      { status: 401 },
    );
  }

  const signInUrl = new URL("/api/auth/signin", req.nextUrl.origin);
  signInUrl.searchParams.set("callbackUrl", req.nextUrl.href);
  return NextResponse.redirect(signInUrl);
});

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
