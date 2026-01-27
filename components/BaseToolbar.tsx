import React from "react";
import { cn } from "@/lib/utils"; // Giả định bạn đang dùng utility cn từ shadcn/ui để merge class

interface BaseToolbarProps extends React.HTMLAttributes<HTMLSpanElement> {
  children?: React.ReactNode;
}

export default function BaseToolbar({ children, className, ...props }: BaseToolbarProps) {
  return (
    <span
      className={cn(
        "relative z-0 inline-flex -space-x-px rounded-md",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}