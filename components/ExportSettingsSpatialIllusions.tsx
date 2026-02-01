"use client";

import React, { useMemo, useEffect } from "react";
import type { ExportFormat, UnitGeneratorSettings } from "@/types/importExport";
import type { SelectItem } from "@/components/types";
import type { EntityId } from "@/types/base";
import SimpleSelect from "@/components/SimpleSelect";
import NumberInputGroup from "@/components/NumberInputGroup";
import { useActiveScenario } from "@/components/injects";

interface ExportSettingsSpatialIllusionsProps {
  format: ExportFormat;
  // Controlled Settings State
  settings: UnitGeneratorSettings;
  onSettingsChange: (settings: UnitGeneratorSettings) => void;
}

export default function ExportSettingsSpatialIllusions({
  format,
  settings,
  onSettingsChange,
}: ExportSettingsSpatialIllusionsProps) {
  
  // Access Store
  const { unitActions, store } = useActiveScenario();
  const { state } = store;

  // --- Computed (useMemo) ---
  // Tạo danh sách đơn vị phân cấp
  const rootUnitItems = useMemo(() => {
    const items: SelectItem<EntityId>[] = [];
    
    state.sides.forEach((sideId) => {
      unitActions.walkSide(sideId, (unit, level, parent, sideGroup, side) => {
        // Filter: chỉ lấy đơn vị có cấp dưới
        if (unit.subUnits.length === 0) return;

        // Tạo indent bằng dấu chấm (giống Vue code gốc)
        const indent = "..".repeat(level);
        
        items.push({
          label: `${side.name} ${indent} ${unit.name}`,
          value: unit.id,
        });
      });
    });

    return items;
  }, [state.sides, unitActions]);

  // --- Helpers Update Settings ---
  const updateSetting = (key: keyof UnitGeneratorSettings, value: any) => {
    onSettingsChange({
      ...settings,
      [key]: value,
    });
  };

  // --- Initialization Effect ---
  // Nếu settings.rootUnit chưa có giá trị, lấy giá trị đầu tiên trong list
  useEffect(() => {
    if (!settings.rootUnit && rootUnitItems.length > 0) {
      updateSetting("rootUnit", rootUnitItems[0].value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootUnitItems]); // Chạy lại khi danh sách unit thay đổi

  return (
    <>
      <section className="prose prose-sm dark:prose-invert">
        <p>
          Export a unit hierarchy for use with the{" "}
          <a
            href="https://spatialillusions.com/unitgenerator/"
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            Spatial Illusions Orbat builder
          </a>
        </p>
      </section>

      <fieldset className="space-y-4">
        <SimpleSelect
          label="Root unit"
          items={rootUnitItems}
          value={settings.rootUnit}
          onValueChange={(val) => updateSetting("rootUnit", val)}
        />

        <NumberInputGroup
          label="Max levels/depth"
          min={1}
          max={10}
          value={settings.maxLevels}
          onValueChange={(val) => updateSetting("maxLevels", val)}
        />
      </fieldset>
    </>
  );
}