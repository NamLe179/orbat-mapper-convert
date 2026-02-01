"use client";

import React, { useMemo } from "react";

// Types
import { type NullableSymbolItem } from "@/types/constants";
import { type SymbolFillColor, SYMBOL_FILL_COLORS } from "@/config/colors";

// Hooks & Context
import { useActiveScenario } from "@/components/injects";

// Components
import SymbolCodeSelect from "@/components/SymbolCodeSelect";

interface SymbolFillColorSelectProps {
  sid?: string;
  defaultFillColor?: string;
  value?: string | null;
  onChange?: (value: string | null) => void;
}

export default function SymbolFillColorSelect({
  sid = "3",
  defaultFillColor,
  value = null,
  onChange,
}: SymbolFillColorSelectProps) {
  // --- Context ---
  // Sử dụng optional chaining vì trong Vue gốc dùng inject (có thể null)
  const scn = useActiveScenario();

  // --- Computed (useMemo) ---
  const colorIconItems = useMemo((): NullableSymbolItem[] => {
    // Lấy map màu tùy chỉnh từ store nếu có
    const customColors = Object.values(scn?.store?.state?.symbolFillColorMap ?? {});

    const baseItems = [
      { code: null, text: "Default" },
      ...SYMBOL_FILL_COLORS,
      ...customColors,
    ];

    return baseItems.map((item) => ({
      ...item,
      // Logic tạo mã SIDC giả lập để hiển thị màu trong SymbolCodeSelect
      sidc: `100${sid}1000000000000000`,
      symbolOptions: item.code
        ? { fillColor: item.code }
        : defaultFillColor
        ? { fillColor: defaultFillColor }
        : undefined,
    }));
  }, [sid, defaultFillColor, scn?.store?.state?.symbolFillColorMap]);

  return (
    <SymbolCodeSelect
      label="Fill color"
      items={colorIconItems}
      value={value}
      onValueChange={onChange}
    />
  );
}