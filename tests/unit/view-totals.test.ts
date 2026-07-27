// 조회수 클라이언트 fetch의 요청 중복 제거 — 목록에 <ViewCount />가 N개 마운트돼도
// 실제 네트워크 요청은 1번이어야 한다 (SSG 유지 + 항상 최신 전략의 전제).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchTotals, resetViewTotalsCache } from "@/components/blog/use-view-totals";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  resetViewTotalsCache();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchTotals 요청 중복 제거", () => {
  it("같은 틱에 10번 호출해도 fetch는 1번만 나간다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ "hello-world": 12 }));
    vi.stubGlobal("fetch", fetchMock);

    // 목록 페이지에서 카드 10개가 동시에 마운트되는 상황
    const results = await Promise.all(Array.from({ length: 10 }, () => fetchTotals()));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/views", { cache: "no-store" });
    for (const totals of results) {
      expect(totals).toEqual({ "hello-world": 12 });
    }
  });

  it("응답이 도착한 뒤 호출해도 캐시된 값을 재사용한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ "hello-world": 12 }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchTotals();
    await expect(fetchTotals()).resolves.toEqual({ "hello-world": 12 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("네트워크 오류는 빈 맵으로 삼키고, 다음 호출에서 재시도한다", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue(jsonResponse({ "hello-world": 3 }));
    vi.stubGlobal("fetch", fetchMock);

    // 실패해도 화면이 깨지지 않는다 (조회수는 부가 정보)
    await expect(fetchTotals()).resolves.toEqual({});
    // 실패가 새로고침 전까지 영구 빈 값으로 굳지 않는다
    await expect(fetchTotals()).resolves.toEqual({ "hello-world": 3 });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("5xx 응답도 빈 맵으로 삼키고 재시도 가능 상태로 되돌린다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockResolvedValue(jsonResponse({ "hello-world": 7 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchTotals()).resolves.toEqual({});
    await expect(fetchTotals()).resolves.toEqual({ "hello-world": 7 });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
