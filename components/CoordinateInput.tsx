"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { MapPin } from "lucide-react";
import * as mgrsLib from "mgrs";
import type { Position } from "geojson";
import { parseCoordinates, truncatePosition } from "@/geo/utils";
import { getErrorMessage } from "@/utils";
import { cn } from "@/lib/utils";

export type CoordinateInputFormat = "MGRS" | "LatLon" | "LonLat";

// Omit 'value' and 'onChange' from HTMLAttributes to avoid conflicts with our custom types
interface CoordinateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value: Position; // Tương đương v-model="modelValue"
  onChange: (value: Position) => void;
  format?: CoordinateInputFormat;
  onFormatChange?: (format: CoordinateInputFormat) => void; // Tương đương @update:format
  onOutBlur?: (e: React.FocusEvent) => void;
  label?: string; // Prop này có trong Vue nhưng không dùng trong template, giữ lại cho đúng interface
  outerClassName?: string; // Tương đương props.outerClass
}

export default function CoordinateInput({
  value,
  onChange,
  format = "LonLat",
  onFormatChange,
  onOutBlur,
  label,
  outerClassName,
  className,
  autoFocus,
  ...props
}: CoordinateInputProps) {
  const [inputFormat, setInputFormat] = useState<CoordinateInputFormat>(format);
  const [localValue, setLocalValue] = useState("");
  const [isInvalid, setIsInvalid] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);

  // Ref để tránh vòng lặp update khi chính component này kích hoạt thay đổi
  const lastEmittedValue = useRef<string | null>(null);

  // --- Helpers ---

  const convertToLocalValue = useCallback((v: Position, fmt: CoordinateInputFormat): string => {
    if (!v || v.length < 2) return "";
    try {
      if (fmt === "MGRS") {
        return mgrsLib.forward(v as [number, number], 5);
      } else {
        const [lon, lat] = truncatePosition(v);
        if (fmt === "LatLon") {
          return `${lat},${lon}`;
        } else {
          return `${lon},${lat}`;
        }
      }
    } catch (e) {
      console.error("Error converting coordinate", e);
      return "";
    }
  }, []);

  // --- Effects ---

  // Sync prop 'value' to 'localValue' (Inbound change)
  useEffect(() => {
    // Chỉ update localValue nếu giá trị mới khác với giá trị vừa emit
    // Điều này giúp tránh việc format lại chuỗi khi người dùng đang gõ (ví dụ 10.1 -> 10.100...)
    const newValueString = JSON.stringify(value);
    if (newValueString !== lastEmittedValue.current) {
      setLocalValue(convertToLocalValue(value, inputFormat));
    }
  }, [value, inputFormat, convertToLocalValue]);

  // Autofocus logic
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // --- Handlers ---

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setLocalValue(v);

    let lon = 0;
    let lat = 0;
    let isValid = false;

    if (inputFormat === "MGRS") {
      try {
        // mgrs.toPoint returns [lon, lat]
        const point = mgrsLib.toPoint(v);
        [lon, lat] = truncatePosition(point as Position);
        isValid = true;
      } catch (error) {
        // MGRS parsing failed
      }
    } else {
      try {
        const coords = parseCoordinates(v);
        if (coords.length === 2) {
          const [first, second] = coords;
          if (inputFormat === "LatLon") {
            lat = first;
            lon = second;
          } else {
            lon = first;
            lat = second;
          }
          isValid = true;
        }
      } catch (error) {
        // LatLon parsing failed
      }
    }

    if (isValid) {
      setIsInvalid(false);
      const newPos: Position = [lon, lat];
      // Đánh dấu giá trị này do chính component tạo ra
      lastEmittedValue.current = JSON.stringify(newPos);
      onChange(newPos);
    } else {
      setIsInvalid(true);
      // Không gọi onChange nếu invalid để tránh làm hỏng state cha
    }
  };

  const handleFormatChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFormat = e.target.value as CoordinateInputFormat;
    setInputFormat(newFormat);
    onFormatChange?.(newFormat);
    
    // Khi đổi format, convert lại giá trị hiện tại (từ prop value) sang format mới
    // Reset lại cờ invalid
    setIsInvalid(false);
    const newString = convertToLocalValue(value, newFormat);
    setLocalValue(newString);
  };

  const handleOuterBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    // Logic tương tự @blur.capture check relatedTarget
    // Nếu focus di chuyển sang element khác KHÔNG nằm trong component này
    if (
      e.relatedTarget !== inputRef.current &&
      e.relatedTarget !== selectRef.current
    ) {
      onOutBlur?.(e);
    }
  };

  return (
    <div className={outerClassName} onBlur={handleOuterBlur}>
      <div className="relative rounded-sm shadow-xs">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <MapPin className="text-muted-foreground h-4 w-4" aria-hidden="true" />
        </div>
        
        <input
          type="text"
          ref={inputRef}
          className={cn(
            "text-foreground bg-input ring-input placeholder:text-muted-foreground focus:ring-ring data-[invalid=true]:bg-destructive/20 block w-full rounded-md border-0 py-1.5 pr-24 pl-10 ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6",
            className
          )}
          data-invalid={isInvalid}
          value={localValue}
          onChange={handleInputChange}
          {...props}
        />
        
        <div className="absolute inset-y-0 right-0 flex items-center">
          <label htmlFor="coordinate-format" className="sr-only">
            Coordinate format
          </label>
          <select
            id="coordinate-format"
            ref={selectRef}
            className="text-muted-foreground focus:ring-ring h-full rounded-md border-0 bg-transparent py-0 pr-7 pl-2 focus:ring-2 focus:ring-inset sm:text-sm"
            value={inputFormat}
            onChange={handleFormatChange}
          >
            <option value="LatLon">LAT,LON</option>
            <option value="LonLat">LON, LAT</option>
            <option value="MGRS">MGRS</option>
          </select>
        </div>
      </div>
    </div>
  );
}