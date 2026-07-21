"use client";
// 발행 후 배포 상태 폴링 표시 (T027, research R10) — 소유: 레인 C
// GitHub 커밋 성공 ≠ 공개 반영. commitSha로 /api/admin/deploy-status를 폴링해
// "반영 중 → 반영 완료 / 배포 실패"를 표시한다 (SC-001: 5분 내 확인).
import { useEffect, useState } from "react";
import type { DeployState } from "@/lib/types";

const POLL_INTERVAL_MS = 5000;
const MAX_POLL_MS = 10 * 60 * 1000; // 10분 후 폴링 중단

type Display = DeployState | "timeout" | "poll-error";

export function DeployStatus({ commitSha }: { commitSha: string }) {
  const [state, setState] = useState<Display>("not-found");

  useEffect(() => {
    let stopped = false;
    const startedAt = Date.now();

    async function poll() {
      if (stopped) return;
      if (Date.now() - startedAt > MAX_POLL_MS) {
        setState("timeout");
        return;
      }
      try {
        const res = await fetch(`/api/admin/deploy-status?sha=${commitSha}`);
        if (stopped) return;
        if (!res.ok) {
          setState("poll-error");
        } else {
          const { state: next } = (await res.json()) as { state: DeployState };
          setState(next);
          if (next === "ready" || next === "error") return; // 종결 상태 — 폴링 종료
        }
      } catch {
        if (!stopped) setState("poll-error");
      }
      setTimeout(poll, POLL_INTERVAL_MS);
    }

    void poll();
    return () => {
      stopped = true;
    };
  }, [commitSha]);

  const label: Record<Display, { text: string; className: string }> = {
    "not-found": { text: "배포 대기 중...", className: "text-zinc-500" },
    building: { text: "반영 중...", className: "text-blue-600" },
    ready: { text: "반영 완료", className: "text-green-600" },
    error: { text: "배포 실패 — 공개 사이트는 이전 배포가 유지됩니다", className: "text-red-600" },
    timeout: { text: "배포 상태 확인 시간 초과 — Vercel에서 직접 확인하세요", className: "text-amber-600" },
    "poll-error": { text: "배포 상태 확인 실패", className: "text-amber-600" },
  };

  return (
    <span aria-live="polite" className={`text-xs font-medium ${label[state].className}`}>
      {label[state].text}
    </span>
  );
}
