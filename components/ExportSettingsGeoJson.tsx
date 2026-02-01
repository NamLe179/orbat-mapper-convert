"use client";

import React from "react";
import type { ExportFormat, GeoJsonSettings } from "@/types/importExport";
import InputCheckbox from "@/components/InputCheckbox";

interface ExportSettingsGeoJsonProps {
  format: ExportFormat;
  // Controlled state cho settings object
  settings: GeoJsonSettings;
  onSettingsChange: (settings: GeoJsonSettings) => void;
}

export default function ExportSettingsGeoJson({
  format, // Prop này có trong Vue nhưng chưa dùng trong template, giữ lại để đảm bảo tính mở rộng
  settings,
  onSettingsChange,
}: ExportSettingsGeoJsonProps) {

  // Helper function để update từng trường trong object settings một cách an toàn (Immutable)
  const updateSetting = (key: keyof GeoJsonSettings, value: boolean) => {
    onSettingsChange({
      ...settings,
      [key]: value,
    });
  };

  return (
    <fieldset className="space-y-4">
      <InputCheckbox
        label="Include units"
        description="Units with a location at current scenario time"
        checked={settings.includeUnits}
        onCheckedChange={(val) => updateSetting("includeUnits", val === true)}
      />
      
      <InputCheckbox
        label="Include scenario features"
        description=""
        checked={settings.includeFeatures}
        onCheckedChange={(val) => updateSetting("includeFeatures", val === true)}
      />

      <InputCheckbox
        label="Include ID"
        checked={settings.includeId}
        onCheckedChange={(val) => updateSetting("includeId", val === true)}
      />
      
      <InputCheckbox
        label="Include ID in properties"
        checked={settings.includeIdInProperties}
        onCheckedChange={(val) => updateSetting("includeIdInProperties", val === true)}
      />
    </fieldset>
  );
}