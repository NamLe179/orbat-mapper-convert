"use client";

import React, { useState, useMemo, useEffect } from "react";

// Types & Config
import { type NUnit } from "@/types/internalModels";
import { type TextAmplifiers } from "@/types/scenarioModels";
import { Dimension, symbolSetToDimension } from "@/symbology/values";
import { Sidc } from "@/symbology/sidc";
import { type TextAmpKey, textAmpMap } from "@/symbology/milsymbwrapper";
import { CUSTOM_SYMBOL_PREFIX, CUSTOM_SYMBOL_SLICE } from "@/config/constants";

// Hooks & Stores
import { useActiveScenario } from "@/components/injects";
import { useSelectedItems } from "@/stores/selectedStore";

// Components
import TextAmpInput from "@/modules/scenarioeditor/TextAmpInput";
import ToggleField from "@/components/ToggleField";
import UnitSymbol from "@/components/UnitSymbol";
import NewMilitarySymbol from "@/components/NewMilitarySymbol";
import { Button } from "@/components/ui/button";

interface UnitDetailsSymbolProps {
  unit: NUnit;
  isMultiMode: boolean;
  isLocked?: boolean;
}

interface TextFieldMeta {
  x: number;
  y: number;
  field: TextAmpKey;
  placeholder?: string;
  title?: string;
}

const LAND_UNIT_FIELDS: TextFieldMeta[] = [
  { x: 3, y: 2, field: "G", title: "Staff Comments" },
  { x: 3, y: 3, field: "H", title: "Additional Information" },
  { x: 1, y: 4, field: "T", title: "Unique Designation" },
  { x: 3, y: 4, field: "M", title: "Higher Formation" },
];

const NAVAL_AIR_FIELDS: TextFieldMeta[] = [
  { x: 3, y: 1, field: "T", title: "Unique Designation" },
  { x: 3, y: 4, field: "G", title: "Staff Comments" },
];

export default function UnitDetailsSymbol({
  unit,
  isMultiMode,
  isLocked = false,
}: UnitDetailsSymbolProps) {
  // --- Context & Stores ---
  const activeScenario = useActiveScenario();
  const { unitActions, store: scenarioStore } = activeScenario;
  const { selectedUnitIds } = useSelectedItems();

  // --- Local State ---
  const [overrideName, setOverrideName] = useState<boolean>(
    unit.textAmplifiers?.uniqueDesignation !== undefined
  );
  const [textAmplifiers, setTextAmplifiers] = useState<TextAmplifiers>({
    ...(unit.textAmplifiers || {}),
  });

  // --- Watch: Sync uniqueDesignation with overrideName ---
  useEffect(() => {
    if (overrideName) {
      setTextAmplifiers((prev) => ({
        ...prev,
        uniqueDesignation: unit.shortName || unit.name || "",
      }));
    } else {
      setTextAmplifiers((prev) => {
        const { uniqueDesignation, ...rest } = prev;
        return rest;
      });
    }
  }, [overrideName, unit.shortName, unit.name]);

  // --- Computed (useMemo) ---
  const customSymbol = useMemo(() => {
    if (unit.sidc.startsWith(CUSTOM_SYMBOL_PREFIX)) {
      const symbolId = unit.sidc.slice(CUSTOM_SYMBOL_SLICE);
      return scenarioStore.state.customSymbolMap[symbolId];
    }
    return null;
  }, [unit.sidc, scenarioStore.state.customSymbolMap]);

  const dimension = useMemo(() => {
    const sidc = new Sidc(unit.sidc);
    return symbolSetToDimension[sidc.symbolSet] || Dimension.Unknown;
  }, [unit.sidc]);

  const textFields = useMemo(() => {
    if (
      dimension === Dimension.SeaSurface ||
      dimension === Dimension.SeaSubsurface ||
      dimension === Dimension.Air
    ) {
      return NAVAL_AIR_FIELDS;
    }
    return LAND_UNIT_FIELDS;
  }, [dimension]);

  const displaySymbol = useMemo(() => {
    const sidc = new Sidc(unit.sidc);
    sidc.emt = "000";
    sidc.hqtfd = "0";
    if (isMultiMode) {
      sidc.mainIcon = "000000";
      sidc.modifierOne = "00";
      sidc.modifierTwo = "00";
    }
    return sidc.toString();
  }, [unit.sidc, isMultiMode]);

  const combinedSymbolOptions = useMemo(() => {
    return {
      ...unitActions.getCombinedSymbolOptions(unit),
      uniqueDesignation: unit.shortName || unit.name,
      ...textAmplifiers,
      outlineWidth: 4,
    };
  }, [unit, unitActions, textAmplifiers]);

  // --- Handlers ---
  const setTextAmpValue = (field: TextAmpKey, value: string | number | undefined) => {
    const key = textAmpMap[field] as keyof TextAmplifiers;
    if (key === undefined) return;
    setTextAmplifiers((prev) => ({ ...prev, [key]: value }));
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isMultiMode && selectedUnitIds.size > 1) {
      scenarioStore.groupUpdate(() => {
        selectedUnitIds.forEach((id) => {
          unitActions.updateUnit(id, { textAmplifiers: { ...textAmplifiers } });
        });
      });
    } else {
      unitActions.updateUnit(unit.id, { textAmplifiers: { ...textAmplifiers } });
    }
  };

  const handleReset = () => {
    setTextAmplifiers({});
    setOverrideName(false);
    // Lưu ý: onSubmit() trong React cần tham số sự kiện, 
    // nên tách logic update thành hàm riêng nếu cần gọi từ Reset.
  };

  return (
    <section className="-mx-4 sm:mx-0">
      {!customSymbol ? (
        <>
          <header className="my-4 flex items-center justify-between">
            <p />
            <ToggleField checked={overrideName} onCheckedChange={(val: string | boolean) => setOverrideName(!!val)}>
              Override name
            </ToggleField>
          </header>

          

          <form onSubmit={onSubmit}>
            <div className="grid grid-cols-3 grid-rows-5 h-auto">
              <p className="col-start-1 row-start-1 h-9"></p>
              
              {textFields.map(({ x, y, field, placeholder, title }) => {
                const isUniqueDesignation = field === "T";
                const ampKey = textAmpMap[field] as keyof TextAmplifiers;
                
                return (
                  <div
                    key={field}
                    style={{ gridRowStart: y, gridColumnStart: x }}
                  >
                    <TextAmpInput
                      placeholder={placeholder || field}
                      title={title}
                      disabled={isLocked || (isUniqueDesignation && !overrideName)}
                      value={
                        isUniqueDesignation
                          ? !overrideName
                            ? isMultiMode ? "..." : (unit.shortName || unit.name)
                            : textAmplifiers.uniqueDesignation
                          : (textAmplifiers[ampKey] as string | number)
                      }
                      onChange={(e) => setTextAmpValue(field, e.target.value)}
                    />
                  </div>
                );
              })}

              <div className="col-start-2 row-span-3 row-start-2 items-center justify-self-center pt-2">
                <NewMilitarySymbol
                  sidc={displaySymbol}
                  className="stroke-muted-foreground"
                  size={75}
                  modifiers={{
                    frame: true,
                    monoColor: "inherit",
                  }}
                />
              </div>
            </div>

            <footer className="mt-2 flex items-center justify-end gap-2 border-t pt-2">
              <Button
                size="sm"
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={isLocked}
              >
                Reset
              </Button>
              <Button 
                size="sm" 
                variant="secondary" 
                type="submit" 
                disabled={isLocked}
              >
                Update
              </Button>
            </footer>
          </form>
        </>
      ) : (
        <p className="text-muted-foreground mt-4 text-sm">
          Text amplifiers are not available for custom symbols.
        </p>
      )}

      <p className="mt-2 text-sm leading-7 font-medium">Preview</p>

      <div className="mt-4 flex justify-center">
        <UnitSymbol
          sidc={unit.sidc}
          size={30}
          options={combinedSymbolOptions}
          className="w-30"
        />
      </div>
    </section>
  );
}