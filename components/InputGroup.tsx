"use client";

import React, { useId, useEffect, useRef } from "react";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Kế thừa tất cả props chuẩn của thẻ Input (type, placeholder, value, onChange...)
interface InputGroupProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;       // Tương đương slot name="label"
  description?: React.ReactNode; // Tương đương slot name="description"
  containerClassName?: string;   // Tương đương props.class trong Vue (áp dụng cho wrapper)
}

export default function InputGroup({
  id,
  label,
  description,
  disabled,
  containerClassName,
  autoFocus,
  className, // className này sẽ áp dụng cho Input (do kết thừa InputHTMLAttributes)
  ...props   // Các props còn lại (value, onChange, type...) truyền vào Input
}: InputGroupProps) {
  
  // Logic ID: Dùng ID truyền vào hoặc tự sinh
  const generatedId = useId();
  const inputId = id || generatedId;
  
  // Logic Autofocus
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  return (
    <Field 
      className={cn("group", containerClassName)} 
      data-disabled={disabled}
    >
      {/* Label Section */}
      {label && (
        <FieldLabel htmlFor={inputId}>
          {label}
        </FieldLabel>
      )}

      {/* Input Section */}
      <Input
        ref={inputRef}
        type="text" // Mặc định là text, có thể bị override bởi props
        id={inputId}
        disabled={disabled}
        className={className}
        {...props}
      />

      {/* Description Section */}
      {description && (
        <FieldDescription>
          {description}
        </FieldDescription>
      )}
    </Field>
  );
}