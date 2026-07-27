"use client";
// 발행취소·삭제 UI (T042, US4 → 002 T021: 브라우저 confirm 팝업 → 앱 다이얼로그) — 소유: 레인 C
// 확인 → POST /api/admin/posts 액션. API 요청·순서는 001 그대로 (표현만 교체 — FR-012).
// sha는 액션 직전에 단건 조회로 얻는다 (낙관적 잠금 — 목록 응답에는 sha가 없다).
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { PostActionResponse, PostStatus } from "@/lib/types";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { setPendingDeploy } from "@/components/admin/dashboard/deploy-banner";
import { readApiError } from "@/components/admin/editor/types";

type ActionKind = "unpublish" | "delete";

const ACTION_LABEL: Record<ActionKind, string> = { unpublish: "발행취소", delete: "삭제" };

export function PostRowActions({ slug, status }: { slug: string; status: PostStatus }) {
  const router = useRouter();
  const [busy, setBusy] = useState<ActionKind | null>(null);
  /** 중복 실행 차단 — state(busy)는 갱신이 비동기라 빠른 연타를 막지 못한다 */
  const runningRef = useRef(false);
  /** 어떤 액션의 확인 다이얼로그가 열려 있는지 (T021 — 브라우저 confirm 팝업 대체) */
  const [confirming, setConfirming] = useState<ActionKind | null>(null);
  /** 발행취소 시 같은 slug 초안 존재(409 slug-exists) → 덮어쓰기 확인 다이얼로그 */
  const [overwritePrompt, setOverwritePrompt] = useState<{
    action: ActionKind;
    message: string;
  } | null>(null);

  async function run(action: ActionKind, overwrite = false) {
    // 중복 실행 차단 — busy는 state라 갱신이 비동기다. 확인 버튼을 빠르게 두 번 누르면
    // disabled가 반영되기 전에 run()이 두 번 들어오고, 두 번째는 이미 삭제된 글을 다시
    // 지우려다 404로 "삭제 실패" 토스트를 띄운다. ref는 동기적으로 막힌다.
    if (runningRef.current) return;
    runningRef.current = true;

    // 이 지점 이후의 예외는 "액션 실패"가 아니다 — 서버 작업은 이미 커밋됐다
    let committed = false;
    setBusy(action);
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

      // 서버가 2xx를 반환한 시점에 커밋은 이미 끝났다 — 본문 파싱보다 앞에 둔다.
      // (파싱이 실패해도 글은 지워진 상태다. 여기 아래에서 뭐가 터지든 "실패"가 아니다.)
      committed = true;
      const data = (await res.json()) as PostActionResponse;

      // 발행 글이 바뀌면 재배포가 일어난다 — refresh로 행이 사라져도 폴링이
      // 유지되도록 대시보드 레벨 배너에 위임 (codex-review 반영)
      if (status === "published") {
        setPendingDeploy({
          sha: data.commitSha,
          label: `"${slug}" ${action === "unpublish" ? "발행취소" : "삭제"} 반영`,
        });
      }
      toast.success(
        action === "unpublish"
          ? `"${slug}" 발행을 취소했습니다 — 초안으로 이동했습니다`
          : `"${slug}" 글을 삭제했습니다`,
      );
    } catch (err) {
      if (committed) {
        // 커밋은 됐고 후처리(배너·토스트)만 실패했다. 여기서 "실패"라고 알리면
        // 실제로는 지워진 글을 두고 사용자가 재시도하게 된다 — 실제로 겪은 증상이다.
        toast.success(`${ACTION_LABEL[action]} 완료`, {
          description: "화면 갱신 중 문제가 있었습니다. 목록이 이상하면 새로고침해 주세요.",
        });
      } else {
        // 실패 토스트에 사유(message) 포함 — 화면 상태는 오염하지 않는다 (FR-013)
        toast.error(`${ACTION_LABEL[action]} 실패`, { description: (err as Error).message });
      }
    } finally {
      setBusy(null);
      runningRef.current = false;
      // 성공·실패 공통. try 안에 두면 refresh 실패가 "액션 실패"로 둔갑한다.
      router.refresh();
    }
  }

  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
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
