"use client";
// 방금 올린 이미지의 로컬 미리보기 (C10)
//
// 왜 필요한가: 이미지는 GitHub `public/images/{slug}/`에 커밋되고 배포된 뒤에야 서빙된다.
// 붙여넣은 직후 ~1분 동안은 `/images/...` 경로가 404라 프리뷰에 깨진 그림이 뜬다 —
// 업로드는 성공했는데 실패한 것처럼 보인다.
//
// 그래서 업로드한 File의 objectURL을 경로별로 기억해두고, 프리뷰가 그 경로를 그릴 때
// 대신 쓴다. 발행 결과에는 영향이 없다 — 본문에는 `/images/...` 경로만 저장되고,
// 이 맵은 브라우저 메모리에만 산다.

const blobUrls = new Map<string, string>();

/** 업로드 성공 직후 호출 — 같은 경로를 다시 올리면 이전 URL은 해제한다 */
export function rememberUploadedImage(path: string, file: File): void {
  const previous = blobUrls.get(path);
  if (previous) URL.revokeObjectURL(previous);
  blobUrls.set(path, URL.createObjectURL(file));
}

/** 이 세션에서 올린 이미지면 로컬 URL, 아니면 undefined */
export function localPreviewUrl(path: string): string | undefined {
  return blobUrls.get(path);
}

/** 페이지를 떠날 때 메모리 회수 */
export function releasePendingImages(): void {
  for (const url of blobUrls.values()) URL.revokeObjectURL(url);
  blobUrls.clear();
}
