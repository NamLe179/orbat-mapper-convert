"use client";

import React, { useId } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import type { SelectItem as SelectItemType } from "@/components/types";
import { cn } from "@/lib/utils"; // Giả định có utility cn

interface FieldSelectProps {
  label?: string;
  description?: React.ReactNode; // ReactNode thay cho slot
  items?: SelectItemType[];
  values?: (string | number)[]; // Giữ lại prop này dù trong template Vue không thấy dùng (để đúng interface cũ)
  addNone?: boolean;
  size?: "sm" | "lg" | "default";
  
  // Controlled state
  value?: string | number | null;
  onValueChange?: (value: string | number | null) => void;
  
  className?: string;
}

const NULL_VALUE = "__null__";

export default function FieldSelect({
  label,
  description,
  items = [],
  values, // Unused in template logic provided, but kept for compatibility
  addNone = false,
  size = "default",
  value,
  onValueChange,
  className,
}: FieldSelectProps) {
  const id = useId();

  // Chuyển đổi value props sang string để dùng cho Radix UI Select
  const stringValue = value === null ? NULL_VALUE : value?.toString();

  // Xử lý khi user chọn item
  const handleValueChange = (val: string) => {
    if (!onValueChange) return;

    if (val === NULL_VALUE) {
      onValueChange(null);
      return;
    }

    // Tìm item gốc để trả về đúng kiểu dữ liệu (string hoặc number)
    const originalItem = items.find((item) => item.value.toString() === val);
    if (originalItem) {
      onValueChange(originalItem.value);
    } else {
      // Fallback nếu không tìm thấy (ít khi xảy ra)
      onValueChange(val); 
    }
  };

  return (
    <Field className={className}>
      {label && <FieldLabel htmlFor={id}>{label}</FieldLabel>}
      
      <Select value={stringValue} onValueChange={handleValueChange}>
        <SelectTrigger
          id={id}
          className={cn(
            // Xử lý size bằng Tailwind classes
            size === "sm" && "h-8 px-3 text-xs",
            size === "lg" && "h-12 px-4 text-base",
            // default size thường là h-10 trong shadcn
          )}
        >
          <SelectValue />
        </SelectTrigger>
        
        <SelectContent>
          {addNone && (
            <SelectItem value={NULL_VALUE}>None</SelectItem>
          )}
          
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value.toString()}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {description && (
        <FieldDescription>{description}</FieldDescription>
      )}
    </Field>
  );
}