"use client";
// 대시보드 레벨 배포 반영 배너 — 행 액션(발행취소·삭제) 후 router.refresh()로 행이
// 사라져도 폴링이 유지되도록, 상태를 행 밖(sessionStorage + 이벤트)에 둔다 (codex-review 반영)
import { useEffect, useState } from "react";
import { DeployStatus } from "@/components/admin/editor/deploy-status";

const STORAGE_KEY = "admin-pending-deploy";
const EVENT_NAME = "admin-deploy-pending";

export interface PendingDeploy {
  sha: string;
  label: string;
}

/** 행 액션이 refresh 직전에 호출 — 배너가 이어서 폴링한다 */
export function setPendingDeploy(pending: PendingDeploy) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch {
    // sessionStorage 불가 환경 — 폴링 표시만 포기, 액션 자체는 이미 성공
  }
}

export function DeployBanner() {
  const [pending, setPending] = useState<PendingDeploy | null>(null);

  useEffect(() => {
    const load = () => {
      try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        setPending(raw ? (JSON.parse(raw) as PendingDeploy) : null);
      } catch {
        setPending(null);
      }
    };
    load();
    window.addEventListener(EVENT_NAME, load);
    return () => window.removeEventListener(EVENT_NAME, load);
  }, []);

  if (!pending) return null;

  const dismiss = () => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // 무시 — 상태만 닫는다
    }
    setPending(null);
  };

  return (
    <div className="mb-4 flex items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
      <span>{pending.label}</span>
      <DeployStatus key={pending.sha} commitSha={pending.sha} />
      <button
        type="button"
        onClick={dismiss}
        className="ml-auto text-zinc-400 hover:text-zinc-600"
        aria-label="배포 상태 배너 닫기"
      >
        닫기
      </button>
    </div>
  );
}
