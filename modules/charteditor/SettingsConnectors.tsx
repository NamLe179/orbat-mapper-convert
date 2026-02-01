"use client";

import React from "react";
import { ChangeEvent } from "react";
import { type ChartItemType } from "./orbatchart";
import { useChartSettings } from "./composables";

// Giả định các components này đã được convert
import InputGroup from "@/components/InputGroup";
import NumberInputGroup from "@/components/NumberInputGroup";
import { cn } from "@/lib/utils"; // Utility để merge class (nếu có), hoặc dùng string template

interface SettingsConnectorsProps {
  itemType: ChartItemType;
}

export default function SettingsConnectors({ itemType }: SettingsConnectorsProps) {
  // Hook useChartSettings giả định trả về object tương tự Vue
  const { setValue, usedOptions, mergedOptions } = useChartSettings(itemType);

  return (
    <div className="space-y-6">
      <NumberInputGroup
        label="Connector offset"
        value={mergedOptions.connectorOffset}
        // Giả định onChange trả về giá trị số trực tiếp
        onValueChange={(val: number) => setValue("connectorOffset", val)}
        className={!usedOptions.has("connectorOffset") ? "sepia-[50%]" : ""}
      />

      <NumberInputGroup
        label="Line width"
        value={mergedOptions.lineWidth}
        onValueChange={(val: number) => setValue("lineWidth", val)}
        className={!usedOptions.has("lineWidth") ? "sepia-[50%]" : ""}
      />

      <InputGroup
        label="Line color"
        type="color"
        value={mergedOptions.lineColor}
        // Giả định onChange trả về string (mã màu)
        onChange={(e: ChangeEvent<HTMLInputElement>) => setValue("lineColor", e.target.value)}
        className={!usedOptions.has("lineColor") ? "sepia-[50%]" : ""}
      />
    </div>
  );
}