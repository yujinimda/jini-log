import { http, HttpResponse } from "msw";

const GITHUB_API = "https://api.github.com";

/**
 * GitHub API 모킹 핸들러 (레인 D의 테스트가 확장해서 사용).
 * 파일별 응답은 각 테스트에서 server.use(...)로 덮어쓴다.
 */
export const githubHandlers = [
  // lib/github.ts가 원자 커밋 전에 default_branch를 조회한다 (repos.get)
  http.get(`${GITHUB_API}/repos/:owner/:repo`, () =>
    HttpResponse.json({ default_branch: "main" }),
  ),
  http.get(`${GITHUB_API}/repos/:owner/:repo/contents/*`, () =>
    HttpResponse.json({ message: "Not Found" }, { status: 404 }),
  ),
  http.put(`${GITHUB_API}/repos/:owner/:repo/contents/*`, () =>
    HttpResponse.json({ content: { sha: "mock-sha" }, commit: { sha: "mock-commit-sha" } }),
  ),
];
