"use client";

import React, { useMemo, useId } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldLabel } from "@/components/ui/field";
import NewMilitarySymbol from "@/components/NewMilitarySymbol";

// Giả định types import
import { type NullableSymbolItem } from "@/types/constants";
import { type UnitSymbolOptions } from "@/types/scenarioModels";

interface SymbolCodeSelectProps {
  label?: string;
  items: NullableSymbolItem[];
  symbolOptions?: UnitSymbolOptions;
  placeholder?: string;

  // Thay thế defineModel
  value?: string | null;
  onValueChange?: (value: string | null) => void;
}

export default function SymbolCodeSelect({
  label,
  items,
  symbolOptions,
  placeholder,
  value = "00", // Default value từ Vue definition
  onValueChange,
}: SymbolCodeSelectProps) {
  
  const controlId = useId();

  // Computed: Tìm item đang được chọn
  const selected = useMemo(() => {
    return (items || []).find((i) => i.code === value);
  }, [items, value]);

  // Handle change: Radix trả về string
  const handleValueChange = (val: string) => {
    onValueChange?.(val);
  };

  return (
    <Field>
      {label && <FieldLabel htmlFor={controlId}>{label}</FieldLabel>}
      
      <Select 
        value={value || ""} 
        onValueChange={handleValueChange}
      >
        <SelectTrigger 
          id={controlId} 
          className="w-full h-10" // data-[size=default]:h-10 converted
        >
          {/* Custom Display cho Trigger */}
          {selected ? (
            <div className="flex items-center gap-2 overflow-hidden">
              <NewMilitarySymbol
                className="size-8 shrink-0"
                sidc={selected.sidc || ""}
                size={20}
                // Merge options: default outline 8, props options, item specific options
                options={{
                  outlineWidth: 8,
                  ...symbolOptions,
                  ...(selected.symbolOptions || {}),
                }}
              />
              <span className="truncate">{selected.text}</span>
            </div>
          ) : (
            <SelectValue placeholder={placeholder} />
          )}
        </SelectTrigger>

        <SelectContent className="border-border">
          <SelectGroup>
            {items.map((item) => (
              <SelectItem
                key={item.code ?? "undefined"}
                value={item.code || "none"}
                className="data-[state=checked]:font-semibold"
              >
                <div className="flex items-center gap-2">
                  <NewMilitarySymbol
                    size={20}
                    className="size-8 shrink-0"
                    sidc={item.sidc || ""}
                    options={{
                      outlineWidth: 8,
                      ...symbolOptions,
                      ...(item.symbolOptions || {}),
                    }}
                  />
                  <span>{item.text}</span>
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}