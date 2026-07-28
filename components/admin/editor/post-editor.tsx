"use client";
// 에디터 본체 (T023) — CodeMirror 마크다운 입력 + frontmatter 폼 + 기존 글 로드.
// 발행된 글은 slug 잠금 (FR-016 — 서버도 slug-immutable로 강제). 소유: 레인 C
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { EditorView } from "@codemirror/view";
import { toast } from "sonner";
import type { PostActionResponse, PostStatus } from "@/lib/types";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { setPendingDeploy } from "@/components/admin/dashboard/deploy-banner";
import { insertLink, wrapSelection } from "./commands";
import { EditorToolbar } from "./editor-toolbar";
import { FrontmatterFields } from "./frontmatter-form";
import { imageUploadExtension, uploadImageFiles } from "./image-upload";
import { Preview } from "./preview";
import { useDraftBackup } from "./use-draft-backup";
import {
  emptyForm,
  fromFrontmatter,
  humanizeValidationMessage,
  readApiError,
  toFrontmatter,
  type ApiErrorInfo,
  type FrontmatterForm,
} from "./types";

/** 실패 toast 요약 문구 — 인라인 배너와 같은 분류 (T022) */
function errorSummary(code: string): string {
  switch (code) {
    case "invalid-mdx":
      return "본문에 문제가 있어 저장하지 못했습니다";
    case "invalid-frontmatter":
      return "채워야 할 항목이 있어 저장하지 못했습니다";
    case "stale-sha":
      return "다른 곳에서 이 글이 바뀌었습니다";
    default:
      return "저장하지 못했습니다";
  }
}

/**
 * 저장 상태 (C7) — 예전에는 "마지막 저장 —"만 있어서 지금 내용이 저장된 것인지
 * 알 수 없었다. 미저장이면 그렇다고 말하고, 저장됐으면 시각을 보여준다.
 */
function SaveState({ dirty, savedAt }: { dirty: boolean; savedAt: Date | null }) {
  if (dirty) {
    return (
      <span className="shrink-0 text-xs whitespace-nowrap text-amber-700">저장하지 않은 변경</span>
    );
  }
  if (!savedAt) return null;
  return (
    <span className="shrink-0 text-xs whitespace-nowrap text-zinc-400">
      {savedAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false })}{" "}
      저장됨
    </span>
  );
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

  // 이미지 붙여넣기/드래그 업로드 (T026) — slug는 ref로 읽어 확장을 재생성하지 않는다.
  // 렌더 시점 대입이어야 slug 수정 직후의 paste/drop이 옛 값을 읽는 레이스가 없다
  // (codex-review 반영 — effect 동기화는 passive flush 전 DOM 이벤트에 늦는다)
  const slugRef = useRef(slug);
  // eslint-disable-next-line react-hooks/refs -- 이벤트 핸들러 전용 최신값 미러 (렌더 로직에 미사용)
  slugRef.current = slug;
  // 업로드 성공·실패 통지는 toast (T022) — 인라인 배너 제거
  const extensions = useMemo(
    () => [
      markdown(),
      // 긴 문단이 접히게 한다 (C8). 이게 없어 한 줄이 길어지면 가로 스크롤이 생겼다 —
      // 코드가 아니라 산문을 쓰는 에디터라 가로 스크롤은 그 자체로 결함이다.
      EditorView.lineWrapping,
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

  // 툴바가 명령을 보낼 대상 (C8). onCreateEditor로 EditorView를 잡아둔다.
  const viewRef = useRef<EditorView | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  /** 파일 대화상자가 열리면 포커스가 에디터를 떠난다 — 삽입 위치를 미리 붙잡는다 */
  const pendingImagePos = useRef(0);

  const pickImage = () => {
    const view = viewRef.current;
    if (!view) return;
    pendingImagePos.current = view.state.selection.main.head;
    fileInputRef.current?.click();
  };

  const onImageFilesSelected = async (files: FileList | null) => {
    const view = viewRef.current;
    if (!view || !files || files.length === 0) return;
    await uploadImageFiles(
      view,
      Array.from(files),
      pendingImagePos.current,
      () => slugRef.current,
      (m) => toast.error(m),
      (m) => toast.success(m),
    );
    // 같은 파일을 다시 고를 수 있게 초기화
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

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
  /** 마지막 저장 시각 — 액션바에 상시 표시 (T024) */
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  /** 프리뷰 패널 토글 (T024) — md 미만에서는 원래 숨김이라 md+에서만 의미 있음 */
  const [showPreview, setShowPreview] = useState(true);
  /** 좁은 화면 탭 — 예전에는 프리뷰가 md 미만에서 아예 접근 불가였다 (codex-review 반영) */
  const [mobilePane, setMobilePane] = useState<"write" | "preview">("write");
  const router = useRouter();

  // 미저장 변경 추적 (C7) — 저장 시점의 내용과 현재 내용을 비교한다.
  // 예전에는 "마지막 저장 —"만 있어 지금 내용이 저장된 것인지 알 수 없었다.
  //
  // 새 글의 기준선은 "빈 글"이다. ""로 두면 아무것도 안 쓴 화면이 곧바로
  // "저장하지 않은 변경"이 돼 경고가 무뎌진다. 렌더 중 읽으므로 ref가 아닌 state.
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    editingExisting ? "" : JSON.stringify({ form: emptyForm(), body: "", slug: "" }),
  );
  const currentSnapshot = JSON.stringify({ form, body, slug });
  // 기존 글은 로드가 끝나기 전까지 비교 기준이 없다 — 그동안은 깨끗한 상태로 본다
  const isDirty = savedSnapshot !== "" && savedSnapshot !== currentSnapshot;

  // 닫기 전 경고 — 작성 내용은 localStorage에도 백업되지만, 실수로 탭을 닫는 것 자체를 막는다
  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

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
      toast.error(errorSummary(err.code), { description: humanizeValidationMessage(err.message) });
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
    setLastSavedAt(new Date());
    // 지금 내용을 "저장된 상태"로 기록 — 이후 편집이 있어야 dirty가 된다
    setSavedSnapshot(JSON.stringify({ form, body, slug: trimmedSlug }));
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

  // ⌘/Ctrl+S = 초안 저장 (C7). 브라우저의 "페이지 저장"을 가로챈다.
  // 발행 글 편집 중에는 초안 저장이 없으므로 아무것도 하지 않는다.
  const canSaveDraft = status !== "published";
  // 핸들러가 항상 최신 runAction을 보게 하되, ref 갱신은 렌더가 아니라 effect에서 한다
  // (react-hooks/refs — 렌더 중 ref 변경 금지)
  const runActionRef = useRef(runAction);
  useEffect(() => {
    runActionRef.current = runAction;
  });
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;

      // 서식 단축키는 툴바 버튼과 같은 명령을 부른다 (C8).
      // 에디터에 포커스가 있을 때만 — 제목·요약 입력에서 ⌘B가 먹으면 곤란하다.
      const inEditor = viewRef.current?.hasFocus;
      if (inEditor) {
        if (e.key === "b") {
          e.preventDefault();
          wrapSelection(viewRef.current, "**", "**", "굵은 텍스트");
          return;
        }
        if (e.key === "i") {
          e.preventDefault();
          wrapSelection(viewRef.current, "*", "*", "기울인 텍스트");
          return;
        }
        if (e.key === "k") {
          e.preventDefault();
          insertLink(viewRef.current);
          return;
        }
      }

      if (e.key !== "s") return;
      e.preventDefault();
      if (canSaveDraft) void runActionRef.current("save-draft");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canSaveDraft]);

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
      // 불러온 직후는 저장된 상태 — 손대기 전까지 dirty가 아니다
      setSavedSnapshot(
        JSON.stringify({
          form: fromFrontmatter(data.frontmatter),
          body: data.body,
          slug: initialSlug,
        }),
      );
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
      {/* 상단 액션바 (C7 재구성)
          - 이탈(대시보드)은 왼쪽 끝, 발행은 오른쪽 끝 — 예전에는 둘이 붙어 있었다
          - 버튼 타깃 확대(py-1.5 → py-2, text-xs → text-sm)
          - "마지막 저장 —" 대신 저장 여부를 상태로 말한다 */}
      <div className="sticky top-0 z-40 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-zinc-200 bg-white/95 px-6 py-3 backdrop-blur sm:px-8">
        <a
          href="/admin"
          className="-ml-1.5 flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-sm text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
        >
          <span aria-hidden="true">←</span> 대시보드
        </a>

        <div className="flex min-w-0 items-center gap-2.5">
          <h1 className="truncate text-sm font-semibold text-zinc-800">
            {status === "new" ? "새 글" : (originalSlug ?? slug)}
          </h1>
          {status !== "new" && (
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                status === "published"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-zinc-100 text-zinc-600"
              }`}
            >
              {status === "published" ? "발행됨" : "초안"}
            </span>
          )}
          <SaveState dirty={isDirty} savedAt={lastSavedAt} />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowPreview((v) => !v)}
            aria-pressed={showPreview}
            className="hidden rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 md:block"
          >
            {showPreview ? "프리뷰 숨기기" : "프리뷰 보기"}
          </button>
          {canSaveDraft && (
            <button
              onClick={() => runAction("save-draft")}
              disabled={saving !== null}
              title="⌘S"
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            >
              {saving === "save-draft" ? "저장 중…" : "초안 저장"}
            </button>
          )}
          <button
            onClick={() => runAction("publish")}
            disabled={saving !== null}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {saving === "publish" ? "발행 중…" : status === "published" ? "재발행" : "발행"}
          </button>
        </div>
      </div>

      {/* 메타 영역 — 폭을 제한한다. 예전에는 px-4뿐이라 1440px 화면에서 제목 입력이
          1400px로 늘어나 스캔이 불가능했다. 폭 토큰은 blog.css의 --content-w 단일 출처. */}
      <header className="border-b border-zinc-200 bg-white px-6 py-7 sm:px-10 sm:py-9">
        <div className="mx-auto w-full max-w-[var(--content-w)]">
          {/* 실패 통지는 toast (T022) — 인라인은 422 행·열/필드 오류 목록과 stale 재로드 유도만 유지 (계약 예외) */}
          {actionError && (errorDetails.length > 0 || isStale) && (
          <div
            role="alert"
            className="mb-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          >
            <p className="font-medium">{errorSummary(actionError.code)}</p>
            <p className="mt-0.5">{humanizeValidationMessage(actionError.message)}</p>
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
        </div>
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

      {/* 좁은 화면 탭 — 예전에는 프리뷰가 md 미만에서 DOM에조차 없어 볼 방법이 없었다 */}
      <div className="flex gap-1 border-b border-zinc-200 bg-zinc-50 px-3 py-1.5 md:hidden">
        {(["write", "preview"] as const).map((pane) => (
          <button
            key={pane}
            onClick={() => setMobilePane(pane)}
            aria-pressed={mobilePane === pane}
            className={`rounded-md px-3 py-1.5 text-sm ${
              mobilePane === pane
                ? "bg-white font-medium text-zinc-900 shadow-sm"
                : "text-zinc-500 hover:text-zinc-900"
            }`}
          >
            {pane === "write" ? "작성" : "발행 후 모습"}
          </button>
        ))}
      </div>

      <main className="flex min-h-0 flex-1">
        {/* 툴바 + 에디터를 세로로 쌓는다. height="100%"인 CodeMirror 위에 그냥 올리면
            높이가 넘치므로 flex column + min-h-0으로 잡는다 (codex-review 반영). */}
        <section
          className={`flex min-h-0 min-w-0 flex-1 flex-col border-r border-zinc-200 ${
            mobilePane === "write" ? "" : "hidden md:flex"
          }`}
          aria-label="마크다운 편집"
        >
          <EditorToolbar getView={() => viewRef.current} onPickImage={pickImage} />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            multiple
            className="hidden"
            onChange={(e) => void onImageFilesSelected(e.target.files)}
          />
          <div className="min-h-0 flex-1 overflow-auto">
            <CodeMirror
              value={body}
              onChange={setBody}
              onCreateEditor={(view) => {
                viewRef.current = view;
              }}
              extensions={extensions}
              height="100%"
              // 에디터 내부 여백 — 예전에는 글자가 거터에 붙어 시작했다
              className="admin-editor h-full text-sm"
              placeholder="마크다운으로 본문을 씁니다. 위 버튼이나 ⌘B·⌘K를 쓸 수 있고, 이미지는 붙여넣거나 끌어다 놓으면 업로드됩니다."
            />
          </div>
        </section>
        {showPreview && (
          <section
            className={`min-w-0 flex-1 ${mobilePane === "preview" ? "" : "hidden md:block"}`}
            aria-label="발행 후 모습"
          >
            <Preview
              frontmatter={frontmatter}
              body={body}
              // 초안을 쓰는 중에 "제목이 비었다"고 알리지 않는다 — 초안은 그대로 저장된다 (C7)
              mode={status === "published" ? "publish" : "draft"}
            />
          </section>
        )}
      </main>
    </div>
  );
}
