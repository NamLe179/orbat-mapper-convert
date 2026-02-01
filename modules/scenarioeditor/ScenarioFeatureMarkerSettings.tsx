"use client";

import React, { useMemo } from "react";
import * as RadioGroup from "@radix-ui/react-radio-group";
import * as Label from "@radix-ui/react-label";
import { cn } from "@/lib/utils"; // Utility merge class

// Types
import type { MarkerStyleSpec, MarkerSymbol, SimpleStyleSpec } from "@/geo/simplestyle";
import type { ScenarioFeature } from "@/types/scenarioGeoModels";
import type { SelectItem } from "@/components/types";

// Components (Giả định đã convert)
import DrawMarker from "@/components/DrawMarker";
import PopoverColorPicker from "@/components/PopoverColorPicker";

interface ScenarioFeatureMarkerSettingsProps {
  feature: ScenarioFeature;
  onUpdate?: (value: { style: Partial<SimpleStyleSpec> }) => void;
}

// Constants
const sizeOptions = [
  { name: "S", value: "small" },
  { name: "M", value: "medium" },
  { name: "L", value: "large" },
];

const markerItems: SelectItem<MarkerSymbol>[] = [
  { label: "Circle", value: "circle" },
  { label: "Cross", value: "cross" },
  { label: "Hexagon", value: "hexagon" },
  { label: "Pentagon", value: "pentagon" },
  { label: "Star", value: "star" },
  { label: "Square", value: "square" },
  { label: "Triangle", value: "triangle" },
  { label: "X", value: "x" },
];

export default function ScenarioFeatureMarkerSettings({
  feature,
  onUpdate,
}: ScenarioFeatureMarkerSettingsProps) {
  // --- Computed ---
  const marker = useMemo((): Partial<MarkerStyleSpec> => {
    const { style } = feature;
    return {
      "marker-color": style["marker-color"] || "black",
      "marker-symbol": style["marker-symbol"] || "circle",
      "marker-size": style["marker-size"] || "medium",
    };
  }, [feature]);

  // --- Handlers ---
  const updateValue = (name: keyof MarkerStyleSpec, value: string) => {
    if (!onUpdate) return;

    if (name === "marker-color") {
      onUpdate({
        style: {
          fill: value,
          stroke: value,
          "marker-color": value,
        },
      });
    } else {
      onUpdate({ style: { [name]: value } });
    }
  };

  return (
    <>
      {/* Header */}
      <div className="col-span-2 -mb-2 font-semibold">Symbol</div>

      {/* Color Picker Section */}
      <div className="self-center">Color</div>
      <PopoverColorPicker
        value={marker["marker-color"]}
        onValueChange={(val: string | null) => val && updateValue("marker-color", val)}
      />

      {/* Size Selection Section */}
      <div className="self-center">Size</div>
      <RadioGroup.Root
        className=""
        value={marker["marker-size"]}
        onValueChange={(val) => updateValue("marker-size", val)}
      >
        <Label.Root className="sr-only">Select marker size</Label.Root>
        <div className="flex flex-wrap items-center gap-2">
          {sizeOptions.map((option) => (
            <RadioGroup.Item
              key={option.name}
              value={option.value}
              className={cn(
                "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2",
                "data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:hover:bg-primary/90",
                "bg-muted text-foreground border-border hover:bg-muted/90 border",
                "flex cursor-pointer items-center justify-center rounded-md px-5 py-3 text-sm font-semibold uppercase focus:outline-none"
              )}
            >
              <span>{option.name}</span>
            </RadioGroup.Item>
          ))}
        </div>
      </RadioGroup.Root>

      {/* Shape Selection Section */}
      <div className="self-center">Shape</div>

      <RadioGroup.Root
        className="mt-2"
        value={marker["marker-symbol"]}
        onValueChange={(val) => updateValue("marker-symbol", val)}
      >
        <div className="flex flex-wrap items-center gap-1">
          {markerItems.map((option) => (
            <RadioGroup.Item
              key={option.value}
              value={option.value}
              className={cn(
                "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2",
                "data-[state=checked]:bg-primary/80 data-[state=checked]:text-primary-foreground data-[state=checked]:hover:bg-primary",
                "bg-muted text-foreground hover:bg-muted/90",
                "flex cursor-pointer items-center justify-center rounded-md px-2 py-2 text-sm font-semibold uppercase focus:outline-none"
              )}
            >
              <span className="sr-only">{option.label}</span>
              <span aria-hidden="true">
                <DrawMarker
                  marker={option.value}
                  color={marker["marker-color"]}
                />
              </span>
            </RadioGroup.Item>
          ))}
        </div>
      </RadioGroup.Root>
    </>
  );
}