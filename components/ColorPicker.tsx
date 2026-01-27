"use client";

import React, { useMemo } from "react";
import * as RadioGroup from "@radix-ui/react-radio-group";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@/lib/utils";
import { defaultColors as colors } from "./colors";

// Định nghĩa kiểu dữ liệu cho Color object (dựa trên giả định từ code Vue)
interface ColorOption {
  name: string;
  value: string;
  bgColor: string;
  selectedColor: string;
}

interface ColorPickerProps {
  label?: React.ReactNode;
  showNone?: boolean;
  value?: string | null;
  onChange?: (value: string) => void;
  className?: string;
}

export default function ColorPicker({
  label,
  showNone = false,
  value,
  onChange,
  className,
}: ColorPickerProps) {
  
  // Tính toán danh sách màu
  const displayColors = useMemo(() => {
    if (!showNone) return colors;

    const noneOption: ColorOption = {
      name: "None",
      value: "", // Dùng chuỗi rỗng để đại diện cho None/Null trong Radix UI
      bgColor: "bg-background",
      selectedColor: "ring-black",
    };

    return [noneOption, ...colors];
  }, [showNone]);

  return (
    <RadioGroup.Root
      className={cn("flex flex-col", className)}
      value={value ?? ""} 
      onValueChange={onChange}
    >
      {/* Label Section */}
      {(label) && (
        <LabelPrimitive.Root className="mb-4 block text-sm leading-6 font-medium">
          {label}
        </LabelPrimitive.Root>
      )}

      {/* Colors Grid */}
      <div className="flex flex-wrap items-center gap-2">
        {displayColors.map((color) => (
          <RadioGroup.Item
            key={color.name}
            value={color.value}
            className={cn(
              color.selectedColor,
              "relative -m-0.5 flex cursor-pointer items-center justify-center rounded-full p-0.5 focus:outline-hidden",
              // Chuyển đổi selector data-[state=checked] của Vue/Tailwind sang React
              "data-[state=checked]:ring-2 focus:data-[state=checked]:ring-3 focus:data-[state=checked]:ring-offset-1"
            )}
          >
            <span className="sr-only">{color.name}</span>
            <div
              aria-hidden="true"
              className={cn(
                color.bgColor,
                "border-opacity-10 flex h-7 w-7 items-center justify-center rounded-full border border-black"
              )}
            >
              {/* Hiển thị 'x' nếu là None (value rỗng) */}
              {!color.value && <span className="text-xs">x</span>}
            </div>
          </RadioGroup.Item>
        ))}
      </div>
    </RadioGroup.Root>
  );
}