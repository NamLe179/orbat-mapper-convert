"use client";

import React, { useMemo, useEffect } from "react";
import { type ExportFormat, type ExportSettings, type KmlKmzExportSettings } from "@/types/importExport";
import InputCheckbox from "@/components/InputCheckbox";
import { Slider } from "@/components/ui/slider";
import InputGroupTemplate from "@/components/InputGroupTemplate";
import NewAccordionPanel from "@/components/NewAccordionPanel";
import MRadioGroup from "@/components/MRadioGroup";
import InputRadio from "@/components/InputRadio";
import SimpleSelect from "@/components/SimpleSelect";
import { Button } from "@/components/ui/button";

import { useSelectedItems } from "@/stores/selectedStore";
import { useTimeFormatters } from "@/stores/timeFormatStore";
import { useActiveScenario } from "@/components/injects";

interface ExportSettingsKmlKmzProps {
  format: ExportFormat;
  modelValue: ExportSettings; // Props này có trong Vue nhưng ít dùng, giữ để đúng interface
  
  // Controlled State cho form settings
  form: KmlKmzExportSettings;
  onFormChange: (settings: KmlKmzExportSettings) => void;
}

export default function ExportSettingsKmlKmz({
  format,
  form,
  onFormChange,
}: ExportSettingsKmlKmzProps) {
  
  // --- Hooks & Context ---
  const { store, time } = useActiveScenario();
  const { scenarioFormatter } = useTimeFormatters();
  const { selectedUnitIds } = useSelectedItems();

  const currentTime = store.state.currentTime;
  // --- Helpers Update State ---
  const updateForm = (key: keyof KmlKmzExportSettings, value: any) => {
    onFormChange({ ...form, [key]: value });
  };

  // --- Computed (useMemo) ---
  const formattedTime = useMemo(() => {
    return scenarioFormatter.format(currentTime);
  }, [scenarioFormatter, currentTime]);

  const isKml = format === "kml";
  const isKmz = format === "kmz";

  const events = useMemo(() => {
    return store.state.events
      .map((e) => store.state.eventMap[e])
      .sort((a, b) => (a.startTime < b.startTime ? -1 : 1))
      .map((e) => ({
        label: `${scenarioFormatter.format(e.startTime)} - ${e.title}`,
        value: e.id,
      }));
  }, [store.state.events, store.state.eventMap, scenarioFormatter]);

  // --- Effects (Initialization Logic) ---
  useEffect(() => {
    let hasChanges = false;
    let newForm = { ...form };

    // 1. Validate exportEventId
    if (!events.some((e) => e.value === newForm.exportEventId)) {
      newForm.exportEventId = events[0]?.value;
      hasChanges = true;
    }

    // 2. Validate exportEventIds array
    if (!Array.isArray(newForm.exportEventIds)) {
      newForm.exportEventIds = [];
      hasChanges = true;
    } else {
      const filtered = newForm.exportEventIds.filter((id) =>
        events.some((e) => e.value === id)
      );
      if (filtered.length !== newForm.exportEventIds.length) {
        newForm.exportEventIds = filtered;
        hasChanges = true;
      }
    }

    if (hasChanges) {
      onFormChange(newForm);
    }
  }, [events]); // Chỉ chạy khi danh sách events thay đổi (hoặc mount)

  // --- Handlers ---

  const toggleAllEvents = () => {
    if (form.exportEventIds?.length === events.length) {
      updateForm("exportEventIds", []);
    } else {
      updateForm("exportEventIds", events.map((e) => e.value));
    }
  };

  // Xử lý checkbox list cho mảng Event IDs
  const handleEventSelection = (id: string, checked: boolean) => {
    const currentIds = form.exportEventIds || [];
    if (checked) {
      updateForm("exportEventIds", [...currentIds, id]);
    } else {
      updateForm("exportEventIds", currentIds.filter((eid) => eid !== id));
    }
  };

  return (
    <fieldset className="space-y-4">
      {/* --- Main Grid --- */}
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        <InputCheckbox
          label="Include units"
          description="Units with a location at current scenario time"
          checked={form.includeUnits}
          onCheckedChange={(v) => updateForm("includeUnits", v === true)}
        />
        
        {form.includeUnits ? (
          <InputCheckbox
            label={`Include selected units only (${selectedUnitIds.size})`}
            description="Selected units with a location"
            checked={form.includeSelectedUnitsOnly}
            onCheckedChange={(v) => updateForm("includeSelectedUnitsOnly", v === true)}
          />
        ) : (
          <div />
        )}

        <InputCheckbox
          label="Include scenario features"
          description=""
          checked={form.includeFeatures}
          onCheckedChange={(v) => updateForm("includeFeatures", v === true)}
        />

        {(isKml || isKmz) && (
          <InputCheckbox
            label="Use short unit names"
            checked={form.useShortName}
            onCheckedChange={(v) => updateForm("useShortName", v === true)}
          />
        )}

        {isKmz && (
          <InputCheckbox
            label="Include unit icons"
            description="Embed icons as images"
            checked={form.embedIcons}
            onCheckedChange={(v) => updateForm("embedIcons", v === true)}
          />
        )}

        <InputGroupTemplate className="col-span-full" label="Folder settings">
          <MRadioGroup 
            className="mt-4 sm:flex sm:gap-6"
          >
            <InputRadio value="one">One folder</InputRadio>
            <InputRadio value="side">One per side</InputRadio>
            <InputRadio value="sideGroup">Side and groups (nested)</InputRadio>
          </MRadioGroup>
        </InputGroupTemplate>
      </div>

      {/* --- Sliders Grid --- */}
      <div className="mt-6 grid grid-cols-1 gap-8 sm:grid-cols-2">
        <InputGroupTemplate 
            label="Label scale"
            description="Setting it to 0 will hide the label"
            hint={<span className="text-sm font-medium">{form.labelScale ?? 1}x</span>}
        >
          <Slider
            value={[form.labelScale ?? 1]}
            min={0}
            max={2}
            step={0.1}
            onValueChange={([val]) => updateForm("labelScale", val)}
            className="mt-4"
          />
        </InputGroupTemplate>

        <InputGroupTemplate 
            label="Icon scale"
            description="A scale of 1 is approximately 32x32 pixels"
            hint={<span className="text-sm font-medium">{form.iconScale ?? 1}x</span>}
        >
          <Slider
            value={[form.iconScale ?? 1]}
            min={0.5}
            max={3}
            step={0.1}
            onValueChange={([val]) => updateForm("iconScale", val)}
            className="mt-4"
          />
        </InputGroupTemplate>
      </div>

      {/* --- Time Mode Accordion --- */}
      <NewAccordionPanel label="Time mode" defaultOpen>
        <MRadioGroup 
            className="mt-2 sm:flex sm:gap-6"
        >
          <InputRadio value="current">Current time ({formattedTime})</InputRadio>
          <InputRadio value="event">Event</InputRadio>
          <InputRadio value="multiple">Multiple events</InputRadio>
        </MRadioGroup>

        {form.timeMode === "event" && (
          <SimpleSelect
            className="mt-4"
            label="Select event"
            items={events}
            value={form.exportEventId}
            onValueChange={(v) => updateForm("exportEventId", v)}
          />
        )}

        {form.timeMode === "multiple" && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-4">
              <Button type="button" variant="outline" size="sm" onClick={toggleAllEvents}>
                Toggle all
              </Button>
              <InputCheckbox
                label="Use radio folder"
                description="Only one event visible at a time"
                checked={form.useRadioFolder}
                onCheckedChange={(v) => updateForm("useRadioFolder", v === true)}
              />
            </div>
            
            {/* List Events Checkboxes */}
            {events.map((e) => (
              <InputCheckbox
                key={e.value}
                label={e.label}
                checked={form.exportEventIds?.includes(e.value)}
                onCheckedChange={(checked) => handleEventSelection(e.value, checked === true)}
              />
            ))}
          </div>
        )}
      </NewAccordionPanel>

      {/* --- Advanced Settings Accordion --- */}
      {isKmz && (
        <NewAccordionPanel label="Advanced settings" defaultOpen>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
            <InputCheckbox
              label="Draw symbol outline"
              description="Improves visibility"
              checked={form.drawSymbolOutline}
              onCheckedChange={(v) => updateForm("drawSymbolOutline", v === true)}
            />
            <InputCheckbox
              label="Render symbol amplifiers"
              description="Warning: will increase file size"
              checked={form.renderAmplifiers}
              onCheckedChange={(v) => updateForm("renderAmplifiers", v === true)}
            />
          </div>
        </NewAccordionPanel>
      )}
    </fieldset>
  );
}