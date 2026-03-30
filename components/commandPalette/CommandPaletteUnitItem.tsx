import React from "react";
import { type UnitSearchResult } from "@/components/types";
import UnitSymbol from "@/components/UnitSymbol"; 
import { getUnitRuntimeState } from "@/scenariostore/runtimeState";

interface CommandPaletteUnitItemProps {
  item: UnitSearchResult;
}

export default function CommandPaletteUnitItem({ item }: CommandPaletteUnitItemProps) {
  return (
    <>
      {/* Icon Section */}
      <div className="relative flex w-7 justify-center">
        {item.sidc && (
          <UnitSymbol
            sidc={item.sidc}
            size={20}
            aria-hidden="true"
            modifiers={{
              ...item.symbolOptions,
              outlineColor: "white",
              outlineWidth: 8,
            }}
            className="size-8"
          />
        )}
        
        {getUnitRuntimeState(String(item.id))?.location && (
          <span className="absolute -right-1 bottom-0 block translate-x-1/2 translate-y-1/2 transform rounded-full border-2 border-white">
            <span className="block h-1.5 w-1.5 rounded-full bg-red-800" />
          </span>
        )}
      </div>

      {/* Name Section (Highlight) */}
      <p
        className="ml-3 flex-auto truncate"
        dangerouslySetInnerHTML={{
          __html: item.highlight ? item.highlight : item.name,
        }}
      />

      {/* Parent Section */}
      {item.parent && (
        <p className="flex text-xs opacity-80">
          {item.parent.sidc && (
            <UnitSymbol
              size={12}
              sidc={item.parent.sidc}
              modifiers={{
                ...item.parent.symbolOptions,
                outlineColor: "white",
                outlineWidth: 4,
              }}
              className="mr-1"
            />
          )}
          {item.parent.name}
        </p>
      )}
    </>
  );
}