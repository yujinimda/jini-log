// MDX 컴포넌트 레지스트리 — 단일 진실 공급원 (data-model.md §3). 소유: 레인 A
// 공개 렌더·에디터 프리뷰·커밋 전 검증이 전부 이 맵을 사용한다 (FR-005).
// 새 인터랙티브 컴포넌트는 여기 등록해야만 글에서 사용 가능 (등록 = 코드 작업, 스펙 확정 경계).
import type { MDXComponents } from "mdx/types";
import { Callout } from "./callout";
import { CodeBlock } from "./code-block";
import { Collapse } from "./collapse";

export const mdxComponents: MDXComponents = {
  pre: CodeBlock,
  Callout,
  Collapse,
};

/** 검증에서 "미등록 컴포넌트" 판정에 쓰는 이름 목록 (대문자 시작 = 커스텀) */
export const registeredComponentNames = new Set(
  Object.keys(mdxComponents).filter((name) => /^[A-Z]/.test(name)),
);
