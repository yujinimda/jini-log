"use client";

import { useEffect } from "react";

const REFERRER_DONE_KEY = "referrer:attributed";

/**
 * 유입 호스트 — 세션의 **첫 비콘에서만** 반환하고 이후에는 undefined.
 *
 * document.referrer는 최초 문서 로드 시점의 값이고 클라이언트 내비게이션(<Link>)으로
 * 글을 옮겨도 바뀌지 않는다. 매번 실어 보내면 "구글에서 들어와 글 5개를 읽은 세션"이
 * 구글 유입 5회로 집계된다 — 그래서 세션당 1회, 랜딩한 글에만 귀속시킨다.
 * 즉 이 지표의 의미는 "세션 최초 유입 출처"다 (codex-review 반영).
 *
 * 호스트명만 추려 보내는 이유: Referrer-Policy가 항상 쿼리를 지우지는 않아
 * 원본 URL에 경로·검색어가 남아 있을 수 있다. 그것을 네트워크로 내보내지 않는다.
 */
function takeReferrerHost(): string | undefined {
  try {
    if (sessionStorage.getItem(REFERRER_DONE_KEY)) return undefined;
    sessionStorage.setItem(REFERRER_DONE_KEY, "1");
  } catch {
    // storage 불가(프라이빗 모드 등) — 귀속 정확도보다 기록 누락 방지를 택한다
  }

  const referrer = document.referrer;
  if (!referrer) return ""; // 빈 문자열 = 직접 유입 (서버가 "direct"로 분류)
  try {
    return new URL(referrer).hostname;
  } catch {
    return undefined; // 파싱 불가 — 보내지 않는다
  }
}

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

    // referrerHost가 undefined면 JSON에서 키 자체가 빠지고, 서버는 유입 기록을 건너뛴다
    const body = JSON.stringify({ slug, referrerHost: takeReferrerHost() });
    if (typeof navigator.sendBeacon === "function" && navigator.sendBeacon("/api/views", body)) {
      return;
    }
    // sendBeacon 미지원·큐 초과 시 폴백 (fire-and-forget)
    void fetch("/api/views", { method: "POST", body, keepalive: true }).catch(() => {});
  }, [slug]);

  return null;
}
