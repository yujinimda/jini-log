// Auth.js v5 — GitHub OAuth, 허용 계정 1개 (research R6). 소유: 레인 A
import NextAuth, { type Session } from "next-auth";
import GitHub from "next-auth/providers/github";

export interface SessionWithLogin extends Session {
  login?: string;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub],
  // 롤링 세션 — 운영자 1인 블로그라 재로그인 마찰을 줄인다 (C4).
  //
  // JWT 전략에서 세션을 읽을 때마다 만료가 maxAge만큼 다시 밀린다. 즉 30일에 한 번만
  // 들러도 사실상 로그아웃되지 않는다. 반대로 이 성질 때문에 **탈취된 쿠키도 계속
  // 연장되므로** 기간을 길게 잡을수록 위험하다 — 90일 검토 후 30일로 낮췄다
  // (codex-review 반영: "쿠키 탈취 시 무한 연장").
  //
  // updateAge는 쿠키 재발급 빈도를 하루 1회로 제한해 불필요한 Set-Cookie를 줄인다.
  //
  // 계정 변경 대응은 별개 층: isOperatorSession이 매 요청 ADMIN_GITHUB_LOGIN과
  // 대조하므로, env를 바꾸면 살아있는 세션도 즉시 권한을 잃는다.
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
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
