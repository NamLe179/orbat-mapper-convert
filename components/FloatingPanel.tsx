import React from "react";
import { cn } from "@/lib/utils"; // Giả định utility này đã có sẵn

interface FloatingPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export default function FloatingPanel({ 
  children, 
  className, 
  ...props 
}: FloatingPanelProps) {
  return (
    <div
      className={cn(
        "border-border bg-popover text-popover-foreground rounded-md border text-sm shadow-sm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}