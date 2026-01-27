"use client";

import React, { useId } from "react";
import { cn } from "@/lib/utils"; // Giả định utility merge class có sẵn

interface InputRadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  label?: React.ReactNode;
  value: string;
  
  // Thay thế cho v-model
  // currentValue: Giá trị đang được chọn của cả nhóm
  currentValue?: string | null;
  // onValueChange: Hàm cập nhật giá trị
  onValueChange?: (value: string) => void;

  // Thay thế cho inject('name')
  name?: string; 
}

export default function InputRadio({
  id,
  value,
  disabled,
  children, // Slot
  className,
  currentValue,
  onValueChange,
  name,
  ...props
}: InputRadioProps) {
  
  // Tạo ID an toàn cho SSR nếu không được truyền vào
  const generatedId = useId();
  const finalId = id || generatedId;

  // Kiểm tra xem Radio này có đang được chọn không
  const isChecked = currentValue === value;

  return (
    <div className={cn("flex items-center", disabled && "opacity-50", className)}>
      <input
        id={finalId}
        type="radio"
        value={value}
        name={name}
        disabled={disabled}
        checked={isChecked}
        onChange={() => onValueChange?.(value)}
        className="border-border text-primary focus:ring-primary-foreground size-4"
        {...props}
      />
      <label 
        htmlFor={finalId} 
        className="ml-3 block text-sm leading-6 font-medium"
      >
        {children}
      </label>
    </div>
  );
}