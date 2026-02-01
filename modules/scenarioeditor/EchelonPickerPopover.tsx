"use client";

import React, { useState, memo } from "react";

// UI Components (Shadcn UI / Radix)
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Custom Hooks & Types
import { useToolbarUnitSymbolData } from "@/hooks/mainToolbarData";
import { type UnitSymbolOptions } from "@/types/scenarioModels";

// Internal Components
import PanelSymbolButton from "@/components/PanelSymbolButton";

interface EchelonPickerPopoverProps {
  symbolOptions: UnitSymbolOptions;
  selectEchelon: (sidc: string) => void;
}

const EchelonPickerPopover = memo(function EchelonPickerPopover({
  symbolOptions,
  selectEchelon,
}: EchelonPickerPopoverProps) {
  // --- State ---
  const [isOpen, setIsOpen] = useState(false);

  // --- Composables (Giả định hook này đã được convert sang React) ---
  const { echelonSidc, emtItems } = useToolbarUnitSymbolData();

  // --- Handlers ---
  const handleSelect = (sidc: string) => {
    selectEchelon(sidc);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <PanelSymbolButton
          size={20}
          sidc={echelonSidc || ""}
          symbolOptions={symbolOptions}
          title="Select echelon"
        />
      </PopoverTrigger>

      

      <PopoverContent
        className="w-auto max-w-[400px] p-2"
        align="center"
        side="top"
        sideOffset={10}
      >
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
          {emtItems.map(({ sidc, text }) => (
            <PanelSymbolButton
              key={sidc}
              className="w-full"
              size={50}
              sidc={sidc}
              title={text}
              symbolOptions={symbolOptions}
              onClick={() => handleSelect(sidc)}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
});

export default EchelonPickerPopover;