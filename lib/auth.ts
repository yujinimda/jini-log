// Auth.js v5 — GitHub OAuth, 허용 계정 1개 (research R6). 소유: 레인 A
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub],
  session: { strategy: "jwt" },
  callbacks: {
    // ADMIN_GITHUB_LOGIN 외 전원 거부 → "세션 존재 = 운영자"가 성립한다 (FR-008)
    signIn({ profile }) {
      return profile?.login === process.env.ADMIN_GITHUB_LOGIN;
    },
    jwt({ token, profile }) {
      if (profile?.login) token.login = profile.login;
      return token;
    },
  },
});

/** 운영자 여부 — 조회수 제외(FR-010)·API 보호에 공용 사용 */
export async function isOperator(): Promise<boolean> {
  const session = await auth();
  return session !== null;
}
