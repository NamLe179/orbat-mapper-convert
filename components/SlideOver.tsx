"use client";

import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface SlideOverProps {
  /** Tiêu đề của SlideOver */
  title?: React.ReactNode;
  /** Vị trí xuất hiện từ bên trái thay vì bên phải */
  left?: boolean;
  /** Trạng thái đóng mở (v-model) */
  open?: boolean;
  /** Callback cập nhật trạng thái đóng mở */
  onOpenChange?: (open: boolean) => void;
  /** Nội dung bên trong SlideOver (default slot) */
  children?: React.ReactNode;
}

export default function SlideOver({
  title,
  left = false,
  open,
  onOpenChange,
  children,
}: SlideOverProps) {
  const side = left ? "left" : "right";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={side} className="overflow-y-auto pb-6 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            {title}
          </SheetTitle>
        </SheetHeader>
        
        <div className="mt-4">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}