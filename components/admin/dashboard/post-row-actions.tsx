"use client";
// 발행취소·삭제 UI (T042, US4 → 002 T021: 브라우저 confirm 팝업 → 앱 다이얼로그) — 소유: 레인 C
// 확인 → POST /api/admin/posts 액션. API 요청·순서는 001 그대로 (표현만 교체 — FR-012).
// sha는 액션 직전에 단건 조회로 얻는다 (낙관적 잠금 — 목록 응답에는 sha가 없다).
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PostActionResponse, PostStatus } from "@/lib/types";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { setPendingDeploy } from "@/components/admin/dashboard/deploy-banner";
import { readApiError } from "@/components/admin/editor/types";

type ActionKind = "unpublish" | "delete";

export function PostRowActions({ slug, status }: { slug: string; status: PostStatus }) {
  const router = useRouter();
  const [busy, setBusy] = useState<ActionKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** 어떤 액션의 확인 다이얼로그가 열려 있는지 (T021 — 브라우저 confirm 팝업 대체) */
  const [confirming, setConfirming] = useState<ActionKind | null>(null);
  /** 발행취소 시 같은 slug 초안 존재(409 slug-exists) → 덮어쓰기 확인 다이얼로그 */
  const [overwritePrompt, setOverwritePrompt] = useState<{
    action: ActionKind;
    message: string;
  } | null>(null);

  async function run(action: ActionKind, overwrite = false) {
    setBusy(action);
    setError(null);
    try {
      // 낙관적 잠금용 현재 sha 조회
      const single = await fetch(`/api/admin/posts/${slug}?status=${status}`);
      if (!single.ok) {
        const err = await readApiError(single);
        throw new Error(err.message);
      }
      const { sha } = (await single.json()) as { sha: string };

      const res = await fetch("/api/admin/posts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, slug, sha, ...(overwrite ? { overwrite: true } : {}) }),
      });
      if (!res.ok) {
        const err = await readApiError(res);
        if (err.status === 409 && err.code === "slug-exists") {
          // 발행취소 시 같은 slug의 초안이 이미 있는 경우 — 명시적 덮어쓰기 확인 후 재시도
          setOverwritePrompt({ action, message: err.message });
          return;
        }
        if (err.status === 409 && err.code === "stale-sha") {
          throw new Error(`${err.message} 목록을 새로고침합니다.`);
        }
        throw new Error(err.message);
      }

      const data = (await res.json()) as PostActionResponse;
      // 발행 글이 바뀌면 재배포가 일어난다 — refresh로 행이 사라져도 폴링이
      // 유지되도록 대시보드 레벨 배너에 위임 (codex-review 반영)
      if (status === "published") {
        setPendingDeploy({
          sha: data.commitSha,
          label: `"${slug}" ${action === "unpublish" ? "발행취소" : "삭제"} 반영`,
        });
      }
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      {error && (
        <span role="alert" className="max-w-48 truncate text-xs text-red-600" title={error}>
          {error}
        </span>
      )}
      {status === "published" && (
        <button
          onClick={() => setConfirming("unpublish")}
          disabled={busy !== null}
          className="rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
        >
          {busy === "unpublish" ? "취소 중..." : "발행취소"}
        </button>
      )}
      <button
        onClick={() => setConfirming("delete")}
        disabled={busy !== null}
        className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        {busy === "delete" ? "삭제 중..." : "삭제"}
      </button>

      <ConfirmDialog
        open={confirming === "unpublish"}
        onOpenChange={(open) => !open && setConfirming(null)}
        title="발행 취소"
        description={`"${slug}" 글의 발행을 취소할까요?\n초안으로 이동하고, 재배포 후 공개 페이지에서 제거됩니다.`}
        confirmLabel="발행취소"
        onConfirm={() => void run("unpublish")}
      />
      <ConfirmDialog
        open={confirming === "delete"}
        onOpenChange={(open) => !open && setConfirming(null)}
        title="글 삭제"
        description={`"${slug}" 글을 삭제할까요?\n파일이 제거됩니다 (git 이력에는 보존됩니다).`}
        confirmLabel="삭제"
        destructive
        onConfirm={() => void run("delete")}
      />
      <ConfirmDialog
        open={overwritePrompt !== null}
        onOpenChange={(open) => !open && setOverwritePrompt(null)}
        title="기존 초안 덮어쓰기"
        description={
          overwritePrompt ? `${overwritePrompt.message}\n\n기존 초안을 덮어쓸까요?` : ""
        }
        confirmLabel="덮어쓰기"
        destructive
        onConfirm={() => {
          if (!overwritePrompt) return;
          const { action } = overwritePrompt;
          setOverwritePrompt(null);
          void run(action, true);
        }}
      />
    </span>
  );
}
