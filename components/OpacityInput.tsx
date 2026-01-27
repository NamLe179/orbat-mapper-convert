"use client";

import React, { useState } from "react";
import { SunMedium } from "lucide-react"; // Icon thay thế tương đương
import { cn } from "@/lib/utils";

interface OpacityInputProps {
  visible?: boolean;
  // Thay thế cho v-model
  opacity?: number;
  onOpacityChange?: (value: number) => void;
  className?: string;
}

export default function OpacityInput({
  visible = false,
  opacity = 1, // Default value
  onOpacityChange,
  className,
}: OpacityInputProps) {
  
  // Thay thế useToggle
  const [showRange, setShowRange] = useState(visible);

  // Logic Computed: Tính % hiển thị
  const opacityAsPercent = (opacity * 100).toFixed(0);

  const toggleRange = (e: React.MouseEvent) => {
    e.stopPropagation(); // Tương đương @click.stop
    setShowRange((prev) => !prev);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Tương đương v-model.number
    const val = parseFloat(e.target.value);
    onOpacityChange?.(val);
  };

  return (
    <div className={cn("flex items-center", className)}>
      {showRange && (
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={opacity}
          onChange={handleSliderChange}
          // Thêm class accent để slider có màu theo theme Tailwind
          className="w-24 accent-primary cursor-pointer h-2 bg-secondary rounded-lg appearance-none" 
        />
      )}
      
      <button
        type="button"
        className="text-muted-foreground flex h-6 items-center hover:text-foreground transition-colors"
        title="Opacity"
        onClick={toggleRange}
      >
        {/* Icon Opacity */}
        <SunMedium className="scale-110 transform h-4 w-4 ml-2" />
        
        <span className="text-muted-foreground ml-1 w-7 text-right text-xs">
          {opacityAsPercent}%
        </span>
      </button>
    </div>
  );
}