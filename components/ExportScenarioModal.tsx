"use client";

import React, { useEffect, useMemo, useState } from "react";
import NProgress from "nprogress";

// Hooks & Stores
import { useScenarioExport } from "@/importexport/export/scenarioExport";
import { useNotifications } from "@/hooks/notifications";
import { useExportStore } from "@/stores/importExportStore";

// Types
import type { ExportFormat, ExportSettings } from "@/types/importExport";
import { type SelectItem } from "@/components/types";

// Components (Giả định đã convert)
import SimpleSelect from "@/components/SimpleSelect";
import InputCheckbox from "@/components/InputCheckbox";
import ToggleField from "@/components/ToggleField";
import { Button } from "@/components/ui/button";
import NewSimpleModal from "@/components/NewSimpleModal";
import DocLink from "@/components/DocLink";

// Export Settings Components
import ExportSettingsXlsx from "@/components/ExportSettingsXlsx";
import ExportSettingsSpatialIllusions from "@/components/ExportSettingsSpatialIllusions";
import ExportSettingsGeoJson from "@/components/ExportSettingsGeoJson";
import ExportSettingsOrbatMapper from "@/components/ExportSettingsOrbatMapper";
import ExportSettingsKmlKmz from "@/components/ExportSettingsKmlKmz";

interface ExportScenarioModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel?: () => void;
}

interface FormState extends ExportSettings {
  format: ExportFormat;
}

const formatItems: SelectItem<ExportFormat>[] = [
  { label: "ORBAT Mapper", value: "orbatmapper" },
  { label: "GeoJSON", value: "geojson" },
  { label: "KML", value: "kml" },
  { label: "KMZ", value: "kmz" },
  { label: "XLSX", value: "xlsx" },
  { label: "MilX", value: "milx" },
  { label: "Spatial Illusions ORBAT builder", value: "unitgenerator" },
];

const DEFAULT_FORM: FormState = {
  format: "orbatmapper",
  includeFeatures: false,
  includeUnits: true,
  includeSelectedUnitsOnly: false,
  sideGroups: [],
  fileName: "scenario.json",
  embedIcons: true,
  useShortName: true,
  oneSheetPerSide: true,
  columns: [],
  oneFolderPerSide: true,
  folderMode: "side",
  customColors: true,
  rootUnit: "",
  maxLevels: 3,
  includeIdInProperties: false,
  includeId: true,
  iconScale: 1.5,
  labelScale: 1,
  drawSymbolOutline: true,
  outlineColor: "rgba(255,255,255,0.8)",
  outlineWidth: 8,
  renderAmplifiers: false,
  timeMode: "current",
  exportEventId: "",
  exportEventIds: [],
  useRadioFolder: true,
};

export default function ExportScenarioModal({
  open,
  onOpenChange,
  onCancel,
}: ExportScenarioModalProps) {
  // --- Hooks ---
  const {
    downloadAsGeoJSON,
    downloadAsKML,
    downloadAsKMZ,
    downloadAsXlsx,
    downloadAsMilx,
    downloadAsSpatialIllusions,
    downloadAsOrbatMapper,
  } = useScenarioExport();

  const store = useExportStore();
  const { send } = useNotifications();

  // --- State (with LocalStorage persistence logic) ---
  const [form, setForm] = useState<FormState>(() => ({
    ...DEFAULT_FORM,
    format: store.currentFormat ?? "orbatmapper",
  }));

  // Effect to load from localStorage on mount (Client-side only)
  useEffect(() => {
    const saved = localStorage.getItem("exportSettings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setForm((prev) => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error("Failed to parse export settings", e);
      }
    }
  }, []);

  // Effect to save to localStorage whenever form changes
  useEffect(() => {
    localStorage.setItem("exportSettings", JSON.stringify(form));
  }, [form]);

  // --- Computed ---
  const { format } = form;
  const isKml = format === "kml";
  const isKmz = format === "kmz";
  const isMilx = format === "milx";

  // --- Handlers ---

  const handleUpdateForm = (updates: Partial<FormState>) => {
    setForm((prev) => ({ ...prev, ...updates }));
  };

  const handleCancel = () => {
    onOpenChange(false);
    // Restore format from store if needed, mostly logic from Vue
    if (store.currentFormat) {
       // logic gốc: store.currentFormat = format.value (Vue)
       // Ở đây ta update store để ghi nhớ lựa chọn cuối cùng
       store.setCurrentFormat(form.format); 
    }
    if (onCancel) onCancel();
  };

  const onExport = async (e: React.FormEvent) => {
    e.preventDefault();
    NProgress.start();

    try {
      if (format === "geojson") {
        await downloadAsGeoJSON(form);
      } else if (format === "kml") {
        await downloadAsKML(form);
      } else if (format === "kmz") {
        await downloadAsKMZ(form);
      } else if (format === "xlsx") {
        await downloadAsXlsx(form);
      } else if (format === "milx") {
        await downloadAsMilx(form);
      } else if (format === "unitgenerator") {
        await downloadAsSpatialIllusions(form);
      } else if (format === "orbatmapper") {
        await downloadAsOrbatMapper(form);
      }

      send({ message: `Exported scenario as ${format}` });
      store.setCurrentFormat(format); // Giả định store có setter

      if (!store.keepOpen) {
        onOpenChange(false);
      }
    } catch (error) {
      console.error(error);
      send({ type: "error", message: "Export failed" });
    } finally {
      NProgress.done();
    }
  };

  return (
    <NewSimpleModal
      open={open}
      onOpenChange={onOpenChange}
      dialogTitle="Export scenario"
      className="sm:max-w-xl md:max-w-4xl"
    >
      <p className="text-muted-foreground mt-1 text-sm">
        Export scenario data for use with other software applications and tools
      </p>
      
      <form onSubmit={onExport} className="mt-4 space-y-6">
        {/* Format Selection */}
        <SimpleSelect
          label="Select export format"
          items={formatItems}
          value={form.format}
          onValueChange={(val: string | number | null) => handleUpdateForm({ format: val as ExportFormat })}
        >
          {/* React Slot pattern */}
          <div className="mt-1">
             <DocLink href="https://docs.orbat-mapper.app/guide/export-data" />
          </div>
        </SimpleSelect>

        {/* Format Descriptions */}
        <div className="text-muted-foreground text-sm">
          {isKml && (
            <p>
              KML is a file format used to display data in an Earth browser such
              as Google Earth. Use KMZ if you want to include unit icons.
            </p>
          )}
          {isKmz && (
            <p>
              KMZ is a compressed version of KML. Use this format if you want to
              include unit icons.
            </p>
          )}
        </div>

        {/* Dynamic Settings Components */}
        {format === "xlsx" ? (
          <ExportSettingsXlsx
            format={format}
            settings={form}
            onSettingsChange={handleUpdateForm}
          />
        ) : format === "unitgenerator" ? (
          <ExportSettingsSpatialIllusions
            format={format}
            settings={form}
            onSettingsChange={handleUpdateForm}
          />
        ) : format === "orbatmapper" ? (
          <ExportSettingsOrbatMapper
            form={form}
            onFormChange={handleUpdateForm}
          />
        ) : format === "geojson" ? (
          <ExportSettingsGeoJson
            format={format}
            settings={form}
            onSettingsChange={handleUpdateForm}
          />
        ) : format === "kml" || format === "kmz" ? (
          <ExportSettingsKmlKmz
            format={format}
            form={form}
            onFormChange={handleUpdateForm}
            modelValue={form}
          />
        ) : (
          /* Fallback for other formats (MilX etc) */
          <fieldset className="space-y-4">
            <InputCheckbox
              label="Include units"
              description="Units with a location at current scenario time"
              checked={form.includeUnits}
              onCheckedChange={(val) => handleUpdateForm({ includeUnits: val as boolean })}
            />
            
            {!isMilx && (
              <InputCheckbox
                label="Include scenario features"
                checked={form.includeFeatures}
                onCheckedChange={(val) => handleUpdateForm({ includeFeatures: val as boolean })}
                description=""
              />
            )}

            {isMilx && (
              <InputCheckbox
                label="Use one layer per side"
                checked={form.oneFolderPerSide}
                onCheckedChange={(val) => handleUpdateForm({ oneFolderPerSide: val as boolean })}
              />
            )}
          </fieldset>
        )}

        {/* Warnings */}
        {(isKmz || isKml) && (
          <p className="text-sm">
            Please note that the export functionality is experimental. Scenario
            feature export is currently limited to geometries (no styles).
          </p>
        )}

        {isMilx && (
          <p className="text-sm">
            Please note that the MilX export is experimental. It is currently
            limited and has several bugs.
          </p>
        )}

        {/* Footer */}
        <footer className="flex items-center justify-between space-x-2">
          <ToggleField
            checked={store.keepOpen}
            onCheckedChange={(val) => {
                // Giả định store có method setKeepOpen, hoặc mutate trực tiếp nếu dùng proxy
                if(store.setKeepOpen) store.setKeepOpen(val);
                else store.keepOpen = val; 
            }}
          >
            Keep dialog open on export
          </ToggleField>
          
          <div className="flex items-center space-x-2">
            <Button type="submit" size="sm">
              Export
            </Button>
            <Button variant="outline" size="sm" type="button" onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        </footer>
      </form>
    </NewSimpleModal>
  );
}