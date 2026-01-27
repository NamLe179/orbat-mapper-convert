import React from "react";
import { cn } from "@/lib/utils"; 

export default function WipBadge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800",
        className
      )}
      {...props}
    >
      🚧 work in progress
    </span>
  );
}