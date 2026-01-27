"use client";

import React, { useMemo } from "react";
import { symbolGenerator } from "@/symbology/milsymbwrapper";
import { useSymbolSettingsStore } from "@/stores/settingsStore";
import { cn } from "@/lib/utils"; // Utility merge class

interface MilitarySymbolProps {
  sidc?: string;
  size?: number;
  modifiers?: Record<string, any>; // Object chứa các modifiers
  options?: Record<string, any>;   // Object chứa các options bổ sung
  className?: string;
}

export default function MilitarySymbol({
  sidc = "",
  size = 15,
  modifiers = {},
  options = {},
  className,
}: MilitarySymbolProps) {
  // Lấy setting từ store (Zustand selector)
  const symbolOptions = useSymbolSettingsStore((state) => state.getSymbolOptions);

  // useMemo thay thế cho computed
  // Chỉ tạo lại SVG string khi input thay đổi
  const svgHtml = useMemo(() => {
    const symbol = symbolGenerator(sidc || "", {
      size: size,
      ...symbolOptions, // Setting toàn cục
      ...options,       // Option props
      ...modifiers,     // Modifiers props
    });
    
    return symbol.asSVG();
  }, [sidc, size, symbolOptions, options, modifiers]);

  return (
    <span
      className={cn("milsymbol inline-block align-middle", className)}
      dangerouslySetInnerHTML={{ __html: svgHtml }}
    />
  );
}