"use client";
// 작성 중 localStorage 자동 백업·복원 (T025, FR-007/SC-006) — 소유: 레인 C
// 저장 실패·새로고침·브라우저 종료 후에도 작성 내용이 유실되지 않는다.
// 성공적으로 서버에 저장되면 백업을 지운다.
import { useCallback, useEffect, useRef, useState } from "react";
import type { FrontmatterForm } from "./types";

const KEY_PREFIX = "jini-log:backup:";

export interface DraftBackup {
  form: FrontmatterForm;
  body: string;
  slug: string;
  savedAt: string;
}

function backupKey(originalSlug: string | undefined): string {
  return `${KEY_PREFIX}${originalSlug ?? "(new)"}`;
}

export function useDraftBackup(params: {
  originalSlug: string | undefined;
  form: FrontmatterForm;
  body: string;
  slug: string;
  /** 서버에서 로드가 끝난 뒤에만 백업 쓰기 시작 (로드 전 빈 값으로 덮어쓰기 방지) */
  ready: boolean;
}) {
  const { originalSlug, form, body, slug, ready } = params;
  const key = backupKey(originalSlug);

  /** 마운트 시 발견된 기존 백업 — 사용자가 복원 여부를 선택한다 */
  const [pending, setPending] = useState<DraftBackup | null>(null);
  const checked = useRef(false);

  useEffect(() => {
    if (!ready || checked.current) return;
    checked.current = true;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const backup = JSON.parse(raw) as DraftBackup;
      // 현재 내용과 같으면 복원할 것이 없다
      if (backup.body === body && JSON.stringify(backup.form) === JSON.stringify(form)) {
        return;
      }
      setPending(backup);
    } catch {
      // 손상된 백업은 무시
    }
  }, [ready, key, body, form]);

  // 입력 변경마다 디바운스 백업 (1초)
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => {
      try {
        const backup: DraftBackup = { form, body, slug, savedAt: new Date().toISOString() };
        localStorage.setItem(key, JSON.stringify(backup));
      } catch {
        // 저장 공간 부족 등은 조용히 무시 — 백업은 보조 수단
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [ready, key, form, body, slug]);

  const clearBackup = useCallback(() => {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
    setPending(null);
  }, [key]);

  const dismissPending = useCallback(() => setPending(null), []);

  return { pending, clearBackup, dismissPending };
}
