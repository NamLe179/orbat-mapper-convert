import React from "react";
import { cn } from "@/lib/utils"; // Utility merge class

interface VerticalToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export default function VerticalToolbar({ 
  children, 
  className, 
  ...props 
}: VerticalToolbarProps) {
  return (
    <div 
      className={cn(
        "relative z-0 flex flex-col -space-y-px rounded-md",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}