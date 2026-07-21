"use client";
// 에디터 본체 (T023) — CodeMirror 마크다운 입력 + frontmatter 폼 + 기존 글 로드.
// 발행된 글은 slug 잠금 (FR-016 — 서버도 slug-immutable로 강제). 소유: 레인 C
import { useEffect, useMemo, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import type { PostStatus } from "@/lib/types";
import { FrontmatterFields } from "./frontmatter-form";
import { imageUploadExtension } from "./image-upload";
import { Preview } from "./preview";
import { useDraftBackup } from "./use-draft-backup";
import { emptyForm, fromFrontmatter, readApiError, toFrontmatter, type FrontmatterForm } from "./types";

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

  const frontmatter = useMemo(() => toFrontmatter(form), [form]);

  // 작성 중 자동 백업·복원 (FR-007) — 저장 성공 시 clearBackup 호출
  const backup = useDraftBackup({ originalSlug, form, body, slug, ready: !loading && !loadError });

  // 이미지 붙여넣기/드래그 업로드 (T026) — slug는 ref로 읽어 확장을 재생성하지 않는다
  const slugRef = useRef(slug);
  slugRef.current = slug;
  const [uploadError, setUploadError] = useState<string | null>(null);
  const extensions = useMemo(
    () => [markdown(), imageUploadExtension(() => slugRef.current, setUploadError)],
    [],
  );

  const restoreBackup = () => {
    if (!backup.pending) return;
    setForm(backup.pending.form);
    setBody(backup.pending.body);
    if (status !== "published") setSlug(backup.pending.slug);
    backup.dismissPending();
  };

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
      {backup.pending && (
        <div
          role="alert"
          className="flex items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900"
        >
          <span>
            저장되지 않은 작성 내용이 있습니다 (
            {new Date(backup.pending.savedAt).toLocaleString("ko-KR")} 백업). 복원할까요?
          </span>
          <span className="flex shrink-0 gap-2">
            <button
              onClick={restoreBackup}
              className="rounded-md bg-amber-600 px-2 py-1 text-xs font-medium text-white"
            >
              복원
            </button>
            <button
              onClick={backup.clearBackup}
              className="rounded-md border border-amber-300 px-2 py-1 text-xs"
            >
              백업 삭제
            </button>
          </span>
        </div>
      )}
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
          {uploadError && (
            <p
              role="alert"
              className="flex items-center justify-between gap-2 border-b border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700"
            >
              <span>{uploadError}</span>
              <button onClick={() => setUploadError(null)} className="shrink-0 underline">
                닫기
              </button>
            </p>
          )}
          <CodeMirror
            value={body}
            onChange={setBody}
            extensions={extensions}
            height="100%"
            className="h-full text-sm"
            placeholder="마크다운 + 등록된 컴포넌트(<Callout>, <Collapse>)로 본문을 작성하세요. 이미지는 붙여넣기/드래그로 업로드됩니다."
          />
        </section>
        <section className="hidden min-w-0 flex-1 md:block" aria-label="프리뷰">
          <Preview frontmatter={frontmatter} body={body} />
        </section>
      </main>
    </div>
  );
}
