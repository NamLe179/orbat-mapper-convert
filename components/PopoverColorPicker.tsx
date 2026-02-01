"use client";

import React, { useMemo, useState } from "react";
import { defaultColors, extraColors, isValidHexColor } from "@/components/colors"; // Giả định đã có
import { useUiStore } from "@/stores/uiStore"; // Giả định đã convert sang Zustand/Context
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { PopoverClose } from "@radix-ui/react-popover";
import CloseButton from "@/components/CloseButton";
import EditableLabel from "@/components/EditableLabel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PopoverColorPickerProps {
  label?: string;
  showNone?: boolean;
  
  // Controlled state
  value?: string | null;
  onValueChange?: (value: string | null) => void;
  
  children?: React.ReactNode; // Slot "trigger"
}

export default function PopoverColorPicker({
  label,
  showNone = false,
  value: selectedColor = defaultColors[1].selectedColor,
  onValueChange,
  children,
}: PopoverColorPickerProps) {
  
  const uiStore = useUiStore();
  
  // State để track extra colors khi chúng thay đổi (để trigger re-render)
  const [localExtras, setLocalExtras] = useState([...extraColors]);

  // --- Computed Colors Logic (useMemo) ---
  const displayColors = useMemo(() => {
    // 1. Base list
    const cols = showNone
      ? [
          {
            name: "None",
            value: null,
            bgColor: "bg-background",
            selectedColor: "ring-black",
          },
          ...defaultColors,
        ]
      : [...defaultColors];

    // 2. Add Extras
    cols.push(...localExtras);

    // 3. Check Custom Logic
    // Nếu selectedColor có giá trị, và KHÔNG nằm trong default, và KHÔNG nằm trong extra
    // thì hiển thị nó tạm thời trong list
    if (selectedColor) {
      const isDefault = defaultColors.some((c) => c.value === selectedColor);
      const isExtra = localExtras.some((c) => c.value === selectedColor);

      if (!isDefault && !isExtra) {
        cols.push({
          name: selectedColor.toUpperCase(),
          value: selectedColor,
          bgColor: "",
          selectedColor: "ring-black",
        });
      }
    }
    return cols;
  }, [showNone, localExtras, selectedColor]);

  // --- Helpers ---

  const getColorName = (color: string | null) => {
    if (!color) return "None";
    return displayColors.find((c) => c.value === color)?.name ?? color.toUpperCase();
  };

  const handleUpdateHexValue = (val: string) => {
    if (isValidHexColor(val)) {
      onValueChange?.(val);
    }
    // React tự handle việc re-render nếu value không đổi, 
    // nếu muốn force reset input sai về giá trị cũ, EditableLabel cần tự xử lý việc đó
  };

  const handleOpenChange = (isOpen: boolean) => {
    // Handle Store logic
    if (uiStore.popperCounter) {
        // Mock logic +/- counter
        // uiStore.setPopperCounter(prev => isOpen ? prev + 1 : prev - 1);
    }

    if (!isOpen) {
      // Logic: Khi đóng, nếu màu hiện tại là Custom (không thuộc default/extra), thì lưu vào extraColors
      if (selectedColor) {
        const isDefault = defaultColors.some((c) => c.value === selectedColor);
        const isExtra = extraColors.some((c) => c.value === selectedColor); // Check mảng gốc import

        if (!isDefault && !isExtra) {
          const newColor = {
            name: selectedColor.toUpperCase(),
            value: selectedColor,
            bgColor: "",
            selectedColor: "ring-black",
          };
          // Update mảng gốc (Mutable side-effect giống Vue code cũ)
          extraColors.push(newColor);
          // Update local state để re-render
          setLocalExtras([...extraColors]);
        }
      }
    }
  };

  // --- Render ---

  return (
    <Popover onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        {children || (
          <Button type="button" variant="ghost" className="justify-start gap-2">
             <span
              aria-hidden="true"
              className="border-opacity-10 flex size-6 items-center justify-center rounded-full border border-gray-700 dark:border-gray-600"
              style={{ backgroundColor: selectedColor || undefined }}
            >
              {!selectedColor && <span>x</span>}
            </span>
            <span>{getColorName(selectedColor)}</span>
          </Button>
        )}
      </PopoverTrigger>
      
      <PopoverContent className="relative w-64" avoidCollisions={true}>
        <header className="text-sm font-bold">Color</header>
        
        {/* Color Grid */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {displayColors.map((color) => {
             const isSelected = selectedColor === color.value;
             return (
                <div
                  key={color.name}
                  className="flex rounded-full outline -outline-offset-1 outline-black/10"
                >
                  {/* Sử dụng button thay vì input radio để dễ style trong React */}
                  <button
                    type="button"
                    aria-label={color.name}
                    onClick={() => onValueChange?.(color.value as string | null)}
                    className={cn(
                        "size-6 appearance-none rounded-full forced-color-adjust-none",
                        "focus-visible:outline-3 focus-visible:outline-offset-3",
                        // Logic outline khi check
                        isSelected ? "outline-2 outline-offset-2" : ""
                    )}
                    style={{
                      backgroundColor: color.value || undefined, // undefined để fallback class nếu null
                      outlineColor: isSelected ? (color.value || "currentColor") : "transparent",
                    }}
                  >
                     {/* Hiển thị 'x' hoặc style đặc biệt cho None nếu cần */}
                     {color.value === null && <span className="text-xs text-muted-foreground">x</span>}
                  </button>
                </div>
             );
          })}
        </div>

        {/* Custom Color Picker */}
        <div className="mt-4 flex items-center gap-2">
          <label htmlFor="color-picker" className="cursor-pointer text-sm font-medium">
            Custom color
          </label>
          <input
            type="color"
            id="color-picker"
            value={selectedColor || "#000000"}
            onChange={(e) => onValueChange?.(e.target.value)}
            className="h-4 flex-auto cursor-pointer p-0 border-0 bg-transparent"
          />
        </div>

        {/* Hex Value Input */}
        <div className="mt-4 flex items-center gap-4">
          <span className="flex-none text-sm font-medium">Hex value</span>
          <div className="flex-auto">
             <EditableLabel
                value={selectedColor || "#000000"}
                onChange={handleUpdateHexValue}
             />
          </div>
        </div>

        <PopoverClose asChild>
          <div className="absolute top-4 right-4">
            <CloseButton />
          </div>
        </PopoverClose>

      </PopoverContent>
    </Popover>
  );
}