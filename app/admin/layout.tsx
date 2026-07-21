// 어드민 공통 레이아웃 (T022, US3) — sonner Toaster 마운트 지점 1곳 (계약: Toaster는 admin 레이아웃 1곳).
// 소유: 레인 C
import { Toaster } from "@/components/ui/sonner";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster position="bottom-right" richColors closeButton />
    </>
  );
}
