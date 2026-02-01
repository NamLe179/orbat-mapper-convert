"use client";

import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type MenuItemData } from "@/components/types";

interface SortDropdownProps {
  // Giả định MenuItemData có action kiểu string | Function tương tự Vue
  options: MenuItemData[]; 
  onAction?: (action: any) => void;
  className?: string;
}

export default function SortDropdown({ options, onAction, className }: SortDropdownProps) {
  
  const handleItemClick = (item: MenuItemData) => {
    if (typeof item.action === "function") {
      item.action();
    } else if (onAction) {
      onAction(item.action);
    }
  };

  return (
    <div className={className}>
      <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost">
          Sort
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end">
        {options.map((item, index) => (
          <DropdownMenuItem
            key={index} // Nên dùng item.id hoặc item.label nếu unique
            onSelect={() => handleItemClick(item)}
            disabled={item.disabled}
          >
            <span>{item.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
    </div>
  );
}
