import React from "react";
import { cn } from "@/lib/utils"; // Utility để merge class Tailwind (clsx + tailwind-merge)

interface ToolbarButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  start?: boolean;
  end?: boolean;
  top?: boolean;
  bottom?: boolean;
  active?: boolean;
}

export default function ToolbarButton({
  children,
  className,
  start = false,
  end = false,
  top = false,
  bottom = false,
  active = false,
  type = "button", // Default type là button để tránh submit form ngoài ý muốn
  ...props
}: ToolbarButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        // Base styles
        "border-input focus-visible:border-ring focus-visible:ring-ring/50 disabled:text-muted-foreground relative inline-flex items-center border px-3 py-2 text-sm font-medium transition-all outline-none focus:z-10 focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 sm:px-2",
        
        // Conditional Rounding
        start && "rounded-l-md",
        end && "rounded-r-md",
        top && "rounded-t-md",
        bottom && "rounded-b-md",
        
        // Active State Colors - Xanh lá nhạt
        active
          ? "bg-green-100 text-green-900 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-100 dark:hover:bg-green-900/50"
          : "bg-background text-foreground hover:bg-accent hover:text-accent-foreground",
        
        // Allow overriding classes via props
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}