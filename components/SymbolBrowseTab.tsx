"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/20/solid";
import { groupBy } from "@/utils";
import { useSymbolItems } from "@/hooks/symbolData";
import { useSymbolSettingsStore } from "@/stores/settingsStore";
import { type UnitSymbolOptions } from "@/types/scenarioModels";

// Components
import MilSymbol from "./NewMilitarySymbol";
import SymbolCodeSelect from "./SymbolCodeSelect";

interface SymbolBrowseTabProps {
  initialSidc: string;
  symbolSize?: number;
  symbolOptions?: UnitSymbolOptions;
  onUpdateSidc?: (sidc: string) => void;
}

// Giả định hook useDebounce đơn giản
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function SymbolBrowseTab({
  initialSidc,
  symbolSize = 32,
  symbolOptions,
  onUpdateSidc,
}: SymbolBrowseTabProps) {
  // --- State ---
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebounce(searchQuery, 100);
  const inputRef = useRef<HTMLInputElement>(null);

  // --- Composables (Giả định hook này đã được viết lại cho React) ---
  const {
    mod1Items,
    mod2Items,
    mod1Value,
    setMod1Value,
    mod2Value,
    setMod2Value,
    symbolSets,
    symbolSetValue,
    setSymbolSetValue,
    icons,
    iconValue,
    setIconValue,
    csidc,
    isLoaded,
    loadData,
  } = useSymbolItems(initialSidc);

  // Get symbology standard from settings
  const { symbologyStandard } = useSymbolSettingsStore();

  // Load data if not loaded
  useEffect(() => {
    if (!isLoaded) loadData(symbologyStandard);
  }, [isLoaded, loadData, symbologyStandard]);

  // --- Computed (useMemo) ---
  const filteredIconsByEntity = useMemo(() => {
    if (!debouncedQuery.trim()) return groupBy(icons, "entity");
    const query = debouncedQuery.toLowerCase();
    const filtered = icons.filter((icon) => {
      return (
        icon.entityType?.toLowerCase().includes(query) ||
        icon.entitySubtype?.toLowerCase().includes(query)
      );
    });
    return groupBy(filtered, "entity");
  }, [icons, debouncedQuery]);

  const filteredMod1Items = useMemo(() => {
    if (!debouncedQuery.trim()) return mod1Items;
    const query = debouncedQuery.toLowerCase();
    return mod1Items.filter((item) => item.text.toLowerCase().includes(query));
  }, [mod1Items, debouncedQuery]);

  const filteredMod2Items = useMemo(() => {
    if (!debouncedQuery.trim()) return mod2Items;
    const query = debouncedQuery.toLowerCase();
    return mod2Items.filter((item) => item.text.toLowerCase().includes(query));
  }, [mod2Items, debouncedQuery]);

  // --- Watch (useEffect) ---
  useEffect(() => {
    if (onUpdateSidc) onUpdateSidc(csidc);
  }, [mod1Value, mod2Value, iconValue, csidc, onUpdateSidc]);

  // --- Handlers ---
  const goTo = (sidc: string) => {
    const el = document.getElementById(`scode-${sidc}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const onEsc = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && searchQuery.length) {
      e.stopPropagation();
      setSearchQuery("");
    }
  };

  return (
    <div className="flex px-0.5">
      {/* Sidebar - Hidden on mobile */}
      <aside className="hidden w-60 flex-none pr-2 md:block">
        <p className="text-sm leading-7 font-bold">Entity type</p>
        <ul className="dark:text-muted-foreground space-y-1.5 text-sm font-medium">
          {Object.entries(filteredIconsByEntity).map(([entity, entityIcons]) => (
            <li key={entity} className="hover:text-muted-foreground/80">
              <button
                type="button"
                className="text-left"
                onClick={() => goTo((entityIcons as any[])[0].code)}
              >
                {entity}
              </button>
            </li>
          ))}
        </ul>

        <p className="mt-4 text-sm leading-7 font-bold">Modifiers</p>
        <ul className="text-muted-foreground space-y-1.5 text-sm font-medium">
          {filteredMod1Items.length > 0 && (
            <li className="hover:text-muted-foreground/80">
              <button type="button" onClick={() => goTo("mod1")}>
                Modifier 1
              </button>
            </li>
          )}
          {filteredMod2Items.length > 0 && (
            <li className="hover:text-muted-foreground/80">
              <button type="button" onClick={() => goTo("mod2")}>
                Modifier 2
              </button>
            </li>
          )}
        </ul>
      </aside>

      {/* Main Content */}
      <div className="flex-auto">
        <div className="relative">
          <MagnifyingGlassIcon
            className="text-muted-foreground pointer-events-none absolute top-3.5 left-0 h-5 w-5"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="text"
            className="placeholder:text-muted-foreground h-12 w-full border-0 bg-transparent pr-4 pl-7 focus:ring-0 sm:text-sm"
            placeholder="Search symbol set..."
            value={searchQuery}
            onKeyDown={onEsc}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <SymbolCodeSelect
          value={symbolSetValue}
          onValueChange={(val: string | null) => val !== null && setSymbolSetValue(val)}
          items={symbolSets}
          symbolOptions={symbolOptions}
          label="Symbol set"
        />

        <div className="mt-4 max-h-[40vh] overflow-auto border rounded-md">
          {Object.entries(filteredIconsByEntity).map(([entity, entityIcons]) => (
            <div key={entity} className="relative">
              <h3
                className="bg-popover border-border sticky top-0 z-10 border-t border-b p-2 px-4 text-sm font-medium"
                id={entity}
              >
                {entity}
              </h3>
              <div className="mt-4 grid grid-cols-3 gap-x-2 gap-y-4 p-1">
                {(entityIcons as any[]).map((icon) => (
                  <button
                    key={icon.sidc}
                    id={`scode-${icon.code}`}
                    type="button"
                    onClick={() => setIconValue(icon.code)}
                    className="flex w-full scroll-m-12 flex-col items-center justify-start rounded border border-transparent p-3 hover:border-gray-500 transition-colors"
                  >
                    <MilSymbol
                      size={symbolSize}
                      sidc={icon.sidc}
                      modifiers={symbolOptions}
                    />
                    {icon.entitySubtype && icon.entityType && (
                      <p className="text-muted-foreground mt-1 max-w-full truncate overflow-hidden text-center text-xs">
                        {icon.entityType}
                      </p>
                    )}
                    <p
                      className={`mt-1 max-w-full overflow-hidden text-center text-sm font-medium break-words ${
                        icon.code === iconValue
                          ? "bg-primary text-primary-foreground px-1 rounded"
                          : ""
                      }`}
                    >
                      {icon.entitySubtype || icon.entityType || entity}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Modifier 1 Section */}
          <h3 className="border-border bg-muted sticky top-0 z-10 border-t border-b p-2 px-4 text-sm font-medium">
            Modifier 1
          </h3>
          <div
            id="scode-mod1"
            className="mt-4 grid scroll-m-12 grid-cols-3 gap-x-2 gap-y-4 p-1"
          >
            {filteredMod1Items.map((item) => (
              <button
                key={item.sidc}
                type="button"
                onClick={() => setMod1Value(item.code)}
                className="flex w-full flex-col items-center justify-start rounded border border-transparent p-4 hover:border-gray-500"
              >
                <MilSymbol
                  size={symbolSize}
                  sidc={item.sidc}
                  modifiers={symbolOptions}
                />
                <p className="mt-1 max-w-full overflow-hidden text-center text-sm break-words">
                  {item.text}
                </p>
              </button>
            ))}
          </div>

          {/* Modifier 2 Section */}
          <h3 className="bg-muted border-border sticky top-0 z-10 border-t border-b p-2 px-4 text-sm font-medium">
            Modifier 2
          </h3>
          <div
            id="scode-mod2"
            className="mt-4 grid scroll-m-12 grid-cols-3 gap-x-2 gap-y-4 p-1"
          >
            {filteredMod2Items.map((item) => (
              <button
                key={item.sidc}
                type="button"
                onClick={() => setMod2Value(item.code)}
                className="flex w-full flex-col items-center justify-start rounded border border-transparent p-4 hover:border-gray-500"
              >
                <MilSymbol
                  size={symbolSize}
                  sidc={item.sidc}
                  modifiers={symbolOptions}
                />
                <p className="mt-1 max-w-full overflow-hidden text-center text-sm break-words">
                  {item.text}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}