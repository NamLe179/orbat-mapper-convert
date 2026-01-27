"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils"; // Giả định utility merge class có sẵn
import { symbolGenerator } from "@/symbology/milsymbwrapper";
import { useSymbolSettingsStore } from "@/stores/settingsStore";

interface NewMilitarySymbolProps {
  sidc?: string;
  size?: number;
  modifiers?: Record<string, any>;
  options?: Record<string, any>;
  className?: string;
}

export default function NewMilitarySymbol({
  sidc = "",
  size = 15,
  modifiers = {},
  options = {},
  className,
}: NewMilitarySymbolProps) {
  // Lấy settings từ store
  const symbolOptions = useSymbolSettingsStore((state) => state.getSymbolOptions);

  // useMemo để tính toán SVG string, chỉ chạy lại khi props/store thay đổi
  const svgHtml = useMemo(() => {
    const symb = symbolGenerator(sidc || "", {
      size: size,
      ...symbolOptions, // Spread settings từ store
      ...(options ?? {}),
      ...(modifiers ?? {}),
    });

    // Thay vì dùng asDOM() rồi copy attributes phức tạp như Vue,
    // ta dùng asSVG() để lấy trực tiếp chuỗi HTML/XML chuẩn.
    return symb.asSVG();
  }, [sidc, size, symbolOptions, options, modifiers]);

  return (
    <span
      // Class "milsymbol" được giữ lại để tương thích CSS
      // Thêm inline-block để SVG hiển thị đúng dòng
      className={cn("milsymbol inline-block align-middle", className)}
      dangerouslySetInnerHTML={{ __html: svgHtml }}
    />
  );
}