"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { MagnifyingGlassIcon as SearchIcon } from "@heroicons/react/24/solid";

// Stores & Logic
import { useChartSettingsStore, useRootUnitStore } from "./chartSettingsStore";
import {
  FontStyles,
  FontWeights,
  LabelPlacements,
  LevelLayouts,
  UnitLevelDistances,
} from "./orbatchart";
import { canvasSizeItems } from "./orbatchart/sizes";
import { enum2Items } from "@/utils";
import { useActiveScenario } from "@/components/injects";

// Components
import InputGroup from "@/components/InputGroup";
import SimpleSelect from "@/components/SimpleSelect";
import ToggleField from "@/components/ToggleField";
import MilSymbol from "@/components/MilSymbol";
import InputGroupTemplate from "@/components/InputGroupTemplate";
import IconButton from "@/components/IconButton";
import CreateEmtpyDashed from "@/components/CreateEmtpyDashed";
import AccordionPanel from "@/components/AccordionPanel";
import NumberInputGroup from "@/components/NumberInputGroup";
import SettingsToe from "@/modules/charteditor/SettingsToe";

// Lazy loading SearchModal
const SearchModal = dynamic(() => import("@/components/SearchModal"), {
  ssr: false,
});

interface Props {
  chartMode?: boolean;
}

export default function OrbatChartSettingsChart({ chartMode = false }: Props) {
  // --- Hooks & Context ---
  const {
    unitActions: { expandUnitWithSymbolOptions, getUnitById },
  } = useActiveScenario();

  const options = useChartSettingsStore();
  const rootUnitStore = useRootUnitStore();

  // --- Local State ---
  const [showSearch, setShowSearch] = useState(false);

  // --- Constants (Tương đương computed/static) ---
  const levelItems = enum2Items(LevelLayouts);
  const spacingItems = enum2Items(UnitLevelDistances);
  const fontWeightItems = enum2Items(FontWeights);
  const fontStyleItems = enum2Items(FontStyles);
  const labelPlacementItems = enum2Items(LabelPlacements);

  // --- Handlers ---
  const handleUnitSelect = (unitId: string) => {
    const unit = expandUnitWithSymbolOptions(getUnitById(unitId));
    if (unit) {
      rootUnitStore.setUnit(unit); // Giả định setter của Zustand
    }
    setShowSearch(false);
  };

  return (
    <div>
      <p className="text-muted-foreground text-sm">
        Settings that affect the whole chart.
      </p>

      {!chartMode && (
        <div className="my-4">
          {rootUnitStore.unit ? (
            <InputGroupTemplate label="Root unit">
              <div className="flex items-start">
                <div className="mt-2 w-16 shrink-0">
                  <MilSymbol
                    sidc={rootUnitStore.unit.sidc}
                    size={30}
                    modifiers={rootUnitStore.unit.symbolOptions}
                  />
                </div>
                <div className="min-w-0 flex-auto">
                  <p className="text-muted-foreground truncate pt-2 text-sm font-medium">
                    {rootUnitStore.unit.name}
                  </p>
                  <p className="text-muted-foreground truncate text-sm">
                    {rootUnitStore.unit.shortName}
                  </p>
                </div>
                <div className="mt-4 flex-none">
                  <IconButton onClick={() => setShowSearch(true)}>
                    <SearchIcon className="h-5 w-5" />
                  </IconButton>
                </div>
              </div>
            </InputGroupTemplate>
          ) : (
            <CreateEmtpyDashed
              onClick={() => setShowSearch(true)}
              icon={SearchIcon}
            >
              Select root unit
            </CreateEmtpyDashed>
          )}
        </div>
      )}

      <NumberInputGroup
        label="Levels"
        value={options.maxLevels}
        onValueChange={(val) => options.setOptions({ maxLevels: val })}
      />

      <div className="mt-4 w-full border-t border-gray-200" />

      <AccordionPanel label="Page settings">
        <SimpleSelect
          label="Page size"
          value={options.paperSize}
          items={canvasSizeItems}
          onValueChange={(val: string | number | null) => val !== null && options.setOptions({ paperSize: String(val) })}
        />
      </AccordionPanel>

      <AccordionPanel label="Layout and spacing">
        <NumberInputGroup
          label="Level padding"
          value={options.levelPadding}
          onValueChange={(val) => options.setOptions({ levelPadding: val })}
        />
        <NumberInputGroup
          label="Tree offset"
          value={options.treeOffset}
          onValueChange={(val) => options.setOptions({ treeOffset: val })}
        />
        <NumberInputGroup
          label="Stacked offset"
          value={options.stackedOffset}
          onValueChange={(val) => options.setOptions({ stackedOffset: val })}
        />
        <SimpleSelect
          label="Last level layout"
          value={options.lastLevelLayout}
          items={levelItems}
          onValueChange={(val: string | number | null) => val !== null && options.setOptions({ lastLevelLayout: val as any })}
        />
        <SimpleSelect
          label="Unit spacing"
          value={options.unitLevelDistance}
          items={spacingItems}
          onValueChange={(val: string | number | null) => val !== null && options.setOptions({ unitLevelDistance: val as any })}
        />
      </AccordionPanel>

      <AccordionPanel label="Unit settings">
        <NumberInputGroup
          label="Symbol size"
          value={options.symbolSize}
          onValueChange={(val) => options.setOptions({ symbolSize: val })}
        />
        <NumberInputGroup
          label="Font size"
          value={options.fontSize}
          onValueChange={(val) => options.setOptions({ fontSize: val })}
        />
        <SimpleSelect
          label="Font weight"
          value={options.fontWeight}
          items={fontWeightItems}
          onValueChange={(val: string | number | null) => val !== null && options.setOptions({ fontWeight: val as any })}
        />
        <SimpleSelect
          label="Font style"
          value={options.fontStyle}
          items={fontStyleItems}
          onValueChange={(val: string | number | null) => val !== null && options.setOptions({ fontStyle: val as any })}
        />
        <NumberInputGroup
          label="Label offset"
          value={options.labelOffset}
          onValueChange={(val) => options.setOptions({ labelOffset: val })}
        />
        <SimpleSelect
          label="Label placement"
          value={options.labelPlacement}
          items={labelPlacementItems}
          onValueChange={(val: string | number | null) => val !== null && options.setOptions({ labelPlacement: val as any })}
        />
        <InputGroup
          label="Font color"
          type="color"
          value={options.fontColor}
          onChange={(e) => options.setOptions({ fontColor: e.target.value })}
        />
        <ToggleField
          checked={options.useShortName}
          onCheckedChange={(val) => options.setOptions({ useShortName: val })}
        >
          Use short unit names
        </ToggleField>
        <ToggleField
          checked={options.hideLabel}
          onCheckedChange={(val) => options.setOptions({ hideLabel: val })}
        >
          Hide label
        </ToggleField>
      </AccordionPanel>

      <AccordionPanel label="Connectors">
        <NumberInputGroup
          label="Connector offset"
          value={options.connectorOffset}
          onValueChange={(val) => options.setOptions({ connectorOffset: val })}
        />
        <InputGroup
          label="Line width"
          type="number"
          value={options.lineWidth}
          onChange={(e) => options.setOptions({ lineWidth: Number(e.target.value) })}
        />
        <InputGroup
          label="Line color"
          type="color"
          value={options.lineColor}
          onChange={(e) => options.setOptions({ lineColor: e.target.value })}
        />
      </AccordionPanel>

      <AccordionPanel label="Equipment and personnel">
        <SettingsToe itemType="chart" />
      </AccordionPanel>

      {showSearch && (
        <SearchModal
          open={showSearch}
          onOpenChange={setShowSearch}
          onSelectUnit={handleUnitSelect}
        />
      )}
    </div>
  );
}