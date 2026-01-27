import React, { useMemo } from "react";
import { symbolGenerator } from "@/symbology/milsymbwrapper";
import { cn } from "@/lib/utils"; // Giả định utility merge class có sẵn

interface MilSymbolProps {
  sidc?: string;
  size?: number;
  modifiers?: Record<string, any>;
  className?: string; // Thêm className để dễ style từ bên ngoài
}

export default function MilSymbol({
  sidc = "",
  size = 15,
  modifiers = {},
  className,
}: MilSymbolProps) {
  
  // Cache kết quả tạo symbol
  const svgHtml = useMemo(() => {
    const symb = symbolGenerator(sidc || "", {
      size: size,
      simpleStatusModifier: true, // Option cố định theo code gốc
      ...(modifiers ?? {}),
    });
    
    return symb.asSVG();
  }, [sidc, size, modifiers]);

  return (
    <span
      className={cn("milsymbol inline-block align-middle", className)}
      dangerouslySetInnerHTML={{ __html: svgHtml }}
    />
  );
}