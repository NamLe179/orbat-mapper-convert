"use client";

import React from "react";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SelectItem } from "@/components/types";

interface CheckboxDropdownProps {
  options: SelectItem[];
  label?: React.ReactNode;
  // Thay thế cho defineModel trong Vue
  value: (string | number)[];
  onChange: (value: (string | number)[]) => void;
  // Slot mặc định trong Vue chuyển thành children (tùy chọn)
  children?: React.ReactNode;
}

export default function CheckboxDropdown({
  options,
  label,
  value,
  onChange,
  children,
}: CheckboxDropdownProps) {
  
  // Hàm xử lý logic thêm/bớt item khỏi mảng
  const handleCheckedChange = (checked: boolean, itemValue: string | number) => {
    if (checked) {
      if (!value.includes(itemValue)) {
        onChange([...value, itemValue]);
      }
    } else {
      onChange(value.filter((v) => v !== itemValue));
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="group text-muted-foreground hover:text-foreground inline-flex items-center justify-center text-sm font-medium">
        {/* Tương đương <slot>{{ label }}</slot> */}
        <span>{children || label}</span>
        
        {/* Badge đếm số lượng */}
        <span className="bg-muted text-muted-foreground ml-1.5 rounded px-1.5 py-0.5 text-xs font-semibold tabular-nums">
          {value.length}
        </span>
        
        <ChevronDown
          className="text-muted-foreground group-hover:text-foreground -mr-1 ml-1 size-5 shrink-0"
          aria-hidden="true"
        />
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end">
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={value.includes(option.value)}
            onCheckedChange={(checked) => handleCheckedChange(checked, option.value)}
            // Ngăn dropdown đóng khi click chọn (tương đương @select.prevent)
            onSelect={(e) => e.preventDefault()}
          >
            {option.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}