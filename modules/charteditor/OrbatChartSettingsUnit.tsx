"use client";

import React, { useMemo } from "react";

// Stores & Hooks
import { useSelectedChartElementStore } from "./chartSettingsStore";
import { useChartSettings } from "./composables";
import { ChartItemTypes } from "./orbatchart";

// Components
import PlainButton from "@/components/PlainButton";
import SettingsUnit from "./SettingsUnit";
import AccordionPanel from "@/components/AccordionPanel";
import MilitarySymbol from "@/components/MilitarySymbol";
import SettingsToe from "@/modules/charteditor/SettingsToe";

export default function OrbatChartSettingsUnit() {
  // --- Hooks & Stores ---
  const currentUnitNode = useSelectedChartElementStore();
  const { clearSpecificOptions } = useChartSettings(ChartItemTypes.Unit);

  // --- Computed (useMemo) ---
  const currentUnit = useMemo(() => {
    return currentUnitNode.node?.unit || null;
  }, [currentUnitNode.node]);

  return (
    <div className="space-y-4 pb-4">
      <p className="text-muted-foreground text-sm">Unit specific options.</p>

      {currentUnit && (
        <div className="space-y-4">
          <header className="flex items-start">
            {/* Unit Icon Section */}
            <div className="h-20 w-16 shrink-0">
              <MilitarySymbol
                sidc={currentUnit.sidc}
                size={34}
                options={currentUnit.symbolOptions}
              />
            </div>

            {/* Unit Info Section */}
            <div>
              <p className="text-muted-foreground pt-2 font-medium">
                {currentUnit.name}
              </p>
              <p className="text-muted-foreground text-sm">
                {currentUnit.shortName}
              </p>
            </div>
          </header>

          <PlainButton onClick={() => clearSpecificOptions()}>
            Clear settings
          </PlainButton>

          {/* Settings Sections */}
          
          <AccordionPanel label="Unit settings">
            <SettingsUnit itemType={ChartItemTypes.Unit} />
          </AccordionPanel>

          <AccordionPanel label="Equipment and personnel">
            <SettingsToe itemType={ChartItemTypes.Unit} />
          </AccordionPanel>
        </div>
      )}
    </div>
  );
}