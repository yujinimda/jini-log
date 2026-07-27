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
  // JWT 전략은 세션을 읽을 때마다 토큰을 무조건 재발급하므로 만료가 maxAge만큼 계속
  // 밀린다. 즉 30일에 한 번만 들러도 사실상 로그아웃되지 않는다. 같은 성질 때문에
  // **탈취된 쿠키도 계속 연장되므로** 기간을 길게 잡을수록 위험하다 — 90일을 검토했다가
  // 30일로 낮췄다 (codex-review 반영).
  //
  // updateAge는 두지 않는다: @auth/core 0.41의 session 액션에서 updateAge는 데이터베이스
  // 전략 분기에서만 읽히고, JWT 분기는 조건 없이 재인코딩한다. 즉 JWT에서는 무효 설정이라
  // 넣어두면 "갱신을 하루 1회로 제한한다"는 잘못된 기대를 남긴다 (codex-review 반영).
  //
  // 계정 변경 대응은 별개 층: isOperatorSession이 매 요청 ADMIN_GITHUB_LOGIN과
  // 대조하므로, env를 바꾸면 살아있는 세션도 즉시 권한을 잃는다.
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
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
