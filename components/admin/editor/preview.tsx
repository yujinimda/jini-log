"use client";
// 클라이언트 프리뷰 (T024, research R2) — 소유: 레인 C
// @mdx-js/mdx evaluate를 lib/mdx-options의 remark/rehype 플러그인 "그대로" 사용하고
// components/mdx/registry의 컴포넌트로 렌더한다 — 발행 렌더와 같은 파이프라인.
// 동시에 디바운스로 서버 검증(/api/admin/validate)을 호출해 최종 권위의 판정을 표시한다.
import { Component, useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import * as runtime from "react/jsx-runtime";
import { evaluate } from "@mdx-js/mdx";
import { mdxComponents } from "@/components/mdx/registry";
import { rehypePlugins, remarkPlugins } from "@/lib/mdx-options";
import type { PostFrontmatter } from "@/lib/types";
import { readApiError } from "./types";

interface MdxErrorDetail {
  message: string;
  line?: number;
  column?: number;
}

export type ServerVerdict =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "valid" }
  | { state: "invalid"; code: string; message: string; errors: MdxErrorDetail[] };

/** 렌더 중 런타임 오류가 프리뷰 밖으로 번지지 않게 격리 */
class PreviewBoundary extends Component<
  { resetKey: string; children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidUpdate(prev: { resetKey: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          프리뷰 렌더 오류: {this.state.error.message}
        </p>
      );
    }
    return this.props.children;
  }
}

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export function Preview({
  frontmatter,
  body,
  onVerdict,
}: {
  frontmatter: PostFrontmatter;
  body: string;
  onVerdict?: (verdict: ServerVerdict) => void;
}) {
  const debouncedBody = useDebounced(body, 400);
  const [Content, setContent] = useState<ComponentType<{
    components?: typeof mdxComponents;
  }> | null>(null);
  const [compileError, setCompileError] = useState<string | null>(null);

  // 클라이언트 컴파일 — 발행 렌더와 동일한 플러그인 목록 (mdx-options 단일 진실 공급원)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mod = await evaluate(debouncedBody, {
          ...runtime,
          remarkPlugins,
          rehypePlugins,
        });
        if (cancelled) return;
        setContent(() => mod.default);
        setCompileError(null);
      } catch (err) {
        if (cancelled) return;
        setCompileError((err as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedBody]);

  // 서버 검증 — 저장 가능 여부의 최종 권위 (R2: 프리뷰가 통과해도 서버가 거부하면 커밋 불가)
  const debouncedFm = useDebounced(frontmatter, 800);
  const debouncedBodySlow = useDebounced(body, 800);
  const [verdict, setVerdict] = useState<ServerVerdict>({ state: "idle" });
  const verdictSeq = useRef(0);

  useEffect(() => {
    const seq = ++verdictSeq.current;
    (async () => {
      await Promise.resolve(); // 동기 setState 회피 — 커밋 후 비동기로 반영
      if (seq !== verdictSeq.current) return;
      setVerdict({ state: "checking" });
      try {
        const res = await fetch("/api/admin/validate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ frontmatter: debouncedFm, body: debouncedBodySlow }),
        });
        if (seq !== verdictSeq.current) return;
        if (res.ok) {
          setVerdict({ state: "valid" });
        } else {
          const err = await readApiError(res);
          setVerdict({
            state: "invalid",
            code: err.code,
            message: err.message,
            errors: Array.isArray(err.detail) ? (err.detail as MdxErrorDetail[]) : [],
          });
        }
      } catch {
        if (seq === verdictSeq.current) setVerdict({ state: "idle" });
      }
    })();
  }, [debouncedFm, debouncedBodySlow]);

  useEffect(() => {
    onVerdict?.(verdict);
  }, [verdict, onVerdict]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-zinc-200 px-3 py-1.5 text-xs" aria-live="polite">
        {verdict.state === "checking" && <span className="text-zinc-400">서버 검증 중...</span>}
        {verdict.state === "valid" && <span className="text-green-600">서버 검증 통과</span>}
        {verdict.state === "invalid" && (
          <span className="text-red-600">
            서버 검증 실패 ({verdict.code}): {verdict.message}
          </span>
        )}
        {verdict.state === "idle" && <span className="text-zinc-400">프리뷰</span>}
      </div>
      <div className="prose prose-zinc min-w-0 flex-1 overflow-auto p-4 text-sm">
        {compileError ? (
          <p className="rounded-md bg-amber-50 p-3 text-sm whitespace-pre-wrap text-amber-800">
            컴파일 오류: {compileError}
          </p>
        ) : Content ? (
          <PreviewBoundary resetKey={debouncedBody}>
            <Content components={mdxComponents} />
          </PreviewBoundary>
        ) : (
          <p className="text-zinc-400">본문을 입력하면 프리뷰가 표시됩니다</p>
        )}
      </div>
    </div>
  );
}
