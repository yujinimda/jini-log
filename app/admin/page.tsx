// 어드민 랜딩 (T023) — US4(대시보드) 전까지 에디터로 리다이렉트하는 최소 랜딩.
// US4의 T041에서 대시보드로 교체된다. 소유: 레인 C
import { redirect } from "next/navigation";

export default function AdminPage() {
  redirect("/admin/write");
}
