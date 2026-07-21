import { encode } from "next-auth/jwt";

const SESSION_COOKIE = "authjs.session-token";

/**
 * E2E에서 GitHub OAuth를 우회하기 위한 운영자 세션 쿠키 생성.
 * Auth.js JWT 세션 전략과 같은 secret/salt로 토큰을 직접 인코딩한다.
 * 사용: context.addCookies([await adminSessionCookie()])
 */
export async function adminSessionCookie() {
  const token = await encode({
    token: {
      name: "admin",
      login: process.env.ADMIN_GITHUB_LOGIN ?? "test-admin",
    },
    secret: process.env.AUTH_SECRET ?? "test-secret",
    salt: SESSION_COOKIE,
  });
  return {
    name: SESSION_COOKIE,
    value: token,
    domain: "localhost",
    path: "/",
    httpOnly: true,
    sameSite: "Lax" as const,
  };
}
