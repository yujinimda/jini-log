import coreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...coreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
      "coverage/**",
      // 에이전트 워크트리 사본 — 각자 node_modules·.next를 갖는다.
      // 위의 "node_modules/**"는 최상위만 매칭하므로 중첩 사본이 린트 대상에 들어와
      // pnpm lint가 10만 건 넘게 뱉으며 실패했다.
      ".claude/**",
    ],
  },
];

export default eslintConfig;
