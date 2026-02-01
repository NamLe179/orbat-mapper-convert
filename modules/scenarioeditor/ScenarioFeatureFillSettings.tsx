"use client";

import React, { useMemo } from "react";
import {
  defaultFillColor,
  defaultFillOpacity,
  type FillStyleSpec,
  type SimpleStyleSpec,
} from "@/geo/simplestyle";
import { type ScenarioFeature } from "@/types/scenarioGeoModels";
import PopoverColorPicker from "@/components/PopoverColorPicker";
import { Slider } from "@/components/ui/slider";

interface Props {
  feature: ScenarioFeature;
  onUpdate: (value: { style: Partial<SimpleStyleSpec> }) => void;
}

export default function ScenarioFeatureFillSettings({ feature, onUpdate }: Props) {
  // --- Computed (useMemo) ---
  const marker = useMemo(() => {
    const { style } = feature;
    return {
      fill: style["fill"] ?? defaultFillColor,
      "fill-opacity": style["fill-opacity"] ?? defaultFillOpacity,
    };
  }, [feature]);

  const opacityValue = useMemo(() => [marker["fill-opacity"]], [marker]);

  const opacityAsPercent = useMemo(
    () => (opacityValue[0] * 100).toFixed(0),
    [opacityValue]
  );

  // --- Handlers ---
  const updateValue = (name: keyof FillStyleSpec, value: string | number) => {
    onUpdate({ style: { [name]: value } });
  };

  const handleOpacityChange = (val: number[]) => {
    onUpdate({ style: { "fill-opacity": val[0] } });
  };

  return (
    <>
      <div className="col-span-2 -mb-2 font-semibold">Fill</div>
      
      <div className="self-center">Color</div>
      <PopoverColorPicker
        value={marker["fill"]}
        onValueChange={(val: string | null) => updateValue("fill", val || defaultFillColor)}
      />

      

      <label htmlFor="fill-opacity">Opacity</label>
      <div className="grid grid-cols-[1fr_5ch] gap-4 items-center">
        <Slider
          id="fill-opacity"
          value={opacityValue}
          min={0}
          max={1}
          step={0.01}
          className="min-w-20"
          onValueChange={handleOpacityChange}
        />
        <span className="ml-2 text-sm">{opacityAsPercent}%</span>
      </div>
    </>
  );
}