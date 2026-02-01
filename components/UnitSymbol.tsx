"use client";

import React, { useMemo } from "react";
import NewMilitarySymbol from "@/components/NewMilitarySymbol";
import { useActiveScenario } from "@/components/injects";
import { CUSTOM_SYMBOL_PREFIX, CUSTOM_SYMBOL_SLICE } from "@/config/constants";

interface UnitSymbolProps {
  sidc: string;
  options?: Record<string, any>;
  modifiers?: Record<string, any>;
  size?: number;
  className?: string; // Thêm className để dễ style từ cha
}

export default function UnitSymbol({
  sidc,
  options,
  modifiers,
  size = 15,
  className,
}: UnitSymbolProps) {
  
  // Hooks
  const { store } = useActiveScenario();

  // Computed: Custom Symbol Logic
  const customSidc = useMemo(() => {
    if (sidc?.startsWith(CUSTOM_SYMBOL_PREFIX)) {
      const symbolId = sidc.slice(CUSTOM_SYMBOL_SLICE);
      
      // Ưu tiên options.customSymbolMap, sau đó đến store global
      const mapping =
        options?.customSymbolMap ?? store.state.customSymbolMap ?? {};
        
      return mapping[symbolId];
    }
    return null;
  }, [sidc, options, store.state.customSymbolMap]);

  // Render
  if (customSidc) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={customSidc.src}
        alt={customSidc.name || "Custom Symbol"}
        draggable="false"
        className={`object-contain ${className || ""}`}
        // Vue gốc không bind size cho img, nhưng React nên thêm để đảm bảo layout
        style={{ width: size, height: size }} 
      />
    );
  }

  return (
    <NewMilitarySymbol
      sidc={sidc}
      options={options}
      modifiers={modifiers}
      size={size}
      className={className}
    />
  );
}