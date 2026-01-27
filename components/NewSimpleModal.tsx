"use client";

import React, { useEffect } from "react";
import { useUiStore } from "@/stores/uiStore";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogScrollContent, // Giả định component này đã được define bên React
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface NewSimpleModalProps {
  dialogTitle?: React.ReactNode;
  description?: React.ReactNode; // Thay thế cho cả prop string và slot description
  className?: string; // Thay cho class
  
  // Logic v-model
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  
  children?: React.ReactNode;
}

export default function NewSimpleModal({
  dialogTitle,
  description,
  className,
  open = false,
  onOpenChange,
  children,
}: NewSimpleModalProps) {
  
  // --- Logic Store Sync (Tương đương onMounted, watch, onUnmounted) ---
  // Giả định uiStore dùng Zustand (phổ biến nhất với Next.js)
  // Nếu dùng Context, cách dùng cũng tương tự.
  const setModalOpenState = useUiStore((state) => state.setModalOpen); // Cần action set trong store

  useEffect(() => {
    // onMounted & watch: Cập nhật store khi 'open' thay đổi
    if (setModalOpenState) {
        setModalOpenState(open);
    }

    // onUnmounted: Reset store khi component unmount
    return () => {
      if (setModalOpenState) {
          setModalOpenState(false);
      }
    };
  }, [open, setModalOpenState]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogScrollContent
        className={cn(
          "max-w-[calc(100%-1rem)] rounded sm:max-w-lg", 
          className
        )}
      >
        <DialogHeader>
          {dialogTitle && (
            <DialogTitle>{dialogTitle}</DialogTitle>
          )}
          
          {/* Logic: Nếu có description (prop hoặc JSX) thì hiển thị */}
          {(description || dialogTitle) && (
             <DialogDescription>
                {description}
             </DialogDescription>
          )}
        </DialogHeader>

        {/* Default Slot */}
        {children}
        
      </DialogScrollContent>
    </Dialog>
  );
}