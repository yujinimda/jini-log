// 공용 타입 — contracts/api.md 기준. 소유: 레인 A
import type { Frontmatter } from "./content-schema";

export type PostStatus = "published" | "draft";

export type PostFrontmatter = Frontmatter;

export interface PostMeta extends PostFrontmatter {
  slug: string;
  status: PostStatus;
}

/** 형식 오류가 있는 초안 — 목록에 오류로 표시하되 사이트 동작에는 영향 없음 (FR-014) */
export interface InvalidDraft {
  slug: string;
  status: "invalid";
  error: string;
}

export type DraftListItem = PostMeta | InvalidDraft;

export type PostAction = "save-draft" | "publish" | "unpublish" | "delete";

export interface PostActionRequest {
  action: PostAction;
  slug: string;
  /** 기존 글 수정 시 편집 시작 시점의 slug — 발행 글 slug 변경을 서버에서 거부 (FR-016) */
  originalSlug?: string;
  /**
   * 편집 시작 시점의 상태 — 재발행 판정의 근거.
   * "published"일 때만 기존 발행본 갱신(재발행)으로 취급하고,
   * 신규 세션·초안 발행이 기존 발행 글과 slug가 겹치면 덮어쓰기 확인을 강제한다 (codex-review 반영)
   */
  originalStatus?: PostStatus;
  frontmatter?: PostFrontmatter;
  body?: string;
  /** 기존 파일 수정·이동·삭제 시 필수 (낙관적 잠금) */
  sha?: string;
  overwrite?: boolean;
}

export interface PostActionResponse {
  ok: true;
  status: PostStatus | "deleted";
  commitUrl: string;
  commitSha: string;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    detail?: unknown;
  };
}

export type DeployState = "building" | "ready" | "error" | "not-found";
