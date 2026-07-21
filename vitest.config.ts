import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/api/**/*.test.ts"],
    environment: "node",
    // 테스트 스펙 파일은 레인 D 소유 — D 머지 전까지 빈 스위트를 통과로 취급
    passWithNoTests: true,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname) },
  },
});
