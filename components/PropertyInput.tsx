"use client";

import React, { useState, useRef, useEffect } from "react";
import { type UnitProperty } from "@/types/scenarioModels";
import { type UnitPropertyUpdate } from "@/types/internalModels";
import { cn } from "@/lib/utils";

// 1. Định nghĩa Type cho các đơn vị
type SpeedUnit = "km/h" | "mph" | "knots" | "m/s" | "ft/s";

interface PropertyInputProps {
  property?: UnitProperty;
  autoFocus?: boolean;
  onUpdateValue?: (data: UnitPropertyUpdate) => void;
  className?: string;
}

export default function PropertyInput({
  property,
  autoFocus = true,
  onUpdateValue,
  className,
}: PropertyInputProps) {
  const [value, setValue] = useState<string | number>(property?.value || "");
  
  // 2. Sử dụng Type trong useState 
  const [uom, setUom] = useState<SpeedUnit>((property?.uom as SpeedUnit) || "km/h");

  const inputRef = useRef<HTMLInputElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape" || e.key === "Enter") {
      e.preventDefault();
      e.currentTarget.blur();
    }
  };

  const handleBlur = (e: React.FocusEvent) => {
    const newTarget = e.relatedTarget as Node | null;
    if (newTarget === inputRef.current || newTarget === selectRef.current) {
      return;
    }
    onUpdateValue?.({ value, uom });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const num = parseFloat(val);
    setValue(val === "" ? "" : isNaN(num) ? val : num);
  };

  return (
    <div className={cn("relative rounded-md shadow-xs", className)}>
      <input
        ref={inputRef}
        type="text"
        className="border-input text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 block w-full rounded-md bg-transparent py-1.5 pr-16 outline-none focus-visible:ring-[3px] sm:text-sm sm:leading-6"
        value={value}
        onChange={handleInputChange}
        onKeyUp={(e) => { if (e.key === "Escape") handleKeyDown(e); }}
        onKeyDown={(e) => { if (e.key === "Enter") handleKeyDown(e); }}
        onBlur={handleBlur}
      />
      <div className="absolute inset-y-0 right-0 flex items-center">
        <select
          ref={selectRef}
          name="uom"
          value={uom}
          onChange={(e) => setUom(e.target.value as SpeedUnit)}
          onBlur={handleBlur}
          className="text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 h-full rounded-md border-0 bg-transparent py-0 pr-7 pl-2 focus-visible:ring-[3px] sm:text-sm"
        >
          <option value="m/s">m/s</option>
          <option value="km/h">km/h</option>
          <option value="mph">mph</option>
          <option value="knots">knots</option>
          <option value="ft/s">ft/s</option>
        </select>
      </div>
    </div>
  );
}