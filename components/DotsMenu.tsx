"use client";

import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EllipsisVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type MenuItemData } from "@/components/types";

// Giả định kiểu dữ liệu của MenuItemData nếu chưa có
// (Action có thể là string ID hoặc một function thực thi trực tiếp)
interface DotsMenuProps {
  items: MenuItemData[];
  sideOffset?: number;
  // Callback thay thế cho emit('action')
  onAction?: (action: string) => void;
}

export default function DotsMenu({
  items,
  sideOffset = 10,
  onAction,
}: DotsMenuProps) {
  
  const handleItemClick = (item: MenuItemData) => {
    if (typeof item.action === "function") {
      item.action();
    } else if (onAction && typeof item.action === "string") {
      onAction(item.action);
    }
  };

  return (
    <div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {/* @click.stop trong Vue tương đương e.stopPropagation() */}
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground mr-2"
            onClick={(e) => e.stopPropagation()}
          >
            <EllipsisVertical className="h-4 w-4" />
            <span className="sr-only">Menu</span>
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent sideOffset={sideOffset} align="end">
          {items.map((item, index) => (
            <DropdownMenuItem
              key={index} // Tốt nhất nên dùng item.id nếu có
              disabled={item.disabled}
              onSelect={() => handleItemClick(item)}
            >
              <span>{item.label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}