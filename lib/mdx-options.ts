// MDX 컴파일 설정의 단일 진실 공급원 (research R1) — 소유: 레인 A
// 서버 렌더(lib/mdx.ts)·서버 검증·클라이언트 프리뷰(레인 C)가 전부 이 모듈만 import한다.
// 여기 없는 플러그인·정책을 다른 곳에서 덧붙이면 "프리뷰=발행 렌더" 동일성이 깨진다.
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import type { Root, Content } from "mdast";
import type { Root as HastRoot, ElementContent } from "hast";
import type { VFile } from "vfile";

interface MdxJsxNode {
  type: string;
  name?: string | null;
  children?: MdxJsxNode[];
  position?: NonNullable<Content["position"]>;
}

/**
 * 문법 정책(실행 경계): 본문 import/export 금지.
 * MDX AST의 mdxjsEsm 노드(= import/export 구문)를 발견하면 컴파일 실패 처리.
 */
function remarkForbidEsm() {
  return (tree: Root, file: VFile) => {
    for (const node of tree.children as unknown as MdxJsxNode[]) {
      if (node.type === "mdxjsEsm") {
        file.fail("본문에서 import/export 구문은 사용할 수 없습니다", node.position);
      }
    }
  };
}

/**
 * 본문에서 사용된 커스텀 컴포넌트(대문자 시작 JSX) 이름 수집.
 * 검증 단계에서 레지스트리 미등록 컴포넌트를 거부하는 데 사용 (lib/mdx.ts).
 */
export function remarkCollectComponentNames(names: Set<string>) {
  return () => (tree: Root) => {
    const walk = (nodes: MdxJsxNode[]) => {
      for (const node of nodes) {
        if (
          (node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement") &&
          node.name &&
          /^[A-Z]/.test(node.name)
        ) {
          names.add(node.name);
        }
        if (node.children) walk(node.children);
      }
    };
    walk(tree.children as unknown as MdxJsxNode[]);
  };
}

/** 목차 항목 — contracts/ui.md TOC 계약 (h2/h3만) */
export interface TocEntry {
  id: string;
  text: string;
  depth: 2 | 3;
}

/**
 * TOC 수집 컬렉터 (research R5) — rehype-slug가 id를 부여한 **직후 같은 rehype 체인**에서
 * h2/h3의 { id, text, depth }를 수집한다. slug 알고리즘을 밖에서 재현하지 않으므로
 * 본문 앵커와 TOC id가 구조적으로 어긋날 수 없다. (remarkCollectComponentNames와 같은 패턴)
 * 사용처: lib/toc.ts — rehypePlugins(= rehype-slug 포함) 뒤에 붙여 실행한다.
 */
export function rehypeCollectToc(entries: TocEntry[]) {
  return () => (tree: HastRoot) => {
    const textOf = (nodes: ElementContent[]): string =>
      nodes
        .map((node) => {
          if (node.type === "text") return node.value;
          if ("children" in node) return textOf(node.children as ElementContent[]);
          return "";
        })
        .join("");
    const walk = (nodes: ElementContent[]) => {
      for (const node of nodes) {
        if (node.type === "element") {
          if ((node.tagName === "h2" || node.tagName === "h3") && typeof node.properties?.id === "string") {
            entries.push({
              id: node.properties.id,
              text: textOf(node.children).trim(),
              depth: node.tagName === "h2" ? 2 : 3,
            });
          }
          if (node.children) walk(node.children as ElementContent[]);
        } else if ("children" in node && node.children) {
          // mdxJsxFlowElement 등 컨테이너 내부의 제목도 동일하게 수집
          walk(node.children as ElementContent[]);
        }
      }
    };
    walk(tree.children as ElementContent[]);
  };
}

/** 렌더·검증·프리뷰 공용 remark 플러그인 목록 */
export const remarkPlugins = [remarkGfm, remarkForbidEsm];

/** 렌더·검증·프리뷰 공용 rehype 플러그인 목록 — rehype-slug가 제목 앵커 id를 부여 (R5) */
export const rehypePlugins = [rehypeSlug];
