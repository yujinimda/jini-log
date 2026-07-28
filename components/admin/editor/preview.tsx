"use client";
// 클라이언트 프리뷰 (T024, research R2) — 소유: 레인 C
// @mdx-js/mdx evaluate를 lib/mdx-options의 remark/rehype 플러그인 "그대로" 사용하고
// components/mdx/registry의 컴포넌트로 렌더한다 — 발행 렌더와 같은 파이프라인.
// 동시에 디바운스로 서버 검증(/api/admin/validate)을 호출해 최종 권위의 판정을 표시한다.
import {
  Component,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import * as runtime from "react/jsx-runtime";
import { evaluate } from "@mdx-js/mdx";
// 발행 본문 타이포(.prose)를 프리뷰에도 동일 적용 — "프리뷰 = 발행 모습" (FR-002)
import "@/app/(blog)/blog.css";
import { mdxComponents } from "@/components/mdx/registry";
import { rehypePlugins, remarkPlugins } from "@/lib/mdx-options";
import type { PostFrontmatter } from "@/lib/types";
import { humanizeValidationMessage, readApiError } from "./types";

/** "2026-07-27" → "2026년 7월 27일" (발행 글 메타와 같은 표기) */
function formatPreviewDate(date: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return date;
  return `${m[1]}년 ${Number(m[2])}월 ${Number(m[3])}일`;
}

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
  mode = "publish",
  onVerdict,
}: {
  frontmatter: PostFrontmatter;
  body: string;
  /** 검증 기준 — 초안 편집 중에는 "제목이 비었다"고 알릴 필요가 없다 (C7) */
  mode?: "publish" | "draft";
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
  const [rawVerdict, setVerdict] = useState<ServerVerdict>({ state: "idle" });
  const verdictSeq = useRef(0);

  // 아직 아무것도 안 쓴 글은 검증하지 않는다. 예전에는 새 글 화면을 열자마자
  // 빈 frontmatter로 요청이 나가 "title은 비울 수 없습니다"가 빨갛게 떴다 —
  // 사용자가 손대기도 전에 혼내는 화면이었다.
  const untouched =
    !debouncedFm.title.trim() && !debouncedFm.description.trim() && !debouncedBodySlow.trim();

  useEffect(() => {
    const seq = ++verdictSeq.current;
    // untouched면 요청 자체를 보내지 않는다. verdict는 아래에서 파생값으로 idle 처리하므로
    // 여기서 setState를 하지 않는다 (react-hooks/set-state-in-effect).
    if (untouched) return;
    (async () => {
      await Promise.resolve(); // 동기 setState 회피 — 커밋 후 비동기로 반영
      if (seq !== verdictSeq.current) return;
      setVerdict({ state: "checking" });
      try {
        const res = await fetch("/api/admin/validate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ frontmatter: debouncedFm, body: debouncedBodySlow, mode }),
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
  }, [debouncedFm, debouncedBodySlow, untouched, mode]);

  // 아직 손대지 않은 글은 판정 자체를 내리지 않는다 — 직전 판정이 남아 있어도 idle로 덮는다.
  // effect에서 setState 하지 않고 렌더 중 파생으로 처리한다.
  const verdict: ServerVerdict = useMemo(
    () => (untouched ? { state: "idle" } : rawVerdict),
    [untouched, rawVerdict],
  );

  useEffect(() => {
    onVerdict?.(verdict);
  }, [verdict, onVerdict]);

  const hasHeader = !!(frontmatter.title || frontmatter.description);

  return (
    <div className="flex h-full min-w-0 flex-col bg-zinc-50">
      {/* 이 패널이 "발행 후 모습"임을 명시한다 — 예전에는 빈 흰 판이라 무엇을 보는지 알기 어려웠다 */}
      <div className="flex items-center gap-2 border-b border-zinc-200 bg-white px-[clamp(1.5rem,5%,3.5rem)] py-2.5">
        {/* 좁은 화면에서는 위의 탭이 이미 같은 말을 하므로 숨긴다 */}
        <span className="hidden text-xs font-medium text-zinc-500 md:inline">발행 후 모습</span>
        <span className="ml-auto text-xs" aria-live="polite">
          {verdict.state === "checking" && <span className="text-zinc-400">확인 중</span>}
          {verdict.state === "valid" && (
            // 판정 기준이 곧 문구여야 한다 — 초안 기준으로 통과한 것을 "발행 가능"이라 하면 거짓말이 된다
            <span className="text-emerald-600">
              {mode === "draft" ? "저장 가능" : "발행 가능"}
            </span>
          )}
          {verdict.state === "invalid" && (
            // 코드·필드명은 걷어내고 사람 말만 남긴다 (C7)
            <span className="text-amber-700">{humanizeValidationMessage(verdict.message)}</span>
          )}
        </span>
      </div>

      <div className="min-w-0 flex-1 overflow-auto">
        <article className="mx-auto max-w-[var(--content-w)] px-[clamp(1.5rem,5%,3.5rem)] py-10">
          {/* 발행 글 헤더와 같은 구성 — 세리프 제목은 여기에서만 (어드민 톤 규칙).
              예전에는 본문만 렌더해서 제목·요약·날짜·태그가 프리뷰에 없었다 (codex-review 반영) */}
          {hasHeader && (
            <header className="mb-8 border-b border-zinc-200 pb-6">
              <h1 className="font-serif text-3xl leading-snug font-bold tracking-tight text-zinc-900">
                {frontmatter.title || <span className="text-zinc-300">제목 없음</span>}
              </h1>
              {frontmatter.description && (
                <p className="mt-3 text-lg text-zinc-600">{frontmatter.description}</p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-zinc-500">
                <span>{formatPreviewDate(frontmatter.date)}</span>
                {frontmatter.tags.length > 0 && (
                  <>
                    <span aria-hidden="true" className="text-zinc-300">
                      ·
                    </span>
                    <span className="flex flex-wrap gap-2">
                      {frontmatter.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600"
                        >
                          {tag}
                        </span>
                      ))}
                    </span>
                  </>
                )}
              </div>
            </header>
          )}

          <div className="prose prose-zinc min-w-0">
            {compileError ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm whitespace-pre-wrap text-amber-800">
                본문을 아직 읽을 수 없습니다 — {compileError}
              </p>
            ) : Content ? (
              <PreviewBoundary resetKey={debouncedBody}>
                <Content components={mdxComponents} />
              </PreviewBoundary>
            ) : null}
          </div>

          {!hasHeader && !body.trim() && (
            <p className="py-16 text-center text-sm text-zinc-400">
              왼쪽에 쓰기 시작하면 여기에 발행 모습이 나타납니다
            </p>
          )}
        </article>
      </div>
    </div>
  );
}
