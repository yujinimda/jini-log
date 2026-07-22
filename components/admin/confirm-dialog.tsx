"use client";
// 파괴적 액션 확인 다이얼로그 (T021, US3) — 브라우저 confirm 팝업 대체. 소유: 레인 C
// 표현만 교체 — 확인/취소 결과에 따른 플로우는 호출부가 001 그대로 유지한다.
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** 여러 줄 안내 — \n 기준 줄바꿈 렌더 */
  description: string;
  confirmLabel: string;
  /** 삭제류 액션이면 destructive 스타일 */
  destructive?: boolean;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="whitespace-pre-line">{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              취소
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            onClick={() => {
              onOpenChange(false);
              onConfirm();
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
