"use client";

import React, { useMemo } from "react";
import { type SelectItem } from "./types";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

interface SimpleSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange" | "size"> {
  label?: React.ReactNode;      // Thay thế cho cả prop 'label' và slot 'label'
  description?: React.ReactNode; // Thay thế cho cả prop 'description' và slot 'description'
  items?: SelectItem[];
  values?: (string | number)[];
  addNone?: boolean;
  
  // Controlled props (thay thế v-model)
  value?: string | number | null;
  onValueChange?: (value: string | number | null) => void;
  onChange?: React.ChangeEventHandler<HTMLSelectElement>;

  size?: "sm" | "default";
}

export default function SimpleSelect({
  label,
  description,
  items,
  values,
  addNone,
  value,
  onValueChange,
  onChange,
  ...props // Các props còn lại (như disabled, name, id...)
}: SimpleSelectProps) {
  
  // 1. Normalize Items Logic
  const computedValues = useMemo(() => {
    if (items) return items;

    return (values || []).map((i) => ({
      label: i.toString(),
      value: i,
    }));
  }, [items, values]);

  // 2. Handle Change
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    
    // Nếu chọn None (value rỗng), trả về null. 
    // Nếu value gốc là number, logic parse có thể cần thiết, nhưng ở mức 'Simple' ta giữ string
    onValueChange?.(val === "" ? null : val);
    
    // Nếu component cha cần event gốc
    onChange?.(e);
  };

  return (
    <Field>
      {/* Label Rendering */}
      {label && <FieldLabel>{label}</FieldLabel>}

      {/* Select Component */}
      <NativeSelect 
        value={value ?? ""} // Convert null/undefined -> empty string cho HTML select
        onChange={handleChange}
        {...props}
      >
        {/* None Option */}
        {addNone && (
          <NativeSelectOption value="">None</NativeSelectOption>
        )}

        {/* Dynamic Options */}
        {computedValues.map((val) => (
          <NativeSelectOption key={val.value} value={val.value}>
            {val.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>

      {/* Description Rendering */}
      {description && (
        <FieldDescription>{description}</FieldDescription>
      )}
    </Field>
  );
}