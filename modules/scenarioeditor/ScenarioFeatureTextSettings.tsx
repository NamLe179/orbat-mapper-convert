"use client";

import React, { useMemo } from "react";

// Types
import type { SimpleStyleSpec, TextStyleSpec } from "@/geo/simplestyle";
import type { ScenarioFeature } from "@/types/scenarioGeoModels";

// Components
import ToggleField from "@/components/ToggleField";
import SimpleSelect from "@/components/SimpleSelect";
import NumberInputGroup from "@/components/NumberInputGroup";
import ZoomSelector from "@/components/ZoomSelector";

interface Props {
  feature: ScenarioFeature;
  onUpdate: (value: { style: Partial<SimpleStyleSpec> }) => void;
}

const PLACEMENTS = [
  { label: "Point", value: "point" },
  { label: "Line", value: "line" },
];

const ALIGNMENTS = [
  { label: "Left", value: "left" },
  { label: "Center", value: "center" },
  { label: "Right", value: "right" },
  { label: "Start", value: "start" },
  { label: "End", value: "end" },
];

export default function ScenarioFeatureTextSettings({ feature, onUpdate }: Props) {
  // --- Computed: marker ---
  const marker = useMemo((): Partial<TextStyleSpec> => {
    const { style = {} } = feature;
    return {
      showLabel: style["showLabel"] ?? false,
      "text-placement": style["text-placement"] || "point",
      "text-align": style["text-align"] || "center",
      "text-offset-x": style["text-offset-x"] ?? 15,
      "text-offset-y": style["text-offset-y"] ?? 0,
      textMinZoom: style["textMinZoom"] ?? 0,
      textMaxZoom: style["textMaxZoom"] ?? 24,
    };
  }, [feature]);

  // --- Computed: range ---
  const range = useMemo((): [number, number] => [
    marker.textMinZoom ?? 0,
    marker.textMaxZoom ?? 24,
  ], [marker.textMinZoom, marker.textMaxZoom]);

  // --- Handlers ---
  const updateValue = (
    name: keyof TextStyleSpec,
    value?: boolean | number | string | null
  ) => {
    onUpdate({ style: { [name]: value } });
  };

  const handleRangeChange = (v: [number, number]) => {
    onUpdate({ 
      style: { 
        textMinZoom: Number(v[0]), 
        textMaxZoom: Number(v[1]) 
      } 
    });
  };

  return (
    <>
      <div className="col-span-2 -mb-6 font-semibold">Text</div>
      <div className="self-end">Label</div>
      <div className="mt-4">
        <ToggleField
          checked={marker.showLabel}
          onCheckedChange={(val: string | boolean) => updateValue("showLabel", !!val)}
        />
      </div>

      {marker.showLabel && (
        <>
          
          
          <div>Zoom levels</div>
          <div className="mt-4 flex-auto">
            <ZoomSelector 
              value={range} 
              onValueChange={handleRangeChange} 
            />
          </div>

          <div className="self-center">Placement</div>
          <SimpleSelect
            value={marker["text-placement"]}
            onValueChange={(val: string | number | null) => updateValue("text-placement", val as string)}
            items={PLACEMENTS}
            className="max-w-[10rem]"
          />

          <div className="self-center">Alignment</div>
          <SimpleSelect
            value={marker["text-align"]}
            onValueChange={(val: string | number | null) => updateValue("text-align", val as string)}
            items={ALIGNMENTS}
            className="max-w-[10rem]"
          />

          <div className="self-center">Offset X</div>
          <NumberInputGroup
            value={marker["text-offset-x"]}
            onValueChange={(val: number) => updateValue("text-offset-x", val)}
            className="max-w-[10rem]"
          />

          <div className="self-center">Offset Y</div>
          <NumberInputGroup
            value={marker["text-offset-y"]}
            onValueChange={(val: number) => updateValue("text-offset-y", val)}
            className="max-w-[10rem]"
          />
        </>
      )}
    </>
  );
}