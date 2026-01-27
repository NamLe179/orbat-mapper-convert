"use client";

import React from "react";
import { cn } from "@/lib/utils"; // Giả định bạn có hàm cn (clsx + tailwind-merge)
import type { ButtonGroupItem } from "./types";

interface ButtonGroupProps {
  items: ButtonGroupItem[];
  small?: boolean;
}

export default function ButtonGroup({ items, small = false }: ButtonGroupProps) {
  return (
    <span className="relative z-0 inline-flex rounded-md shadow-xs">
      {items.map((item, index) => (
        <button
          key={index}
          type="button"
          disabled={item.disabled}
          onClick={item.onClick}
          className={cn(
            // Các class nền tảng (Base styles)
            "text-muted-foreground focus:border-primary focus:ring-ring bg-background hover:bg-muted/50 relative inline-flex items-center border border-gray-300 px-4 font-medium focus:z-10 focus:ring-1 focus:outline-hidden disabled:opacity-50",
            
            // Xử lý kích thước (Size styles)
            small ? "py-1.5 text-xs" : "py-2 text-sm",
            
            // Xử lý bo góc và viền (Corner & Border logic)
            index === 0 && "rounded-l-md",
            index === items.length - 1 && "rounded-r-md",
            index > 0 && "-ml-px"
          )}
        >
          {item.label}
        </button>
      ))}
    </span>
  );
}