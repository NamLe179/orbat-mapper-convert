"use client";

import React, { useId } from "react";
import { Minus, Plus } from "lucide-react";
import { Field, FieldLabel } from "@/components/ui/field"; // Giữ nguyên wrapper Field của bạn
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NumberInputGroupProps {
  label?: React.ReactNode;
  description?: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  
  // Controlled state
  value?: number;
  onValueChange?: (value: number) => void;
  
  className?: string;
}

export default function NumberInputGroup({
  label,
  description, // Giữ lại prop interface dù chưa dùng để khớp với Vue
  min = 0,     // Default min
  max,
  step = 1,    // Default step
  disabled,
  value,
  onValueChange,
  className,
}: NumberInputGroupProps) {
  
  const inputId = useId();

  // Logic xử lý giảm
  const handleDecrement = () => {
    if (disabled) return;
    let newValue = (value ?? 0) - step;
    if (min !== undefined && newValue < min) newValue = min;
    onValueChange?.(newValue);
  };

  // Logic xử lý tăng
  const handleIncrement = () => {
    if (disabled) return;
    let newValue = (value ?? 0) + step;
    if (max !== undefined && newValue > max) newValue = max;
    onValueChange?.(newValue);
  };

  // Logic xử lý nhập tay
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valStr = e.target.value;
    const val = parseFloat(valStr);
    
    if (isNaN(val)) {
        // Có thể xử lý trường hợp rỗng tại đây nếu muốn, hiện tại bỏ qua update
        return; 
    }
    onValueChange?.(val);
  };

  return (
    <Field className={className}>
      {label && (
        <FieldLabel htmlFor={inputId}>
          {label}
        </FieldLabel>
      )}
      
      {/* Container mô phỏng NumberFieldContent */}
      <div className="flex items-center space-x-2">
        
        {/* Nút Giảm */}
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0"
          onClick={handleDecrement}
          disabled={disabled || (min !== undefined && (value ?? 0) <= min)}
          type="button"
        >
          <Minus className="h-4 w-4" />
          <span className="sr-only">Decrease</span>
        </Button>

        {/* Input Số */}
        <div className="relative flex-1">
          <Input
            id={inputId}
            type="number"
            className={cn(
                "text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none", 
                // Class trên dùng để ẩn 2 mũi tên mặc định xấu xí của browser
            )}
            value={value ?? ""}
            onChange={handleInputChange}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
          />
        </div>

        {/* Nút Tăng */}
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0"
          onClick={handleIncrement}
          disabled={disabled || (max !== undefined && (value ?? 0) >= max)}
          type="button"
        >
          <Plus className="h-4 w-4" />
          <span className="sr-only">Increase</span>
        </Button>

      </div>
    </Field>
  );
}