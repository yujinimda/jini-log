import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

type CandidateModule = Record<string, unknown>;
type DerivedFn = (body: string) => unknown;

const moduleCandidates = [
  {
    file: path.resolve(__dirname, "../../lib/content.ts"),
    specifier: "@/lib/content",
  },
  {
    file: path.resolve(__dirname, "../../lib/reading-time.ts"),
    specifier: "@/lib/reading-time",
  },
  {
    file: path.resolve(__dirname, "../../lib/derived.ts"),
    specifier: "@/lib/derived",
  },
] as const;

const readingMinutesNameCandidates = [
  "computeReadingMinutes",
  "getReadingMinutes",
  "readingMinutes",
  "calculateReadingMinutes",
  "readingTime",
] as const;

const excerptNameCandidates = [
  "computeExcerpt",
  "getExcerpt",
  "makeExcerpt",
  "deriveExcerpt",
  "excerpt",
  "toExcerpt",
] as const;

async function loadCandidateModules(): Promise<CandidateModule[]> {
  const loaded: CandidateModule[] = [];

  for (const candidate of moduleCandidates) {
    if (!existsSync(candidate.file)) {
      continue;
    }

    const imported = (await import(candidate.specifier)) as CandidateModule;
    loaded.push(imported);
  }

  return loaded;
}

function isDerivedFn(value: unknown): value is DerivedFn {
  return typeof value === "function";
}

function resolveCandidateFunction(
  modules: readonly CandidateModule[],
  names: readonly string[],
): DerivedFn | null {
  for (const loadedModule of modules) {
    for (const name of names) {
      const candidate = loadedModule[name];
      if (isDerivedFn(candidate)) {
        return candidate;
      }
    }
  }

  return null;
}

const candidateModules = await loadCandidateModules();
const readingMinutesFn = resolveCandidateFunction(candidateModules, readingMinutesNameCandidates);
const excerptFn = resolveCandidateFunction(candidateModules, excerptNameCandidates);

// 레인 A/통합 담당: 실제 export 이름이 아래 후보와 다르면 이 테스트의 후보 목록을 함께 맞춰야 자동 활성화된다.
const describeReadingMinutes = describe.skipIf(!readingMinutesFn);
// 레인 A/통합 담당: 실제 export 이름이 아래 후보와 다르면 이 테스트의 후보 목록을 함께 맞춰야 자동 활성화된다.
const describeExcerpt = describe.skipIf(!excerptFn);

async function getReadingMinutes(body: string): Promise<number> {
  if (!readingMinutesFn) {
    throw new Error("readingMinutes 후보 함수를 찾지 못했습니다");
  }

  const value = await readingMinutesFn(body);
  if (typeof value !== "number") {
    throw new Error(`readingMinutes 반환형이 number가 아닙니다: ${typeof value}`);
  }

  return value;
}

async function getExcerpt(body: string): Promise<string> {
  if (!excerptFn) {
    throw new Error("excerpt 후보 함수를 찾지 못했습니다");
  }

  const value = await excerptFn(body);
  if (typeof value !== "string") {
    throw new Error(`excerpt 반환형이 string이 아닙니다: ${typeof value}`);
  }

  return value;
}

describeReadingMinutes("PostDerived readingMinutes", () => {
  it("빈 본문도 최소 1분으로 계산한다", async () => {
    // FR-007, T015
    await expect(getReadingMinutes("")).resolves.toBe(1);
  });

  it("본문 500자는 1분으로 계산한다", async () => {
    // FR-007, T015
    await expect(getReadingMinutes("가".repeat(500))).resolves.toBe(1);
  });

  it("본문 501자는 올림되어 2분으로 계산한다", async () => {
    // FR-007, T015
    await expect(getReadingMinutes("가".repeat(501))).resolves.toBe(2);
  });

  it("본문 1200자는 3분으로 계산한다", async () => {
    // FR-007, T015
    await expect(getReadingMinutes("가".repeat(1200))).resolves.toBe(3);
  });

  it("코드펜스 안의 글자 수는 읽기 시간에서 제외한다", async () => {
    // FR-007, T015
    const body = `${"가".repeat(400)}

\`\`\`ts
${"x".repeat(5000)}
\`\`\`
`;

    await expect(getReadingMinutes(body)).resolves.toBe(1);
  });

  it("코드만 있는 본문도 최소 1분으로 계산한다", async () => {
    // FR-007, T015
    const body = `\`\`\`ts
${"x".repeat(2000)}
\`\`\`
`;

    await expect(getReadingMinutes(body)).resolves.toBe(1);
  });
});

describeExcerpt("PostDerived excerpt", () => {
  it("긴 본문은 500자 이내로 자르고 평문 시작부를 유지한다", async () => {
    // FR-007, T015
    const plain = "가나다".repeat(220);
    const excerpt = await getExcerpt(plain);

    expect(excerpt.length).toBeLessThanOrEqual(500);
    expect(excerpt.startsWith(plain.slice(0, 24))).toBe(true);
  });

  it("마크다운 문법을 제거하고 평문만 남긴다", async () => {
    // FR-007, T015
    const body = "**굵게** [링크](https://x.com) 일반";
    const excerpt = await getExcerpt(body);

    expect(excerpt).toContain("굵게");
    expect(excerpt).toContain("링크");
    expect(excerpt).toContain("일반");
    expect(excerpt).not.toContain("**");
    expect(excerpt).not.toContain("](");
  });

  it("MDX 컴포넌트 태그 자체는 excerpt에서 제거한다", async () => {
    // FR-007, T015
    const body = `<Callout type="info">안내 문구</Callout>`;
    const excerpt = await getExcerpt(body);

    expect(excerpt).not.toContain("<Callout");
    expect(excerpt).not.toContain("</Callout>");
  });

  it("코드펜스 내용은 excerpt에 포함하지 않는다", async () => {
    // FR-007, T015
    const body = `앞 문장

\`\`\`ts
const secret = 1;
\`\`\`

뒤 문장
`;
    const excerpt = await getExcerpt(body);

    expect(excerpt).not.toContain("const secret = 1;");
  });
});
