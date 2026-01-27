"use client";

import React from "react";
import { 
  X, 
  Filter, 
  ListFilter, 
  LocateFixed, 
  LocateOff 
} from "lucide-react";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import { cn } from "@/lib/utils";

// Kế thừa props của Input chuẩn, trừ value/onChange để định nghĩa lại kiểu dữ liệu
interface FilterQueryInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  // Model 1: Input text
  value: string | number;
  onValueChange: (value: string) => void;

  // Model 2: Location Filter toggle
  locationFilter: boolean;
  onLocationFilterChange: (pressed: boolean) => void;

  id?: string;
  label?: string; // Props có trong Vue nhưng không thấy dùng trong template, giữ lại cho đúng interface
  description?: string;
}

export default function FilterQueryInput({
  value,
  onValueChange,
  locationFilter,
  onLocationFilterChange,
  className,
  ...props // Các attrs còn lại sẽ được truyền vào input (placeholder, etc.)
}: FilterQueryInputProps) {
  
  // Logic computed
  const hasFilter = !!(locationFilter || value);

  return (
    <div className="relative rounded-md shadow-xs">
      {/* Left Icon Area */}
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        {hasFilter ? (
          <ListFilter 
            className="text-muted-foreground h-5 w-5" 
            aria-hidden="true" 
          />
        ) : (
          <Filter 
            className="text-muted-foreground h-5 w-5" 
            aria-hidden="true" 
          />
        )}
      </div>

      {/* Input Field */}
      <input
        type="text"
        className={cn(
          "focus:border-primary focus:ring-ring dark:bg-muted/20 block w-full rounded-md border-gray-300 pr-20 pl-10 sm:text-sm",
          // pr-20 để chừa chỗ cho 2 button bên phải
          className
        )}
        placeholder="Filter"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        {...props}
      />

      {/* Right Actions Area */}
      <div className="absolute inset-y-0 right-0 flex items-center pr-2 gap-1">
        {/* Clear Button */}
        {value ? (
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground focus:ring-ring rounded-md focus:ring-2 focus:ring-offset-2 focus:outline-hidden p-1"
            onClick={() => onValueChange("")}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : null}

        {/* Location Filter Toggle */}
        <TogglePrimitive.Root
          pressed={locationFilter}
          onPressedChange={onLocationFilterChange}
          aria-label="Toggle location filter"
          className={cn(
            "text-muted-foreground hover:text-foreground focus:ring-ring rounded-md focus:ring-2 focus:ring-offset-2 focus:outline-hidden p-1",
            locationFilter && "text-primary" // Optional: Highlight khi active
          )}
        >
          {locationFilter ? (
            <LocateOff className="h-5 w-5" aria-hidden="true" />
          ) : (
            <LocateFixed className="h-5 w-5" aria-hidden="true" />
          )}
        </TogglePrimitive.Root>
      </div>
    </div>
  );
}