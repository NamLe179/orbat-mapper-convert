"use client";

import React, { useMemo, useEffect } from "react";

// Stores & Hooks
import {
  useSelectedChartElementStore,
  useSpecificChartOptionsStore,
} from "./chartSettingsStore";
import { useChartSettings } from "./composables";
import { ChartItemTypes } from "./orbatchart";

// Types
import { type SelectItem } from "@/components/types";

// Components
import PlainButton from "@/components/PlainButton";
import SettingsUnit from "./SettingsUnit";
import AccordionPanel from "@/components/AccordionPanel";
import SettingConnectors from "./SettingsConnectors";
import NumberInputGroup from "@/components/NumberInputGroup";
import SimpleSelect from "@/components/SimpleSelect";

export default function OrbatChartSettingsLevel() {
  // --- Hooks & Stores ---
  const selectedElement = useSelectedChartElementStore();
  const specificStore = useSpecificChartOptionsStore();
  
  const { clearSpecificOptions, usedOptions, mergedOptions, setValue } = useChartSettings(
    ChartItemTypes.Level
  );

  // --- Logic khởi tạo (Tương đương if (level === null) test.value = 0) ---
  useEffect(() => {
    if (selectedElement.level === null || selectedElement.level === undefined) {
      selectedElement.selectLevel(0);
    }
  }, [selectedElement]);

  // --- Computed: Level Items ---
  const levelItems = useMemo((): SelectItem[] => {
    const maxLevels = mergedOptions.maxLevels || 0;
    return [...Array(maxLevels)].map((_, i) => {
      // Kiểm tra xem level này đã có option tùy chỉnh chưa
      const hasOpts = Object.keys(specificStore.level?.[i] || {}).length > 0;

      return {
        label: hasOpts ? `Level ${i} *` : `Level ${i}`,
        value: i,
      };
    });
  }, [mergedOptions.maxLevels, specificStore.level]);

  // --- Computed: Current Level (Getter/Setter logic) ---
  const currentLevel = selectedElement.level ?? 0;
  const handleLevelChange = (v: number) => {
    selectedElement.selectLevel(v);
  };

  return (
    <div className="pb-4">
      {/* Header section */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">Level specific options.</p>
        <PlainButton 
          disabled={usedOptions.size === 0} 
          onClick={() => clearSpecificOptions()}
        >
          Clear settings
        </PlainButton>
      </div>

      <div className="mt-4">
        {/* Level Selection */}
        <SimpleSelect 
          label="Level" 
          items={levelItems} 
          value={currentLevel}
          onValueChange={(val: string | number | null) => val !== null && handleLevelChange(Number(val))}
        />

        {/* Unit Settings Section */}
        <AccordionPanel label="Unit settings">
          <SettingsUnit itemType={ChartItemTypes.Level} />
        </AccordionPanel>

        {/* Layout and Spacing Section */}
        <AccordionPanel label="Layout and spacing">
          <NumberInputGroup
            label="Level padding"
            value={mergedOptions.levelPadding}
            onValueChange={(v) => setValue("levelPadding", v)}
            // Hiệu ứng sepia nếu option này chưa được tùy chỉnh riêng cho level
            className={!usedOptions.has("levelPadding") ? "sepia-[50%]" : ""}
          />
        </AccordionPanel>

        {/* Connectors Section */}
        <AccordionPanel label="Connectors">
          <SettingConnectors itemType={ChartItemTypes.Level} />
        </AccordionPanel>
      </div>
    </div>
  );
}