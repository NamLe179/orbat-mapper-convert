"use client";

import React, { useState, memo } from "react";
import { ChevronUp, Plus } from "lucide-react";

// UI Components (Shadcn React)
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

// Custom Hooks & Stores
import { useToolbarUnitSymbolData } from "@/hooks/mainToolbarData";
import { useMainToolbarStore } from "@/stores/mainToolbarStore";
import { useSidcModal } from "@/components/injects";

// Types
import { type UnitSymbolOptions } from "@/types/scenarioModels";
import type { MenuItemData } from "@/components/types";

// Internal Components
import PanelSymbolButton from "@/components/PanelSymbolButton";
import DotsMenu from "@/components/DotsMenu";
import NewMilitarySymbol from "@/components/NewMilitarySymbol";
import { cn } from "@/lib/utils";

interface SymbolPickerPopoverProps {
  symbolOptions: UnitSymbolOptions;
  addUnit: (sidc: string) => void;
}

const SymbolPickerPopover = memo(function SymbolPickerPopover({
  symbolOptions,
  addUnit,
}: SymbolPickerPopoverProps) {
  // --- Hooks & Context ---
  const sidcModal = useSidcModal();
  const store = useMainToolbarStore();
  const { iconItems, customIcon, customSidc, symbolPage, useToolbarStore } = useToolbarUnitSymbolData();

  // --- Local State ---
  const [isOpen, setIsOpen] = useState(false);
  
  // Access symbolPage setter from the store
  const setSymbolPage = (page: string) => {
    useToolbarStore.setState({ symbolPage: page as any });
  };

  const symbolTabs = [
    { title: "Land", sidc: "30031000001211000000", id: "land" },
    { title: "Sea", sidc: "10033000001201000000", id: "sea" },
    { title: "Air", sidc: "30030100001101000000", id: "air" },
  ];

  // --- Handlers ---
  const handleChangeSymbol = async () => {
    if (!sidcModal?.getModalSidc) return;
    
    const newSidcValue = await sidcModal.getModalSidc(customSidc, {
      title: "Select symbol",
      hideModifiers: true,
      hideSymbolColor: true,
      symbolOptions: symbolOptions,
    });

    if (newSidcValue !== undefined) {
      customIcon.code = newSidcValue.sidc;
      addUnit(customSidc);
      setIsOpen(false);
    }
  };

  const onAddUnit = (sidc: string) => {
    addUnit(sidc);
    setIsOpen(false);
  };

  const panelItems: MenuItemData[] = [
    { label: "Add symbol to panel", action: () => handleChangeSymbol() },
  ];

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          title="Select icons"
          onClick={() => store.clearToolbar()}
        >
          <ChevronUp
            className={cn(
              "size-6 transition-all",
              isOpen && "scale-150 text-red-800"
            )}
          />
        </Button>
      </PopoverTrigger>

      

      <PopoverContent
        className="p-2 px-1 w-[500px]"
        align="center"
        side="top"
        sideOffset={10}
        onKeyDown={(e) => {
          if (e.key === "Escape") setIsOpen(false);
        }}
      >
        <Tabs value={symbolPage} onValueChange={setSymbolPage} className="w-full">
          <TabsList className="border-border flex h-10 w-full">
            {symbolTabs.map(({ id, title, sidc }) => (
              <TabsTrigger
                key={id}
                value={id}
                title={title}
                className="flex-1"
              >
                <NewMilitarySymbol
                  sidc={sidc}
                  size={15}
                  className="size-6"
                  options={{
                    monoColor: "currentColor",
                    strokeWidth: 8,
                  }}
                />
              </TabsTrigger>
            ))}
            <DotsMenu items={panelItems} className="ml-1" />
          </TabsList>
        </Tabs>

        <div className="mt-3 grid gap-2" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
          {iconItems.map(({ sidc, text }) => (
            <PanelSymbolButton
              key={sidc}
              sidc={sidc}
              size={50}
              title={text}
              symbolOptions={symbolOptions}
              onClick={() => onAddUnit(sidc)}
              className="w-full"
            />
          ))}
          
          <PanelSymbolButton
            sidc={customSidc}
            size={50}
            title={customIcon.text}
            symbolOptions={symbolOptions}
            onClick={() => onAddUnit(customSidc)}
            className="w-full"
          />

          <Button
            variant="ghost"
            size="icon"
            type="button"
            onClick={handleChangeSymbol}
            title="Add symbol"
            className="w-full"
          >
            <Plus className="size-6" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
});

export default SymbolPickerPopover;