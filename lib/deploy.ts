// Vercel 배포 상태 조회 (research R10) — 소유: 레인 C
// GitHub 커밋 성공 ≠ 공개 반영. 발행 응답의 commitSha로 해당 커밋의 Vercel 배포를
// 조회해 어드민이 "반영 중 → 반영 완료 / 배포 실패"를 표시할 수 있게 한다.
import type { DeployState } from "./types";

const VERCEL_API = "https://api.vercel.com";

interface VercelDeployment {
  readyState?: string;
  state?: string;
}

function toDeployState(readyState: string | undefined): DeployState {
  switch (readyState) {
    case "READY":
      return "ready";
    case "ERROR":
    case "CANCELED":
      return "error";
    // QUEUED | BUILDING | INITIALIZING — 아직 반영 전
    default:
      return "building";
  }
}

/**
 * commitSha에 해당하는 Vercel 배포 상태 조회.
 * 배포가 아직 생성되지 않았으면 "not-found" — 어드민 폴링이 계속 대기한다.
 */
export async function getDeployStatus(commitSha: string): Promise<DeployState> {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token || !projectId) {
    throw new Error("VERCEL_TOKEN / VERCEL_PROJECT_ID가 설정되지 않았습니다");
  }

  const url = new URL(`${VERCEL_API}/v6/deployments`);
  url.searchParams.set("projectId", projectId);
  // "sha"는 커밋 필터가 아니다 — GitHub 커밋은 배포 메타데이터의 githubCommitSha로 필터 (codex-review 반영)
  url.searchParams.set("meta-githubCommitSha", commitSha);
  url.searchParams.set("limit", "1");
  if (process.env.VERCEL_TEAM_ID) {
    url.searchParams.set("teamId", process.env.VERCEL_TEAM_ID);
  }

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Vercel API 오류: ${res.status}`);
  }

  const data = (await res.json()) as { deployments?: VercelDeployment[] };
  const deployment = data.deployments?.[0];
  if (!deployment) return "not-found";
  return toDeployState(deployment.readyState ?? deployment.state);
}
