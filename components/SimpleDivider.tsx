import React from "react";
import { cn } from "@/lib/utils"; 

interface SimpleDividerProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export default function SimpleDivider({ 
  children, 
  className, 
  ...props 
}: SimpleDividerProps) {
  return (
    <div className={cn(className)} {...props}>
      <div className="relative">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-muted/50 px-2 text-sm text-muted-foreground rounded">
            {children}
          </span>
        </div>
      </div>
    </div>
  );
}