"use client";

import React, { ChangeEvent } from "react";
import { enum2Items } from "@/utils";
import {
  type ChartItemType,
  FontStyles,
  FontWeights,
  LabelPlacements,
} from "./orbatchart";
import { useChartSettings } from "./composables";

// Giả định các UI components đã được convert
import InputGroup from "@/components/InputGroup";
import SimpleSelect from "@/components/SimpleSelect";
import ToggleField from "@/components/ToggleField";
import NumberInputGroup from "@/components/NumberInputGroup";

interface SettingsUnitProps {
  itemType: ChartItemType;
}

export default function SettingsUnit({ itemType }: SettingsUnitProps) {
  // Hook lấy settings (đã convert ở các bước trước)
  const { setValue, usedOptions, mergedOptions } = useChartSettings(itemType);

  // Convert Enum sang danh sách items cho Select
  const fontWeightItems = enum2Items(FontWeights);
  const fontStyleItems = enum2Items(FontStyles);
  const labelPlacementItems = enum2Items(LabelPlacements);

  return (
    <div className="space-y-6">
      {/* Symbol Size */}
      <NumberInputGroup
        label="Symbol size"
        value={mergedOptions.symbolSize}
        onValueChange={(val: number) => setValue("symbolSize", val)}
        className={!usedOptions.has("symbolSize") ? "sepia-[50%]" : ""}
      />

      {/* Font Size */}
      <NumberInputGroup
        label="Font size"
        value={mergedOptions.fontSize}
        onValueChange={(val: number) => setValue("fontSize", val)}
        className={!usedOptions.has("fontSize") ? "sepia-[50%]" : ""}
      />

      {/* Font Weight */}
      <SimpleSelect
        label="Font weight"
        value={mergedOptions.fontWeight}
        onValueChange={(val: string | number | null) => val !== null && setValue("fontWeight", val)}
        className={!usedOptions.has("fontWeight") ? "sepia-[50%]" : ""}
        items={fontWeightItems}
      />

      {/* Font Style */}
      <SimpleSelect
        label="Font style"
        value={mergedOptions.fontStyle}
        onValueChange={(val: string | number | null) => val !== null && setValue("fontStyle", val)}
        className={!usedOptions.has("fontStyle") ? "sepia-[50%]" : ""}
        items={fontStyleItems}
      />

      {/* Font Color */}
      {/* Lưu ý: InputGroup type='color' thường trả về event change chuẩn */}
      <InputGroup
        label="Font color"
        type="color"
        value={mergedOptions.fontColor}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          setValue("fontColor", e.target.value)
        }
        className={!usedOptions.has("fontColor") ? "sepia-[50%]" : ""}
      />

      {/* Label Offset */}
      <NumberInputGroup
        label="Label offset"
        value={mergedOptions.labelOffset}
        onValueChange={(val: number) => setValue("labelOffset", val)}
        className={!usedOptions.has("labelOffset") ? "sepia-[50%]" : ""}
      />

      {/* Label Placement */}
      <SimpleSelect
        label="Label placement"
        value={mergedOptions.labelPlacement}
        onValueChange={(val: string | number | null) => val !== null && setValue("labelPlacement", val)}
        className={!usedOptions.has("labelPlacement") ? "sepia-[50%]" : ""}
        items={labelPlacementItems}
      />

      {/* Use Short Name */}
      <div className={!usedOptions.has("useShortName") ? "sepia-[50%]" : ""}>
        <ToggleField
          checked={mergedOptions.useShortName}
          onCheckedChange={(val: boolean) => setValue("useShortName", val)}
        >
          Use short unit names
        </ToggleField>
      </div>

      {/* Hide Label */}
      <div className={!usedOptions.has("hideLabel") ? "sepia-[50%]" : ""}>
        <ToggleField
          checked={mergedOptions.hideLabel}
          onCheckedChange={(val: boolean) => setValue("hideLabel", val)}
        >
          Hide label
        </ToggleField>
      </div>
    </div>
  );
}