"use client";

import React, { useState, useMemo } from "react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/24/solid";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { type SelectItem } from "./types";

interface SimpleComboProps {
  label?: string;
  description?: string;
  items?: SelectItem[];
  values?: (string | number)[];
  className?: string; // Thay cho extraClass
  
  // Controlled props (thay cho defineModel)
  value?: string | number;
  onValueChange?: (value: string | number) => void;
}

export default function SimpleCombo({
  label,
  description,
  items,
  values,
  className,
  value,
  onValueChange,
}: SimpleComboProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  // Normalizing items data
  const computedValues = useMemo(() => {
    if (items) return items;

    return (values || []).map((i) => ({
      label: i.toString(),
      value: i,
    }));
  }, [items, values]);

  // Filter logic based on query
  const filteredValues = useMemo(() => {
    if (query === "") return computedValues;
    
    return computedValues.filter((item) =>
      String(item.label).toLowerCase().includes(query.toLowerCase())
    );
  }, [query, computedValues]);

  // Find label for current value
  const selectedLabel = useMemo(() => {
    const found = computedValues.find((i) => i.value === value);
    return found ? found.label : "";
  }, [value, computedValues]);

  const handleSelect = (val: string | number) => {
    onValueChange?.(val);
    setOpen(false);
  };

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
        </label>
      )}
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("w-full justify-between", className)}
          >
            {selectedLabel || "Select..."}
            <ChevronUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-[200px] p-0" align="start">
          {/* Search Input Area */}
          <div className="flex items-center border-b px-3">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="placeholder:text-muted-foreground flex h-11 w-full rounded-md border-none bg-transparent py-3 text-sm outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 shadow-none"
              placeholder="Search..."
            />
          </div>

          {/* Items List */}
          <div className="max-h-[300px] overflow-x-hidden overflow-y-auto">
            {filteredValues.length === 0 ? (
              <div className="py-6 text-center text-sm">No value found.</div>
            ) : (
              filteredValues.map((item) => (
                <div
                  key={item.value}
                  onClick={() => handleSelect(item.value)}
                  className={cn(
                    "hover:bg-accent hover:text-accent-foreground relative flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm transition-colors outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                    value === item.value ? "bg-accent text-accent-foreground" : ""
                  )}
                >
                  <CheckIcon
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === item.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {item.label}
                </div>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}