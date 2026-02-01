"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Kế thừa props của Dialog Root (open, onOpenChange, etc.)
interface CommandPaletteDialogProps extends React.ComponentProps<typeof Dialog> {
  title?: string;
  description?: string;
  children?: React.ReactNode;
}

export default function CommandPaletteDialog({
  title = "Command Palette",
  description = "Search for a command to run...",
  children,
  ...props // Nhận open, onOpenChange, etc.
}: CommandPaletteDialogProps) {
  return (
    <Dialog {...props}>
      <DialogContent
        // Class override để tạo giao diện giống Command Palette (nằm ở trên cùng thay vì giữa)
        // translate-y-0: Ghi đè logic căn giữa mặc định của Shadcn
        className="bg-popover top-14 translate-y-0 overflow-hidden p-0 sm:max-w-xl"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        
        {/* Slot content */}
        {children}
      </DialogContent>
    </Dialog>
  );
}