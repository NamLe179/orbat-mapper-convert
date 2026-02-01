"use client";

import React from "react";
import ToggleField from "@/components/ToggleField";
import RadioGroupList from "@/components/RadioGroupList";
import NumberInputGroup from "@/components/NumberInputGroup";
import SimpleDivider from "@/components/SimpleDivider";
import PanelSubHeading from "@/components/PanelSubHeading";

import { useMapSettingsStore } from "@/stores/mapSettingsStore";
import { useUiStore } from "@/stores/uiStore";
import { useMeasurementsStore } from "@/stores/geoStore";
import { type RadioGroupItemData } from "@/components/types";
import { type CoordinateFormatType } from "@/hooks/geoShowLocation";
import { type MeasurementUnit } from "@/hooks/geoMeasurement";

// --- Constants ---
const coordinateFormatItems: RadioGroupItemData<CoordinateFormatType>[] = [
  { name: "DG", description: "Decimal degrees", value: "DecimalDegrees" },
  { name: "DMS", description: "Degree Minutes Seconds", value: "DegreeMinuteSeconds" },
  { name: "MGRS", description: "Military grid reference system", value: "MGRS" },
];

const measurementItems: RadioGroupItemData<MeasurementUnit>[] = [
  { name: "Metric", value: "metric" },
  { name: "Imperial", value: "imperial" },
  { name: "Nautical", value: "nautical" },
];

export default function MapSettingsPanel() {
  const settings = useMapSettingsStore();
  const measurementStore = useMeasurementsStore();
  const uiSettings = useUiStore();

  // Helper để update store (Hỗ trợ cả Mutable/Valtio hoặc gọi Action nếu cần)
  // Nếu dùng Zustand thuần, bạn nên thay thế bằng các setter cụ thể (vd: settings.setMapIconSize(val))
  const updateSetting = (store: any, key: string, val: any) => {
    if (store['set' + key.charAt(0).toUpperCase() + key.slice(1)]) {
        // Support setter function like setShowToolbar
        store['set' + key.charAt(0).toUpperCase() + key.slice(1)](val);
    } else {
        // Fallback to mutable assignment
        store[key] = val;
    }
  };

  return (
    <div className="space-y-5 p-1">
      {/* UI Settings Toggles */}
      <ToggleField
        checked={uiSettings.showToolbar}
        onCheckedChange={(v) => updateSetting(uiSettings, 'showToolbar', v)}
      >
        Show toolbar
      </ToggleField>

      <ToggleField
        checked={uiSettings.showTimeline}
        onCheckedChange={(v) => updateSetting(uiSettings, 'showTimeline', v)}
      >
        Show timeline
      </ToggleField>

      <ToggleField
        checked={uiSettings.showOrbatBreadcrumbs}
        onCheckedChange={(v) => updateSetting(uiSettings, 'showOrbatBreadcrumbs', v)}
      >
        Show ORBAT breadcrumbs
      </ToggleField>

      {/* Map Settings Toggles */}
      <ToggleField
        checked={settings.showScaleLine}
        onCheckedChange={(v) => updateSetting(settings, 'showScaleLine', v)}
      >
        Show scale line
      </ToggleField>

      <ToggleField
        checked={settings.showLocation}
        onCheckedChange={(v) => updateSetting(settings, 'showLocation', v)}
      >
        Show location of mouse cursor
      </ToggleField>

      <SimpleDivider className="mt-8" />

      {/* Symbol Settings */}
      <PanelSubHeading>Map unit symbol settings</PanelSubHeading>

      <NumberInputGroup
        label="Map symbol size"
        value={settings.mapIconSize}
        onValueChange={(v) => updateSetting(settings, 'mapIconSize', v)}
      />

      <ToggleField
        checked={settings.mapUnitLabelBelow}
        onCheckedChange={(v) => updateSetting(settings, 'mapUnitLabelBelow', v)}
      >
        Show map unit labels below icons
      </ToggleField>

      {/* Conditional Rendering */}
      {settings.mapUnitLabelBelow && (
        <>
          <NumberInputGroup
            label="Unit label font size(px)"
            value={settings.mapLabelSize}
            onValueChange={(v) => updateSetting(settings, 'mapLabelSize', v)}
          />
          <ToggleField
            checked={settings.mapWrapUnitLabels}
            onCheckedChange={(v) => updateSetting(settings, 'mapWrapUnitLabels', v)}
          >
            Wrap long unit labels
          </ToggleField>
          <NumberInputGroup
            label="Label wrap width"
            value={settings.mapWrapLabelWidth}
            onValueChange={(v) => updateSetting(settings, 'mapWrapLabelWidth', v)}
          />
        </>
      )}

      <SimpleDivider className="mt-8" />

      {/* Coordinate Format */}
      <section>
        <p className="text-base leading-loose font-medium">Coordinate format</p>
        <RadioGroupList
          value={settings.coordinateFormat}
          onValueChange={(v) => updateSetting(settings, 'coordinateFormat', v)}
          items={coordinateFormatItems}
        />
      </section>

      {/* Measurement Unit */}
      <section>
        <p className="text-base leading-loose font-medium">Measurement unit</p>
        <RadioGroupList
          value={measurementStore.measurementUnit}
          onValueChange={(v) => updateSetting(measurementStore, 'measurementUnit', v)}
          items={measurementItems}
        />
      </section>
    </div>
  );
}