"use client";

import React from "react";
import { type ChartItemType } from "./orbatchart";
import { useChartSettings } from "./composables";

// Giả định ToggleField đã convert sang React
import ToggleField from "@/components/ToggleField"; 

interface SettingsToeProps {
  itemType: ChartItemType;
}

export default function SettingsToe({ itemType }: SettingsToeProps) {
  const { setValue, usedOptions, mergedOptions } = useChartSettings(itemType);

  // Giữ lại log để debug giống code gốc
  console.log(usedOptions);

  return (
    <div className="space-y-6">
      <div className={!usedOptions.has("showPersonnel") ? "sepia-[50%]" : ""}>
        <ToggleField
          // Vue: :model-value -> React: checked (vì là toggle boolean)
          checked={mergedOptions.showPersonnel}
          // Vue: @update:model-value -> React: onCheckedChange
          onCheckedChange={(val: boolean) => setValue("showPersonnel", val)}
        >
          Show personnel
        </ToggleField>
      </div>

      <div className={!usedOptions.has("showEquipment") ? "sepia-[50%]" : ""}>
        <ToggleField
          checked={mergedOptions.showEquipment}
          onCheckedChange={(val: boolean) => setValue("showEquipment", val)}
        >
          Show equipment
        </ToggleField>
      </div>
    </div>
  );
}