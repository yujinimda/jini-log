"use client";

import { useEffect } from "react";

/**
 * 조회 비콘 (T033, research R5) — 글 상세 마운트 시 1회 전송.
 * sessionStorage의 slug별 플래그로 같은 브라우저 세션 내 재방문·클라이언트
 * 내비게이션 왕복·bfcache 복원은 재카운트하지 않는다 (개인정보 저장 없음).
 */
export function ViewBeacon({ slug }: { slug: string }) {
  useEffect(() => {
    const key = `viewed:${slug}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // storage 불가(프라이빗 모드 등) — 가드 없이 1회 전송 시도
    }

    const body = JSON.stringify({ slug });
    if (typeof navigator.sendBeacon === "function" && navigator.sendBeacon("/api/views", body)) {
      return;
    }
    // sendBeacon 미지원·큐 초과 시 폴백 (fire-and-forget)
    void fetch("/api/views", { method: "POST", body, keepalive: true }).catch(() => {});
  }, [slug]);

  return null;
}
