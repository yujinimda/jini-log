// 목차 추출 (research R5) — 소유: 레인 A
// 공유 파이프라인(lib/mdx-options.ts)을 1회 실행해 rehype-slug가 부여한 id를
// 같은 체인의 컬렉터로 수집한다. 자체 slug 알고리즘 재현 금지 — 앵커 일치가 구조적으로 보장된다.
import { compile } from "@mdx-js/mdx";
import { rehypeCollectToc, rehypePlugins, remarkPlugins, type TocEntry } from "./mdx-options";

export type { TocEntry };

/** 본문에서 h2/h3 목차를 추출한다. 발행 본문은 검증을 통과했으므로 컴파일 실패는 그대로 드러낸다. */
export async function getToc(body: string): Promise<TocEntry[]> {
  const entries: TocEntry[] = [];
  await compile(body, {
    remarkPlugins,
    rehypePlugins: [...rehypePlugins, rehypeCollectToc(entries)],
  });
  return entries;
}
