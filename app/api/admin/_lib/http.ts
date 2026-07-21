// 어드민 API 공통 응답 헬퍼 — 소유: 레인 C
import { NextResponse } from "next/server";
import type { ApiErrorBody } from "@/lib/types";

/** 공통 에러 형식: { error: { code, message, detail? } } (contracts/api.md) */
export function apiError(
  status: number,
  code: string,
  message: string,
  detail?: unknown,
): NextResponse<ApiErrorBody> {
  return NextResponse.json(
    { error: { code, message, ...(detail !== undefined ? { detail } : {}) } },
    { status },
  );
}
