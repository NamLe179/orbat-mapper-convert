"use client";

import React, { useMemo } from "react";

// Types
import type { 
  SimpleStyleSpec, 
  StrokeStyleSpec, 
  TextStyleSpec 
} from "@/geo/simplestyle";
import {
  defaultStrokeColor,
  defaultStrokeOpacity,
  defaultStrokeWidth,
} from "@/geo/simplestyle";
import type { ScenarioFeature } from "@/types/scenarioGeoModels";

// Components
import PopoverColorPicker from "@/components/PopoverColorPicker";
import { Slider } from "@/components/ui/slider";
import NewSelect from "@/components/NewSelect";

interface Props {
  feature: ScenarioFeature;
  onUpdate: (value: { style: Partial<SimpleStyleSpec> }) => void;
}

export default function ScenarioFeatureStrokeSettings({ feature, onUpdate }: Props) {
  // --- Computed (useMemo) ---
  const marker = useMemo(() => {
    const { style } = feature;
    return {
      stroke: style["stroke"] ?? defaultStrokeColor,
      "stroke-width": style["stroke-width"] ?? defaultStrokeWidth,
      "stroke-opacity": style["stroke-opacity"] ?? defaultStrokeOpacity,
      "stroke-style": style["stroke-style"] ?? "solid",
    };
  }, [feature]);

  const opacityAsPercent = useMemo(
    () => (marker["stroke-opacity"] * 100).toFixed(0),
    [marker]
  );

  // --- Handlers ---
  const updateValue = (
    name: keyof (StrokeStyleSpec & TextStyleSpec),
    value: string | number | boolean
  ) => {
    onUpdate({ style: { [name]: value } });
  };

  return (
    <>
      <div className="col-span-2 -mb-2 font-semibold">Stroke</div>

      

      <div className="self-center">Color</div>
      <PopoverColorPicker
        value={marker.stroke}
        onValueChange={(val: string | null) => updateValue("stroke", val || defaultStrokeColor)}
      />

      <label htmlFor="stroke-width">Width</label>
      <div className="grid grid-cols-[1fr_5ch] gap-4 items-center">
        <Slider
          id="stroke-width"
          value={[marker["stroke-width"]]}
          min={1}
          max={10}
          step={1}
          onValueChange={([v]) => updateValue("stroke-width", v)}
          className="min-w-20"
        />
        <span className="text-sm">{marker["stroke-width"]} px</span>
      </div>

      <label htmlFor="stroke-opacity">Opacity</label>
      <div className="grid grid-cols-[1fr_5ch] gap-4 items-center">
        <Slider
          id="stroke-opacity"
          value={[marker["stroke-opacity"]]}
          min={0}
          max={1}
          step={0.01}
          onValueChange={([v]) => updateValue("stroke-opacity", v)}
          className="min-w-20"
        />
        <span className="text-sm">{opacityAsPercent}%</span>
      </div>

      <label htmlFor="stroke-style" className="self-center">Style</label>
      <div className="grid grid-cols-[1fr_5ch] gap-4">
        <NewSelect
          value={marker["stroke-style"]}
          onValueChange={(val: string | number | null) => updateValue("stroke-style", val || "solid")}
          items={[
            { label: "Solid", value: "solid" },
            { label: "Dashed", value: "dashed" },
            { label: "Dotted", value: "dotted" },
          ]}
        />
      </div>
    </>
  );
}