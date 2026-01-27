"use client";

import React, { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUiStore } from "@/stores/uiStore";
import { cn } from "@/lib/utils";

interface SimpleModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: React.ReactNode; // Thay thế cho cả dialogTitle prop và slot name="title"
  maxWidth?: string;
  onCancel?: () => void;   // Thay thế cho emit("cancel")
  children?: React.ReactNode;
}

export default function SimpleModal({
  open = false,
  onOpenChange,
  title,
  maxWidth = "sm:max-w-xl",
  onCancel,
  children,
}: SimpleModalProps) {
  const uiStore = useUiStore();

  // Logic Watcher: Đồng bộ state với Store và xử lý Cancel
  useEffect(() => {
    // 1. Cập nhật Store global (Giả định store của bạn là dạng mutable hoặc có setter)
    // Nếu store là Zustand: uiStore.setModalOpen(open);
    // Nếu store là Reactive Proxy (Valtio/Mobx): uiStore.modalOpen = open;
    if (uiStore && typeof uiStore === 'object' && 'modalOpen' in uiStore) {
        // @ts-ignore - Bỏ qua check type chặt nếu chưa rõ interface store
        uiStore.modalOpen = open;
    }

    // 2. Emit sự kiện cancel khi đóng
    if (!open) {
      onCancel?.();
    }
  }, [open, onCancel, uiStore]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        // Lưu ý: DialogContent của Shadcn đã có sẵn nút X (Close) mặc định
        className={cn("max-w-[calc(100%-1rem)] rounded", maxWidth)}
      >
        {/* Chỉ render Header nếu có Title */}
        {title && (
          <DialogHeader>
            <DialogTitle>
              {title}
            </DialogTitle>
          </DialogHeader>
        )}
        
        {/* Default Slot */}
        {children}
      </DialogContent>
    </Dialog>
  );
}