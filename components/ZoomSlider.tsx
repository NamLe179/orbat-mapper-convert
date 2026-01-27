"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

const ZoomSlider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, value, defaultValue, ...props }, ref) => {
  // Để render text bên trong Thumb (giống Vue {{ _ }}), ta cần biết giá trị hiện tại.
  // Nếu component được control (có prop value), dùng nó. Nếu không, dùng defaultValue hoặc mảng rỗng.
  const currentValues = value || defaultValue || [0];

  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn(
        "relative flex w-full touch-none items-center select-none data-[orientation=vertical]:h-full data-[orientation=vertical]:w-2 data-[orientation=vertical]:flex-col",
        className
      )}
      value={value}
      defaultValue={defaultValue}
      {...props}
    >
      <SliderPrimitive.Track className="bg-secondary relative h-2 w-full grow overflow-hidden rounded-full data-[orientation=vertical]:w-2">
        <SliderPrimitive.Range className="bg-primary absolute h-full data-[orientation=vertical]:w-full" />
      </SliderPrimitive.Track>
      
      {/* Render Thumb dựa trên số lượng giá trị */}
      {currentValues.map((val, index) => (
        <SliderPrimitive.Thumb
          key={index}
          className="border-primary bg-background ring-offset-background focus-visible:ring-ring flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border-2 text-center text-xs transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50"
        >
          {/* Hiển thị giá trị bên trong Thumb giống bản gốc */}
          {val}
        </SliderPrimitive.Thumb>
      ))}
    </SliderPrimitive.Root>
  );
});

ZoomSlider.displayName = SliderPrimitive.Root.displayName;

export default ZoomSlider;