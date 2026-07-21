// Auth.js v5 — GitHub OAuth, 허용 계정 1개 (research R6). 소유: 레인 A
import NextAuth, { type Session } from "next-auth";
import GitHub from "next-auth/providers/github";

export interface SessionWithLogin extends Session {
  login?: string;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub],
  session: { strategy: "jwt" },
  callbacks: {
    // ADMIN_GITHUB_LOGIN 외 전원 거부 (FR-008)
    signIn({ profile }) {
      return profile?.login === process.env.ADMIN_GITHUB_LOGIN;
    },
    jwt({ token, profile }) {
      if (profile?.login) token.login = profile.login;
      return token;
    },
    session({ session, token }) {
      (session as SessionWithLogin).login =
        typeof token.login === "string" ? token.login : undefined;
      return session;
    },
  },
});

/**
 * 세션이 "현재" 운영자인지 판정 — 세션 존재만으로 믿지 않고 login 클레임을
 * 매 요청 현재 env와 비교한다. ADMIN_GITHUB_LOGIN 변경 시 기존 세션이
 * 계속 통과하는 문제 방지 (codex-review 반영).
 */
export function isOperatorSession(session: SessionWithLogin | null): boolean {
  return !!session?.login && session.login === process.env.ADMIN_GITHUB_LOGIN;
}

/** 운영자 여부 — 조회수 제외(FR-010)·API 보호에 공용 사용 */
export async function isOperator(): Promise<boolean> {
  return isOperatorSession((await auth()) as SessionWithLogin | null);
}
