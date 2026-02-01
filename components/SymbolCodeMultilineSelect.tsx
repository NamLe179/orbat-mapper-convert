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
import { cn } from "@/lib/utils";

// Giả định các types được import từ file tương ứng
import { type NullableSymbolItem } from "@/types/constants";
import { type UnitSymbolOptions } from "@/types/scenarioModels";

interface SymbolCodeMultilineSelectProps {
  label?: string;
  items: NullableSymbolItem[];
  symbolOptions?: UnitSymbolOptions;
  placeholder?: string;
  
  // Thay thế defineModel
  value?: string | null;
  onValueChange?: (value: string | null) => void;
}

export default function SymbolCodeMultilineSelect({
  label,
  items,
  symbolOptions,
  placeholder,
  value = "00", // Default value từ Vue definition
  onValueChange,
}: SymbolCodeMultilineSelectProps) {
  
  const controlId = useId();

  // Helper function map item (giữ nguyên logic)
  const mapSymbolItem = (item: NullableSymbolItem) => {
    return {
      sidc: item.sidc,
      code: item.code,
      label: item.entitySubtype || item.entityType || item.entity,
      subLabel: item.entitySubtype
        ? `${item.entity} / ${item.entityType}`
        : item.entityType
        ? item.entity
        : "",
    };
  };

  // Computed: renderedItems
  const renderedItems = useMemo(() => items.map(mapSymbolItem), [items]);

  // Computed: selected
  const selected = useMemo(() => {
    // Tìm item đang active, nếu không thấy thì fallback về item đầu tiên (theo logic Vue)
    const v = renderedItems.find((i) => i.code === value);
    return v ? v : renderedItems[0];
  }, [renderedItems, value]);

  // Handler: Radix Select trả về string, ta truyền lên code
  const handleValueChange = (val: string) => {
    onValueChange?.(val);
  };

  // Render Layout cho Item (Dùng chung cho cả Trigger và Option)
  const renderItemContent = (item: ReturnType<typeof mapSymbolItem>) => (
    <div className="flex items-center">
      <NewMilitarySymbol
        className="size-8"
        sidc={item.sidc || ""}
        size={20}
        options={{ ...symbolOptions, outlineWidth: 4 }}
      />
      <div className="ml-3 max-w-xs text-left sm:max-w-none flex flex-col">
        {item.subLabel && (
          <div className="text-muted-foreground truncate text-xs">
            {item.subLabel}
          </div>
        )}
        <div className="mt-0 truncate text-sm font-medium">
            {item.label}
        </div>
      </div>
    </div>
  );

  return (
    <Field>
      {label && <FieldLabel htmlFor={controlId}>{label}</FieldLabel>}
      
      <Select 
        value={value || ""} 
        onValueChange={handleValueChange}
      >
        <SelectTrigger 
          id={controlId} 
          className="w-full h-12" // data-[size=default]:h-12 converted to Tailwind class
        >
          {/* Custom Trigger Display */}
          {selected ? (
             renderItemContent(selected)
          ) : (
            <SelectValue placeholder={placeholder} />
          )}
        </SelectTrigger>

        <SelectContent>
          <SelectGroup>
            {renderedItems.map((item) => (
              <SelectItem
                key={item.code ?? "undefined"}
                value={item.code || ""}
                className="data-[state=checked]:font-semibold"
              >
                {/* Custom Option Display */}
                {renderItemContent(item)}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}