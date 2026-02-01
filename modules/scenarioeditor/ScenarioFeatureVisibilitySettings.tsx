"use client";

import React, { useMemo } from "react";

// Types
import type { SimpleStyleSpec, VisibilityStyleSpec } from "@/geo/simplestyle";
import { type ScenarioFeature } from "@/types/scenarioGeoModels";

// Components
import ToggleField from "@/components/ToggleField";
import ZoomSelector from "@/components/ZoomSelector";

interface Props {
  feature: ScenarioFeature;
  onUpdate: (value: { style: Partial<SimpleStyleSpec> }) => void;
}

export default function ScenarioFeatureVisibilitySettings({ feature, onUpdate }: Props) {
  // --- Computed: marker (Tương đương computed trong Vue) ---
  const marker = useMemo((): Partial<VisibilityStyleSpec> => {
    const { style = {} } = feature;
    return {
      limitVisibility: style["limitVisibility"] ?? false,
      minZoom: style["minZoom"] ?? 0,
      maxZoom: style["maxZoom"] ?? 24,
    };
  }, [feature]);

  // --- Computed: range (Getter/Setter logic) ---
  const range = useMemo((): [number, number] => [
    marker.minZoom ?? 0, 
    marker.maxZoom ?? 24
  ], [marker.minZoom, marker.maxZoom]);

  // --- Handlers ---
  const updateValue = (name: keyof VisibilityStyleSpec, value: boolean | number | string) => {
    onUpdate({ style: { [name]: value } });
  };

  const handleRangeChange = (v: [number, number]) => {
    onUpdate({ 
      style: { 
        minZoom: Number(v[0]), 
        maxZoom: Number(v[1]) 
      } 
    });
  };

  return (
    <>
      <div className="col-span-2 mt-2 -mb-6 font-semibold text-sm">Visibility</div>
      
      <div className="self-end text-sm">Limit</div>
      <div className="mt-4">
        <ToggleField
          checked={marker.limitVisibility}
          onCheckedChange={(val: string | boolean) => updateValue("limitVisibility", !!val)}
        />
      </div>

      {marker.limitVisibility && (
        <>
          <div className="text-sm">Zoom levels</div>
          
          
          
          <div className="mt-4 flex-auto">
            <ZoomSelector 
              value={range} 
              onValueChange={handleRangeChange} 
            />
          </div>
        </>
      )}
    </>
  );
}