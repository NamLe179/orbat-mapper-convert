"use client";

import React, { useState, useMemo } from "react";
import { type ButtonGroupItem } from "./types"; // Giả định file types đã convert
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SplitButtonProps {
  items: ButtonGroupItem[];
  static?: boolean; // Prop gốc từ Vue
  activeItem?: ButtonGroupItem | null;
  onActiveItemChange?: (item: ButtonGroupItem) => void; // Thay cho update:activeItem
  triggerClass?: string;
}

export default function SplitButton({
  items,
  static: isStatic = false, // Alias 'static' -> 'isStatic'
  activeItem: controlledActiveItem,
  onActiveItemChange,
  triggerClass,
}: SplitButtonProps) {
  
  // 1. Internal State (cho trường hợp Uncontrolled)
  const [internalActiveItem, setInternalActiveItem] = useState<ButtonGroupItem>(items[0]);

  // 2. Determine Current Active Item (Controlled > Internal)
  const currentItem = controlledActiveItem ?? internalActiveItem;

  // 3. Filter Menu Items
  const menuItems = useMemo(() => {
    return items.filter((e) => e.label !== currentItem?.label);
  }, [items, currentItem]);

  // 4. Click Handler
  const handleClick = (item: ButtonGroupItem) => {
    // Nếu không phải static mode, cập nhật active item
    if (!isStatic) {
      // Nếu không có props control từ ngoài, tự update state nội bộ
      if (controlledActiveItem === undefined) {
        setInternalActiveItem(item);
      }
      // Báo ra ngoài (nếu có listener)
      onActiveItemChange?.(item);
    }
    
    // Luôn chạy action của item
    item.onClick?.();
  };

  if (!currentItem) return null;

  return (
    <div className="flex items-center">
      {/* Main Action Button */}
      <Button
        variant="outline"
        onClick={() => handleClick(currentItem)}
        disabled={currentItem.disabled}
        className="rounded-r-none text-left ring-inset"
        title={currentItem.label}
      >
        <span className={cn("truncate", triggerClass)}>
          {currentItem.label}
        </span>
      </Button>

      {/* Dropdown Trigger */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="rounded-l-none border-l-0 px-2 ring-inset"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end">
          {menuItems.map((item) => (
            <DropdownMenuItem
              key={item.label}
              disabled={item.disabled}
              onSelect={() => handleClick(item)}
              className="cursor-pointer"
            >
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}