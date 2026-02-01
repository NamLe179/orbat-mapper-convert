"use client";

import React, { useMemo, useId } from "react";
import InputGroupTemplate from "./InputGroupTemplate";
import { type NewSelectItem } from "./types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface NewSelectProps {
  label?: string;
  description?: string;
  items?: NewSelectItem[];
  values?: (string | number)[];
  addNone?: boolean;
  size?: "sm" | "lg" | "default";
  placeholder?: string;
  
  // Props thay thế v-model
  value?: string | number | null;
  onValueChange?: (value: string | number | null) => void;

  // Prop thay thế slot "hint"
  hint?: React.ReactNode;
}

// Giá trị đại diện cho null trong Select (vì Radix yêu cầu value là string)
const NULL_VALUE = "__null__";

export default function NewSelect({
  label,
  description,
  items,
  values,
  addNone,
  size = "default",
  placeholder,
  value,
  onValueChange,
  hint,
}: NewSelectProps) {
  
  const id = useId();

  // Logic computedValues
  const computedValues = useMemo(() => {
    if (items) return items;

    return (values || []).map((i) => ({
      label: i.toString(),
      value: i,
      disabled: false,
    }));
  }, [items, values]);

  // Handle render value (Convert number/null -> string)
  const displayValue = useMemo(() => {
    if (value === null || value === undefined) return undefined; // undefined để hiện placeholder
    return value.toString();
  }, [value]);

  // Handle change (Convert string -> number/null/string)
  const handleValueChange = (val: string) => {
    if (!onValueChange) return;

    if (val === NULL_VALUE) {
      onValueChange(null);
      return;
    }

    // Tìm item gốc để lấy đúng kiểu dữ liệu (number hay string)
    const originalItem = computedValues.find((i) => i.value.toString() === val);
    if (originalItem) {
      onValueChange(originalItem.value);
    } else {
      // Fallback
      onValueChange(val);
    }
  };

  return (
    <InputGroupTemplate label={label} description={description} hint={hint}>
        <Select value={displayValue} onValueChange={handleValueChange}>
          <SelectTrigger 
            id={id} 
            className={cn("w-full", {
                "h-8 text-xs": size === "sm",
                "h-12 text-lg": size === "lg",
                // default size xử lý bởi component gốc
            })}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent className="border-border">
            {addNone && (
              <SelectItem value={NULL_VALUE}>None</SelectItem>
            )}
            
            {computedValues.map((item) => (
              <SelectItem
                key={item.value.toString()}
                value={item.value.toString()}
                disabled={item.disabled}
              >
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
    </InputGroupTemplate>
  );
}