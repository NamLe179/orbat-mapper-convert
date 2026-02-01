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
import SettingConnectors from "./SettingsConnectors";

export default function OrbatChartSettingsBranch() {
  // --- Hooks & Stores ---
  const selectedElement = useSelectedChartElementStore();
  const { clearSpecificOptions } = useChartSettings(ChartItemTypes.Branch);

  // --- Logic (Tương đương computed) ---
  const currentBranch = useMemo(() => {
    return selectedElement.branch?.parent || null;
  }, [selectedElement.branch]);

  return (
    <div className="pb-4">
      <p className="text-muted-foreground text-sm">Branch specific options.</p>
      
      {currentBranch !== null && (
        <div className="mt-4">
          <PlainButton onClick={() => clearSpecificOptions()}>
            Clear settings
          </PlainButton>
          
          <AccordionPanel label="Unit settings">
            <SettingsUnit itemType={ChartItemTypes.Branch} />
          </AccordionPanel>
          
          <AccordionPanel label="Connectors">
            <SettingConnectors itemType={ChartItemTypes.Branch} />
          </AccordionPanel>
        </div>
      )}
    </div>
  );
}