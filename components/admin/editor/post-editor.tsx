"use client";
// 에디터 본체 (T023) — CodeMirror 마크다운 입력 + frontmatter 폼 + 기존 글 로드.
// 발행된 글은 slug 잠금 (FR-016 — 서버도 slug-immutable로 강제). 소유: 레인 C
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { toast } from "sonner";
import type { PostActionResponse, PostStatus } from "@/lib/types";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { setPendingDeploy } from "@/components/admin/dashboard/deploy-banner";
import { FrontmatterFields } from "./frontmatter-form";
import { imageUploadExtension } from "./image-upload";
import { Preview } from "./preview";
import { useDraftBackup } from "./use-draft-backup";
import {
  emptyForm,
  fromFrontmatter,
  readApiError,
  toFrontmatter,
  type ApiErrorInfo,
  type FrontmatterForm,
} from "./types";

/** 실패 toast 요약 문구 — 인라인 배너와 같은 분류 (T022) */
function errorSummary(code: string): string {
  switch (code) {
    case "invalid-mdx":
      return "본문 검증 실패 — 커밋되지 않았습니다";
    case "invalid-frontmatter":
      return "메타데이터 검증 실패 — 커밋되지 않았습니다";
    case "stale-sha":
      return "다른 곳에서 변경됨";
    default:
      return `저장 실패 (${code})`;
  }
}

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
  useEffect(() => {
    slugRef.current = slug;
  }, [slug]);
  // 업로드 성공·실패 통지는 toast (T022) — 인라인 배너 제거
  const extensions = useMemo(
    () => [
      markdown(),
      imageUploadExtension(
        // 게터는 paste/drop "이벤트 시점"에만 ref를 읽는다 — 렌더 중 접근 아님 (규칙 오탐)
        // eslint-disable-next-line react-hooks/refs
        () => slugRef.current,
        (message) => toast.error(message),
        (message) => toast.success(message),
      ),
    ],
    [],
  );

  const restoreBackup = () => {
    if (!backup.pending) return;
    setForm(backup.pending.form);
    setBody(backup.pending.body);
    if (status !== "published") setSlug(backup.pending.slug);
    backup.dismissPending();
  };

  // ── 저장/발행 플로우 (T027) ──────────────────────────────────────────────
  const [saving, setSaving] = useState<"save-draft" | "publish" | null>(null);
  const [actionError, setActionError] = useState<ApiErrorInfo | null>(null);
  const [isStale, setIsStale] = useState(false);
  /** 409 slug-exists → 덮어쓰기 확인 다이얼로그 (T021 — 브라우저 confirm 팝업 대체, overwrite 재시도 플로우는 001 그대로) */
  const [overwritePrompt, setOverwritePrompt] = useState<{
    action: "save-draft" | "publish";
    message: string;
  } | null>(null);
  const router = useRouter();

  async function runAction(action: "save-draft" | "publish", overwrite = false) {
    const trimmedSlug = slug.trim();
    setSaving(action);
    setActionError(null);
    setIsStale(false);

    let res: Response;
    try {
      res = await fetch("/api/admin/posts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action,
          slug: trimmedSlug,
          originalSlug,
          // 편집 출처(초안/발행본) — 서버의 재발행 판정 근거 (codex-review 반영)
          originalStatus: status === "new" ? undefined : status,
          frontmatter,
          body,
          sha,
          ...(overwrite ? { overwrite: true } : {}),
        }),
      });
    } catch {
      // 네트워크 실패 — 작성 내용은 localStorage 백업에 남아 있다 (SC-006)
      setSaving(null);
      toast.error("저장 요청이 실패했습니다 (네트워크)", {
        description: "작성 내용은 브라우저에 백업되어 있습니다.",
      });
      return;
    }
    setSaving(null);

    if (!res.ok) {
      const err = await readApiError(res);
      if (err.status === 409 && err.code === "slug-exists") {
        // 덮어쓰기 확인 (409 slug-exists → 확인 시 overwrite 재시도)
        setOverwritePrompt({ action, message: err.message });
        return;
      }
      if (err.status === 409 && err.code === "stale-sha") {
        setIsStale(true); // 재로드 유도
      }
      setActionError(err);
      // 실패 toast — 요약 + 사유. 422의 행·열 오류 목록은 에디터 인라인 유지 (계약)
      toast.error(errorSummary(err.code), { description: err.message });
      return;
    }

    const data = (await res.json()) as PostActionResponse;
    backup.clearBackup();

    // 발행 완료 → 대시보드로 이동, 반영 상태는 대시보드 배너가 이어서 폴링 (사용자 피드백 반영)
    if (action === "publish") {
      setPendingDeploy({ sha: data.commitSha, label: `"${trimmedSlug}" 발행 반영` });
      // Toaster가 admin 레이아웃에 있어 대시보드 이동 후에도 toast가 유지된다 (T022)
      toast.success(`"${trimmedSlug}" 글을 발행했습니다`, {
        action: { label: "커밋 보기", onClick: () => window.open(data.commitUrl, "_blank") },
      });
      router.push("/admin");
      return;
    }

    setStatus("draft");
    setOriginalSlug(trimmedSlug);
    toast.success(`"${trimmedSlug}" 초안을 저장했습니다`, {
      action: { label: "커밋 보기", onClick: () => window.open(data.commitUrl, "_blank") },
    });

    // URL을 저장된 글 기준으로 동기화 — 새로고침해도 같은 글 편집이 이어진다
    window.history.replaceState(null, "", `/admin/write?slug=${trimmedSlug}&status=draft`);

    // 다음 수정 커밋을 위한 새 파일 sha 재조회 (응답 계약에는 파일 sha가 없다)
    try {
      const single = await fetch(`/api/admin/posts/${trimmedSlug}?status=draft`);
      if (single.ok) {
        const { sha: newSha } = (await single.json()) as { sha: string };
        setSha(newSha);
      }
    } catch {
      // sha 재조회 실패 시 다음 저장에서 stale-sha로 드러난다 — 치명적이지 않음
    }
  }

  /** 422 invalid-mdx의 detail([{message, line, column}]) → 오류 위치 목록 */
  const errorDetails: { message: string; line?: number; column?: number; field?: string }[] =
    Array.isArray(actionError?.detail)
      ? (actionError.detail as { message: string; line?: number; column?: number; field?: string }[])
      : [];

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
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-sm font-semibold text-zinc-700">
            {status === "new" ? "새 글 작성" : `편집: ${originalSlug ?? slug} (${status === "published" ? "발행됨" : "초안"})`}
          </h1>
          <div className="flex items-center gap-3">
            {status !== "published" && (
              <button
                onClick={() => runAction("save-draft")}
                disabled={saving !== null}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
              >
                {saving === "save-draft" ? "저장 중..." : "초안 저장"}
              </button>
            )}
            <button
              onClick={() => runAction("publish")}
              disabled={saving !== null}
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
            >
              {saving === "publish" ? "발행 중..." : status === "published" ? "재발행" : "발행"}
            </button>
            <a href="/admin" className="text-xs text-zinc-500 underline">
              대시보드
            </a>
          </div>
        </div>
        {/* 실패 통지는 toast (T022) — 인라인은 422 행·열/필드 오류 목록과 stale 재로드 유도만 유지 (계약 예외) */}
        {actionError && (errorDetails.length > 0 || isStale) && (
          <div
            role="alert"
            className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          >
            <p className="font-medium">{errorSummary(actionError.code)}</p>
            <p className="mt-0.5">{actionError.message}</p>
            {errorDetails.length > 0 && (
              <ul className="mt-1 list-disc pl-5 text-xs">
                {errorDetails.map((e, i) => (
                  <li key={i}>
                    {e.line !== undefined
                      ? `${e.line}행${e.column !== undefined ? ` ${e.column}열` : ""}: `
                      : e.field
                        ? `${e.field}: `
                        : ""}
                    {e.message}
                  </li>
                ))}
              </ul>
            )}
            {isStale && (
              <button
                onClick={() => window.location.reload()}
                className="mt-2 rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white"
              >
                최신 내용 다시 불러오기 (현재 내용은 백업됨)
              </button>
            )}
          </div>
        )}
        <FrontmatterFields
          form={form}
          onChange={setForm}
          slug={slug}
          onSlugChange={setSlug}
          slugLocked={status === "published"}
        />
      </header>

      <ConfirmDialog
        open={overwritePrompt !== null}
        onOpenChange={(open) => !open && setOverwritePrompt(null)}
        title="기존 파일 덮어쓰기"
        description={
          overwritePrompt ? `${overwritePrompt.message}\n\n기존 파일을 덮어쓸까요?` : ""
        }
        confirmLabel="덮어쓰기"
        destructive
        onConfirm={() => {
          if (!overwritePrompt) return;
          const { action } = overwritePrompt;
          setOverwritePrompt(null);
          void runAction(action, true);
        }}
      />

      <main className="flex min-h-0 flex-1">
        <section className="min-w-0 flex-1 border-r border-zinc-200" aria-label="마크다운 편집">
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
