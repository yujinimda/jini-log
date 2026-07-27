"use client";
// 헤더 우측 진입점 (C4) — 비로그인 "로그인", 운영자 세션이면 "대시보드".
//
// 서버에서 auth()를 부르지 않는 이유: 헤더는 전 페이지 공용이라 세션을 조회하는 순간
// 홈·글·태그가 전부 SSG를 잃는다. 그래서 정적 HTML은 "로그인"으로 내보내고
// 마운트 후 세션을 확인해 문구만 바꾼다 (조회수 <ViewCount />와 같은 전략).
//
// 어느 쪽이든 목적지는 /admin으로 동일하다 — middleware가 비로그인이면 GitHub OAuth로,
// 운영자면 대시보드로 보낸다. 즉 문구는 표시일 뿐이고 인가 판정은 서버가 한다.
import Link from "next/link";
import { useEffect, useState } from "react";

interface SessionResponse {
  user?: unknown;
  login?: string;
}

// 모듈 스코프 공유 — 헤더는 페이지당 1개지만, 클라이언트 내비게이션으로 페이지를
// 옮길 때마다 재요청하지 않도록 결과를 캐시한다.
let inflight: Promise<boolean> | null = null;

function fetchIsOperator(): Promise<boolean> {
  inflight ??= fetch("/api/auth/session", { cache: "no-store" })
    .then(async (res) => {
      if (!res.ok) return false;
      const session = (await res.json()) as SessionResponse | null;
      // login 클레임 유무만 본다. 이 값이 **현재** ADMIN_GITHUB_LOGIN과 같은지는
      // 확인하지 않으므로, env를 바꾼 뒤 만료 전 세션에는 "대시보드"가 잘못 뜰 수 있다.
      // 표시용 힌트일 뿐이고 인가는 middleware·signIn 콜백이 하므로 그 경우에도
      // 클릭하면 로그인으로 되돌아간다 (codex-review 반영 — 의도된 한계).
      return typeof session?.login === "string" && session.login.length > 0;
    })
    .catch(() => {
      inflight = null;
      return false;
    });
  return inflight;
}

/** 테스트 전용 — 모듈 스코프 캐시 초기화 */
export function resetAdminLinkCache(): void {
  inflight = null;
}

export function AdminLink({ className }: { className?: string }) {
  const [isOperator, setIsOperator] = useState(false);

  useEffect(() => {
    let alive = true;
    void fetchIsOperator().then((next) => {
      if (alive) setIsOperator(next);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <Link href="/admin" className={className}>
      {isOperator ? "대시보드" : "로그인"}
    </Link>
  );
}
