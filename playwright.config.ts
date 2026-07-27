import { existsSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "@playwright/test";

// 테스트 프로세스도 .env.local을 읽어야 한다 — tests/e2e/helpers/auth.ts가 서버와 **같은**
// AUTH_SECRET으로 운영자 세션 쿠키를 서명하기 때문. 로드하지 않으면 폴백 "test-secret"으로
// 서명돼 서버가 복호화에 실패한다 ([auth][cause]: no matching decryption secret).
const envLocal = path.resolve(__dirname, ".env.local");
if (existsSync(envLocal)) {
  process.loadEnvFile(envLocal);
}

// 포트는 AUTH_URL에서 파생한다 — 둘이 어긋나면 미들웨어의 로그인 리다이렉트가
// 아무도 듣지 않는 포트로 향해 ERR_CONNECTION_REFUSED가 난다. 단일 출처로 묶어 재발 방지.
const authPort = process.env.AUTH_URL ? new URL(process.env.AUTH_URL).port : "";
const PORT = authPort || "3000";
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  use: {
    baseURL: BASE_URL,
  },
  webServer: {
    command: `pnpm dev --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
  },
});
