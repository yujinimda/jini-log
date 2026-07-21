"use client";
// 에디터 본체 (T023) — CodeMirror 마크다운 입력 + frontmatter 폼 + 기존 글 로드.
// 발행된 글은 slug 잠금 (FR-016 — 서버도 slug-immutable로 강제). 소유: 레인 C
import { useEffect, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import type { PostStatus } from "@/lib/types";
import { FrontmatterFields } from "./frontmatter-form";
import { emptyForm, fromFrontmatter, readApiError, type FrontmatterForm } from "./types";

export interface PostEditorProps {
  /** 기존 글 편집 시 대상 slug (없으면 새 글) */
  initialSlug?: string;
  /** 기존 글 편집 시 상태 (기본 draft) */
  initialStatus?: PostStatus;
}

export function PostEditor({ initialSlug, initialStatus }: PostEditorProps) {
  const editingExisting = !!initialSlug;
  const [loading, setLoading] = useState(editingExisting);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [form, setForm] = useState<FrontmatterForm>(emptyForm);
  const [body, setBody] = useState("");
  const [slug, setSlug] = useState(initialSlug ?? "");
  /** 편집 시작 시점의 slug — 서버의 slug 불변 검사에 전달 */
  const [originalSlug, setOriginalSlug] = useState<string | undefined>(initialSlug);
  const [status, setStatus] = useState<PostStatus | "new">(
    editingExisting ? (initialStatus ?? "draft") : "new",
  );
  /** 낙관적 잠금용 파일 sha — 수정·이동 커밋에 필수 */
  const [sha, setSha] = useState<string | undefined>(undefined);

  // 기존 글 로드 — GitHub 최신본 + sha (편집 시작)
  useEffect(() => {
    if (!initialSlug) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(
        `/api/admin/posts/${initialSlug}?status=${initialStatus ?? "draft"}`,
      );
      if (cancelled) return;
      if (!res.ok) {
        const err = await readApiError(res);
        setLoadError(err.message);
        setLoading(false);
        return;
      }
      const data = (await res.json()) as {
        frontmatter: Record<string, unknown>;
        body: string;
        sha: string;
      };
      if (cancelled) return;
      setForm(fromFrontmatter(data.frontmatter));
      setBody(data.body);
      setSha(data.sha);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [initialSlug, initialStatus]);

  if (loading) {
    return <p className="p-8 text-sm text-zinc-500">글을 불러오는 중...</p>;
  }
  if (loadError) {
    return (
      <div className="p-8">
        <p className="text-sm text-red-600">불러오기 실패: {loadError}</p>
        <a href="/admin" className="mt-2 inline-block text-sm text-blue-600 underline">
          대시보드로 돌아가기
        </a>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-zinc-200 px-4 py-3">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-sm font-semibold text-zinc-700">
            {status === "new" ? "새 글 작성" : `편집: ${originalSlug ?? slug} (${status === "published" ? "발행됨" : "초안"})`}
          </h1>
          <a href="/admin" className="text-xs text-zinc-500 underline">
            대시보드
          </a>
        </div>
        <FrontmatterFields
          form={form}
          onChange={setForm}
          slug={slug}
          onSlugChange={setSlug}
          slugLocked={status === "published"}
        />
      </header>

      <main className="flex min-h-0 flex-1">
        <section className="min-w-0 flex-1 border-r border-zinc-200" aria-label="마크다운 편집">
          <CodeMirror
            value={body}
            onChange={setBody}
            extensions={[markdown()]}
            height="100%"
            className="h-full text-sm"
            placeholder="마크다운 + 등록된 컴포넌트(<Callout>, <Collapse>)로 본문을 작성하세요"
          />
        </section>
      </main>
    </div>
  );
}
