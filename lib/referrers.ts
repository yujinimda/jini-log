// 유입 출처 분류·집계 (C4) — Supabase 서버 전용.
// 쓰기는 반드시 서버 route handler에서만 호출한다 (service key — 브라우저 노출 금지).
//
// 왜 "검색어"가 아니라 "출처"인가: 검색엔진은 Referrer-Policy로 쿼리스트링을 제거해
// 보내므로(구글은 2011년부터) 리퍼러에서 검색어를 얻을 수 없다. 실제 검색어는
// Google Search Console / 네이버 서치어드바이저 연동이 필요하다 — 별개 작업.
//
// 무엇이 측정되는가: "세션 최초 유입 출처"다. document.referrer는 최초 문서 로드 값이라
// 클라이언트 내비게이션(<Link>) 후에도 바뀌지 않는다. 그래서 비콘은 세션의 첫 글에서만
// 출처를 실어 보내고(view-beacon.tsx), 이후 글은 출처 없이 조회수만 올린다.
// 이 규칙이 없으면 구글 유입 1회가 그 세션의 모든 글에 반복 귀속된다 (codex-review 반영).
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

function client(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_KEY가 설정되지 않았습니다");
  }
  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}

/**
 * DB에 저장되는 출처 키 — 안정 식별자다.
 * 표시 문구를 DB에 넣으면 문구를 바꾸는 순간 집계 키가 갈라지므로 분리한다 (codex-review 반영).
 */
export const REFERRER_KEYS = [
  "direct",
  "google",
  "naver",
  "daum",
  "bing",
  "duckduckgo",
  "x",
  "facebook",
  "linkedin",
  "github",
  "other",
] as const;

export type ReferrerKey = (typeof REFERRER_KEYS)[number];

/** 키 → 화면 문구. 표시는 여기서만 바꾼다 (DB 값은 불변). */
export const REFERRER_LABELS: Record<ReferrerKey, string> = {
  direct: "직접 유입",
  google: "구글",
  naver: "네이버",
  daum: "다음",
  bing: "빙",
  duckduckgo: "덕덕고",
  x: "X (트위터)",
  facebook: "페이스북",
  linkedin: "링크드인",
  github: "GitHub",
  other: "기타",
};

/**
 * 구글 국가 도메인 — google.com·google.co.kr 외에 google.co.jp·google.de 등이 있고
 * 접미사 목록으로는 다 담을 수 없다. 마지막 라벨들이 google.<tld> 형태면 구글로 본다
 * (codex-review 반영: 주석은 "국가 도메인 지원"인데 실제로는 2개만 잡고 있었다).
 */
const GOOGLE_HOST = /(^|\.)google\.[a-z]{2,3}(\.[a-z]{2})?$/;

/** 호스트 접미사 → 키. 서브도메인을 함께 잡으려고 접미사로 비교한다. */
const HOST_RULES: ReadonlyArray<readonly [string, ReferrerKey]> = [
  ["naver.com", "naver"],
  ["daum.net", "daum"],
  ["bing.com", "bing"],
  ["duckduckgo.com", "duckduckgo"],
  ["twitter.com", "x"],
  ["x.com", "x"],
  ["t.co", "x"],
  ["facebook.com", "facebook"],
  ["linkedin.com", "linkedin"],
  ["github.com", "github"],
  ["github.io", "github"],
];

/**
 * 유입 호스트 → 출처 키.
 *
 * 입력은 **호스트명만** 받는다. 전체 URL이 아니라 호스트만 받는 이유: Referrer-Policy가
 * 항상 쿼리를 지우는 것은 아니어서(`unsafe-url` 등) 원본 URL에 경로·쿼리가 남아 올 수 있고,
 * 그것이 네트워크·서버 로그를 거치면 최소수집 원칙에 어긋난다. 브라우저에서 호스트만
 * 추려 보내고 서버는 그 이상을 받지 않는다 (codex-review 반영).
 *
 * @param host 유입 호스트명 (빈 문자열 = 직접 유입)
 * @param selfHost 사이트 자신의 호스트 — 내부 이동은 유입이 아니므로 null 반환
 */
export function classifyReferrerHost(host: string, selfHost: string | null): ReferrerKey | null {
  const normalized = host.trim().toLowerCase().replace(/^www\./, "");
  if (!normalized) return "direct";

  // 내부 이동 판정을 형식 검증보다 먼저 한다 — "localhost"처럼 점 없는 호스트도
  // 개발 환경에서는 정당한 self 값이라, 순서가 뒤바뀌면 내부 이동이 other로 새어 나간다.
  const self = selfHost?.trim().toLowerCase().replace(/^www\./, "");
  if (self && (normalized === self || normalized.endsWith(`.${self}`))) return null;

  // 호스트명이 아닌 값(전체 URL·조작된 문자열)은 받지 않는다.
  // 전체 URL은 "/" ":" 등이 섞여 이 문자셋에서 걸러진다.
  if (!/^[a-z0-9.-]+$/.test(normalized)) return "other";

  if (GOOGLE_HOST.test(normalized)) return "google";

  for (const [suffix, key] of HOST_RULES) {
    if (normalized === suffix || normalized.endsWith(`.${suffix}`)) return key;
  }
  return "other";
}

/** 유입 1회 기록 — 호출 전 봇·운영자·런타임 제외는 API 라우트 책임 (조회수와 동일 규칙) */
export async function incrementReferrer(slug: string, source: ReferrerKey): Promise<void> {
  const { error } = await client().rpc("increment_referrer", {
    p_slug: slug,
    p_source: source,
  });
  if (error) throw new Error(`유입 출처 기록 실패: ${error.message}`);
}

export interface ReferrerTotal {
  /** DB 저장 키 — 알 수 없는 값이 오면 UI에서 그대로 표시한다 */
  source: string;
  total: number;
}

/** 기간별 출처 합계 — 많은 순 (대시보드용) */
export async function getReferrerTotals(days: number): Promise<ReferrerTotal[]> {
  const { data, error } = await client().rpc("referrer_totals", { p_days: days });
  if (error) throw new Error(`유입 출처 조회 실패: ${error.message}`);
  return ((data ?? []) as { source: string; total: number }[]).map((row) => ({
    source: row.source,
    total: Number(row.total),
  }));
}

/** 저장 키 → 표시 문구. 미등록 키는 원문 그대로 (스키마가 앞서 나가도 화면이 깨지지 않게) */
export function referrerLabel(source: string): string {
  return REFERRER_LABELS[source as ReferrerKey] ?? source;
}
