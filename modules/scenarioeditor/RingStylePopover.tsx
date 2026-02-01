"use client";

import React, { useMemo } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";

// Types & Stores
import { type RangeRingStyle } from "@/types/scenarioGeoModels";
import { type SimpleStyleSpec } from "@/geo/simplestyle";
import { useUiStore } from "@/stores/uiStore";

// Components
import DrawRangeRingMarker from "@/components/DrawRangeRingMarker";
import CloseButton from "@/components/CloseButton";
import PopoverColorPicker from "@/components/PopoverColorPicker";

interface Props {
  ringStyle: Partial<RangeRingStyle>;
  disabled?: boolean;
  onUpdate: (update: Partial<RangeRingStyle>) => void;
}

export default function RingStylePopover({ ringStyle, disabled, onUpdate }: Props) {
  const uiStore = useUiStore();

  // Tương đương computed rStyle
  const rStyle = useMemo((): RangeRingStyle => {
    return {
      fill: ringStyle.fill ?? null,
      "fill-opacity": ringStyle["fill-opacity"] ?? 0.5,
      stroke: ringStyle.stroke ?? "#f43f5e",
      "stroke-width": ringStyle["stroke-width"] ?? 2,
      "stroke-opacity": ringStyle["stroke-opacity"] ?? 1,
      "stroke-style": ringStyle["stroke-style"] ?? "solid",
    };
  }, [ringStyle]);

  // Handlers cho việc cập nhật giá trị
  const updateValue = (name: keyof SimpleStyleSpec, value: string | number | null) => {
    onUpdate({ [name]: value });
  };

  const onOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      uiStore.incrementPopper(); // Giả định method của Zustand/Store React
    } else {
      uiStore.decrementPopper();
    }
  };

  const strokeOpacityPercent = (rStyle["stroke-opacity"] * 100).toFixed(0);
  const fillOpacityPercent = (rStyle["fill-opacity"] * 100).toFixed(0);

  return (
    <Popover onOpenChange={onOpenChange}>
      <PopoverTrigger
        title="Change style"
        disabled={disabled}
        className="hover:bg-muted disabled:opacity-50 transition-colors"
      >
        <DrawRangeRingMarker styling={rStyle} />
      </PopoverTrigger>

      <PopoverContent className="relative w-80" side="left" align="start">
        <div className="flex items-center justify-between text-sm font-bold">
          <h3>Set range ring style</h3>
          <div />
        </div>

        {/* Stroke Settings */}
        <section className="text-foreground mt-4 grid w-full grid-cols-[max-content_1fr] gap-4 pb-1 text-sm">
          <div className="col-span-2 -mb-2 font-semibold">Stroke</div>
          
          <div className="flex items-center">Color</div>
          <PopoverColorPicker
            value={rStyle.stroke as string}
            onValueChange={(val: string | null) => updateValue("stroke", val)}
          />

          <label htmlFor="stroke-width">Width</label>
          <div className="grid grid-cols-[1fr_5ch] gap-4 items-center">
            <Slider
              id="stroke-width"
              value={[rStyle["stroke-width"]]}
              min={1}
              max={10}
              step={1}
              onValueChange={([v]) => updateValue("stroke-width", v)}
              className="min-w-20"
            />
            <span className="text-right">{rStyle["stroke-width"]} px</span>
          </div>

          <label htmlFor="stroke-opacity">Opacity</label>
          <div className="grid grid-cols-[1fr_5ch] gap-4 items-center">
            <Slider
              id="stroke-opacity"
              value={[rStyle["stroke-opacity"]]}
              min={0}
              max={1}
              step={0.01}
              onValueChange={([v]) => updateValue("stroke-opacity", v)}
              className="min-w-20"
            />
            <span className="text-right">{strokeOpacityPercent}%</span>
          </div>
        </section>

        {/* Fill Settings */}
        <section className="text-foreground mt-4 grid w-full grid-cols-[max-content_1fr] gap-4 pb-1 text-sm">
          <div className="col-span-2 -mb-2 font-semibold">Fill</div>
          
          <div className="flex items-center">Color</div>
          <PopoverColorPicker
            value={rStyle.fill as string}
            onValueChange={(val: string | null) => updateValue("fill", val)}
            showNone
          />

          <label htmlFor="fill-opacity">Opacity</label>
          <div className="grid grid-cols-[1fr_5ch] gap-4 items-center">
            <Slider
              id="fill-opacity"
              value={[rStyle["fill-opacity"]]}
              min={0}
              max={1}
              step={0.01}
              onValueChange={([v]) => updateValue("fill-opacity", v)}
              className="min-w-20"
            />
            <span className="text-right">{fillOpacityPercent}%</span>
          </div>
        </section>

        <PopoverPrimitive.Close asChild>
          <CloseButton className="absolute top-4 right-4" />
        </PopoverPrimitive.Close>
      </PopoverContent>
    </Popover>
  );
}