"use client";
// 이미지 붙여넣기/드래그 업로드 (T026, research R8) — 소유: 레인 C
// CodeMirror paste/drop 이벤트 → /api/admin/images 업로드 → 본문에 ![](path) 자동 삽입.
import { EditorView } from "@codemirror/view";
import { readApiError } from "./types";

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

function imageFiles(data: DataTransfer | null): File[] {
  if (!data) return [];
  return Array.from(data.files).filter((f) => IMAGE_TYPES.has(f.type));
}

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(",") + 1)); // data URL 접두 제거
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** 문서에서 placeholder를 찾아 치환 — 업로드 동안 사용자가 편집해도 위치가 어긋나지 않는다 */
function replacePlaceholder(view: EditorView, placeholder: string, replacement: string) {
  const text = view.state.doc.toString();
  const idx = text.indexOf(placeholder);
  if (idx < 0) return; // 사용자가 지웠으면 그대로 둔다
  view.dispatch({
    changes: { from: idx, to: idx + placeholder.length, insert: replacement },
  });
}

async function uploadOne(
  view: EditorView,
  file: File,
  slug: string,
  pos: number,
  onError: (message: string) => void,
) {
  const placeholder = `![업로드 중: ${file.name}]()`;
  view.dispatch({ changes: { from: pos, insert: `${placeholder}\n` } });
  try {
    const data = await toBase64(file);
    const res = await fetch("/api/admin/images", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug, filename: file.name, data }),
    });
    if (!res.ok) {
      const err = await readApiError(res);
      throw new Error(err.message);
    }
    const { path } = (await res.json()) as { path: string };
    replacePlaceholder(view, placeholder, `![](${path})`);
  } catch (err) {
    replacePlaceholder(view, placeholder, "");
    onError(`이미지 업로드 실패 (${file.name}): ${(err as Error).message}`);
  }
}

async function handleFiles(
  view: EditorView,
  files: File[],
  pos: number,
  getSlug: () => string,
  onError: (message: string) => void,
) {
  const slug = getSlug().trim();
  if (!slug) {
    onError("이미지를 업로드하려면 먼저 slug를 입력하세요 (이미지가 /images/{slug}/에 저장됩니다)");
    return;
  }
  // GitHub 커밋 경합을 피해 순차 업로드
  for (const file of files) {
    await uploadOne(view, file, slug, pos, onError);
    pos = view.state.selection.main.head; // 다음 파일은 현재 커서 기준
  }
}

/**
 * CodeMirror 확장 — slug는 ref 게터로 읽어 확장 재생성 없이 최신 값을 쓴다.
 */
export function imageUploadExtension(getSlug: () => string, onError: (message: string) => void) {
  return EditorView.domEventHandlers({
    paste(event, view) {
      const files = imageFiles(event.clipboardData);
      if (files.length === 0) return false;
      event.preventDefault();
      void handleFiles(view, files, view.state.selection.main.head, getSlug, onError);
      return true;
    },
    drop(event, view) {
      const files = imageFiles(event.dataTransfer);
      if (files.length === 0) return false;
      event.preventDefault();
      const pos =
        view.posAtCoords({ x: event.clientX, y: event.clientY }) ??
        view.state.selection.main.head;
      void handleFiles(view, files, pos, getSlug, onError);
      return true;
    },
  });
}
