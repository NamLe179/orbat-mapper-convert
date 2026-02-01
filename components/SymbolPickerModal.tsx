"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { MagnifyingGlassIcon } from "@heroicons/react/20/solid";
import { useDebounceValue, useMediaQuery } from "usehooks-ts";
import NProgress from "nprogress";

// Components
import NewSimpleModal from "@/components/NewSimpleModal";
import ScrollTabs from "@/components/ScrollTabs";
import { TabsContent } from "@/components/ui/tabs";
import MilitarySymbol from "@/components/MilitarySymbol";
import SymbolCodeViewer from "@/components/SymbolCodeViewer";
import SymbolCodeSelect from "@/components/SymbolCodeSelect";
import SymbolCodeMultilineSelect from "@/components/SymbolCodeMultilineSelect";
import SymbolFillColorSelect from "@/components/SymbolFillColorSelect";
import PopoverColorPicker from "@/components/PopoverColorPicker";
import SymbolBrowseTab from "@/components/SymbolBrowseTab";
import SymbolPickerCustomSymbol from "@/components/SymbolPickerCustomSymbol";
import PrimaryButton from "@/components/PrimaryButton";
import SecondaryButton from "@/components/SecondaryButton";
import BaseButton from "@/components/BaseButton";
import { Button } from "@/components/ui/button";

// UI Primitives
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

// Logic & Stores
import { useSymbolItems } from "@/hooks/symbolData";
import { useSymbologySearch } from "@/hooks/symbolSearching";
import { Sidc } from "@/symbology/sidc";
import { useActiveScenario } from "@/components/injects";
import { useSymbolSettingsStore } from "@/stores/settingsStore";
import { CUSTOM_SYMBOL_PREFIX, CUSTOM_SYMBOL_SLICE } from "@/config/constants";
import { getFullUnitSidc } from "@/symbology/helpers";
import { mapReinforcedStatus2Field } from "@/types/scenarioModels";
import { cn } from "@/lib/utils";

// Types
import type { ReinforcedStatus, UnitSymbolOptions } from "@/types/scenarioModels";

// Lazy Load Legacy Converter
const LegacyConverter = dynamic(() => import("@/components/LegacyConverter"), { ssr: false });

interface SymbolPickerModalProps {
  isVisible: boolean;
  onIsVisibleChange: (val: boolean) => void;
  initialSidc?: string;
  dialogTitle?: string;
  hideModifiers?: boolean;
  hideSymbolColor?: boolean;
  hideCustomSymbols?: boolean;
  inheritedSymbolOptions?: UnitSymbolOptions;
  symbolOptions?: UnitSymbolOptions;
  initialTab?: number;
  reinforcedStatus?: ReinforcedStatus;
  onUpdateSidc: (data: any) => void;
  onCancel: () => void;
}

export default function SymbolPickerModal({
  isVisible,
  onIsVisibleChange,
  initialSidc,
  dialogTitle = "Symbol picker",
  hideModifiers = false,
  hideSymbolColor = false,
  hideCustomSymbols = false,
  inheritedSymbolOptions,
  symbolOptions,
  initialTab = 0,
  reinforcedStatus: initialReinforcedStatus,
  onUpdateSidc,
  onCancel,
}: SymbolPickerModalProps) {
  const scn = useActiveScenario();
  const symbolSettings = useSymbolSettingsStore();
  const isMobile = useMediaQuery("(max-width: 768px)");

  // --- Local State ---
  const [currentSidc, setCurrentSidc] = useState(initialSidc || "10031000001211000000");
  const [customSymbolId, setCustomSymbolId] = useState<string | null>(
    initialSidc?.startsWith(CUSTOM_SYMBOL_PREFIX) ? initialSidc.slice(CUSTOM_SYMBOL_SLICE) : null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch] = useDebounceValue(searchQuery, 100);
  const [currentTab, setCurrentTab] = useState(initialTab.toString());
  const [internalSymbolOptions, setInternalSymbolOptions] = useState<UnitSymbolOptions>({
    ...(symbolOptions || {}),
  });

  const searchInputRef = useRef<HTMLInputElement>(null);

  // --- Symbol Data Hook ---
  const initialSidcMemo = useMemo(() => getFullUnitSidc(currentSidc), [currentSidc]);
  const symbolData = useSymbolItems(initialSidcMemo, initialReinforcedStatus, (newSidc) => {
    setCurrentSidc(newSidc);
  });
  const { csidc, isLoaded, sidValue, symbolSetValue, statusValue, iconValue, mod1Value, mod2Value, emtValue, hqtfdValue, reinforcedReducedValue, loadData } = symbolData;

  // --- Search Logic ---
  const { search } = useSymbologySearch(sidValue);
  const { groups: groupedHits, numberOfHits: hitCount } = useMemo(() => search(debouncedSearch), [debouncedSearch, search]);

  useEffect(() => {
    loadData(symbolSettings.symbologyStandard);
  }, []);

  useEffect(() => {
    if (isLoaded) NProgress.done();
  }, [isLoaded]);

  // --- Computed (useMemo) ---
  const customSymbol = useMemo(() => {
    if (!customSymbolId) return null;
    return scn.store.state.customSymbolMap[customSymbolId];
  }, [customSymbolId, scn.store.state.customSymbolMap]);

  const cleanObject = (obj: any): any => {
    const newObj = { ...obj };
    Object.keys(newObj).forEach((key) => {
      if (newObj[key] && typeof newObj[key] === "object") newObj[key] = cleanObject(newObj[key]);
      else if (newObj[key] === "" || newObj[key] === null || newObj[key] === undefined) delete newObj[key];
    });
    return newObj;
  };

  const finalSymbolOptions = useMemo(() => ({
    outlineWidth: 8,
    outlineColor: "rgba(255,255,255,0.80)",
    ...(inheritedSymbolOptions || {}),
    ...cleanObject(internalSymbolOptions),
    reinforcedReduced: mapReinforcedStatus2Field(reinforcedReducedValue),
  }), [inheritedSymbolOptions, internalSymbolOptions, reinforcedReducedValue]);

  // --- Handlers ---
  const onSubmit = () => {
    if (customSymbolId) {
      onUpdateSidc({ sidc: `${CUSTOM_SYMBOL_PREFIX}${csidc}:${customSymbolId}` });
    } else {
      onUpdateSidc({
        sidc: csidc,
        reinforcedStatus: reinforcedReducedValue,
        symbolOptions: internalSymbolOptions.fillColor ? { fillColor: internalSymbolOptions.fillColor } : {},
      });
      if (internalSymbolOptions.fillColor) scn.settings.addColorIfAbsent(internalSymbolOptions.fillColor);
    }
    onIsVisibleChange(false);
  };

  const onSelectHit = (hit: any) => {
    const newSidc = new Sidc(hit.sidc);
    symbolData.setSymbolSetValue(newSidc.symbolSet);
    if (hit.category === "Main icon") symbolData.setIconValue(newSidc.mainIcon);
    else if (hit.category === "Modifier 1") symbolData.setMod1Value(newSidc.modifierOne);
    else if (hit.category === "Modifier 2") symbolData.setMod2Value(newSidc.modifierTwo);
    setSearchQuery("");
  };

  return (
    <NewSimpleModal
      open={isVisible}
      onOpenChange={onIsVisibleChange}
      dialogTitle={dialogTitle}
      className="max-w-4xl"
    >
      <div className="flex h-full flex-col" onKeyDown={(e) => e.ctrlKey && e.key === "Enter" && onSubmit()}>
        
        {/* Header: Symbol Preview */}
        <header className="mt-4 flex h-20 w-full shrink-0 items-center justify-between border-b pb-4">
          {!customSymbol ? (
            <>
              <MilitarySymbol sidc={csidc} size={34} options={finalSymbolOptions} />
              <SymbolCodeViewer sidc={csidc} onUpdate={(val) => setCurrentSidc(val)} />
            </>
          ) : (
            <img src={customSymbol.src} alt={customSymbol.name} className="w-16 object-contain" />
          )}
        </header>

        

        {/* Search & Tabs */}
        <ScrollTabs 
          className="flex-auto mt-4" 
          value={currentTab} 
          onValueChange={setCurrentTab}
          items={["Select", "Browse", ...(!hideCustomSymbols ? ["Custom"] : []), "Legacy"]}
        >
          {/* Main Selection Tab */}
          <TabsContent value="0" className="mt-6 max-h-[60vh] overflow-y-auto pr-2">
            <Command className="rounded-lg border shadow-sm mb-4">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <CommandInput 
                  placeholder="Search symbology..." 
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                  className="pl-9 h-10"
                />
              </div>
              {hitCount > 0 && (
                <CommandList className="absolute top-10 w-full bg-popover z-50 border rounded-md shadow-xl max-h-64 overflow-y-auto">
                  {Array.from(groupedHits.entries()).map(([source, hits]: [string, any]) => (
                    <CommandGroup key={source} heading={source}>
                      {hits.map((item: any) => (
                        <CommandItem 
                          key={item.sidc} 
                          onSelect={() => onSelectHit(item)}
                          className="flex items-center gap-3 cursor-pointer"
                        >
                          <MilitarySymbol sidc={item.sidc} size={24} options={{ outlineWidth: 2 }} />
                          <span dangerouslySetInnerHTML={{ __html: item.highlight || item.text }} />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ))}
                </CommandList>
              )}
            </Command>

            {isLoaded && (
              <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <SymbolCodeSelect
                      label="Symbol set"
                      value={symbolSetValue}
                      onValueChange={(val) => val !== null && symbolData.setSymbolSetValue(val)}
                      items={symbolData.symbolSets}
                    />
                  </div>
                  <Button variant="outline" className="hidden sm:inline-flex" onClick={() => setCurrentTab("1")}>
                    Browse
                  </Button>
                </div>

                {!hideModifiers && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <SymbolCodeSelect label="Status" value={statusValue} onValueChange={(val) => val !== null && symbolData.setStatusValue(val)} items={symbolData.statusItems} />
                    {(symbolSetValue === "10" || symbolSetValue === "11") && (
                      <SymbolCodeSelect label="Reinforced / Reduced" value={reinforcedReducedValue} onValueChange={(val) => val !== null && symbolData.setReinforcedReducedValue(val as ReinforcedStatus)} items={symbolData.reinforcedReducedItems} />
                    )}
                  </div>
                )}

                <SymbolCodeMultilineSelect label="Main icon" value={iconValue} onValueChange={(val) => val !== null && symbolData.setIconValue(val)} items={symbolData.icons} />

                {!hideSymbolColor && (
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <SymbolFillColorSelect 
                        value={internalSymbolOptions.fillColor} 
                        onChange={(val: string | null) => setInternalSymbolOptions(p => ({ ...p, fillColor: val || undefined }))}
                      />
                    </div>
                    <PopoverColorPicker 
                      value={internalSymbolOptions.fillColor} 
                      onValueChange={(val: string | null) => setInternalSymbolOptions(p => ({ ...p, fillColor: val || undefined }))}
                    >
                      <Button variant="outline">Custom</Button>
                    </PopoverColorPicker>
                  </div>
                )}
              </form>
            )}
          </TabsContent>

          {/* Browse Tab */}
          <TabsContent value="1" className="mt-6 max-h-[60vh]">
            <SymbolBrowseTab 
              initialSidc={csidc} 
              onUpdateSidc={(val) => { setCustomSymbolId(null); setCurrentSidc(val); }} 
            />
          </TabsContent>

          {/* Custom Symbol Tab */}
          {!hideCustomSymbols && (
            <TabsContent value="2" className="mt-6">
              <SymbolPickerCustomSymbol initialSidc={customSymbolId} onUpdateSidc={(id) => {
                const s = scn.store.state.customSymbolMap[id];
                const ns = new Sidc(s ? s.sidc : "10031000001100000000");
                ns.standardIdentity = sidValue;
                setCurrentSidc(ns.toString());
                setCustomSymbolId(id);
              }} />
            </TabsContent>
          )}

          {/* Legacy Converter Tab */}
          <TabsContent value={!hideCustomSymbols ? "3" : "2"} className="mt-6">
            <LegacyConverter />
          </TabsContent>
        </ScrollTabs>

        {/* Footer */}
        <footer className="flex shrink-0 justify-end space-x-2 pt-6 border-t mt-4">
          <SecondaryButton onClick={() => {
            symbolData.setMod1Value("00");
            symbolData.setMod2Value("00");
            symbolData.setEmtValue("00");
            symbolData.setHqtfdValue("0");
          }}>
            Clear modifiers
          </SecondaryButton>
          <PrimaryButton onClick={onSubmit}>
            Select symbol
          </PrimaryButton>
        </footer>
      </div>
    </NewSimpleModal>
  );
}