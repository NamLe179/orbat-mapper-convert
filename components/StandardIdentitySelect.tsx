"use client";

import React, { useState, useMemo } from "react";
import { CheckCircleIcon } from "@heroicons/react/20/solid";

// UI Components
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

// Custom Components
import MilSymbol from "@/components/MilSymbol";
import SymbolFillColorSelect from "@/components/SymbolFillColorSelect";

// Types
import type { SymbolItem, SymbolValue } from "@/types/constants";
import { cn } from "@/lib/utils";

interface Props {
  compact?: boolean;
  value?: string;
  onValueChange: (value: string) => void;
  fillColor?: string | null;
  onFillColorChange: (color: string | null) => void;
}

const RAW_SID_ITEMS: SymbolValue[] = [
  { code: "3", text: "Friend" },
  { code: "6", text: "Hostile" },
  { code: "4", text: "Neutral" },
  { code: "1", text: "Unknown" },
  { code: "0", text: "Pending" },
  { code: "2", text: "Assumed Friend" },
  { code: "5", text: "Suspect" },
];

function addSymbol({ code, text }: SymbolValue): SymbolItem {
  return {
    code,
    text,
    sidc: `100${code}10000000000000`, // Đã rút gọn template chuỗi SIDC
  };
}

const ALL_SID_ITEMS = RAW_SID_ITEMS.map(addSymbol);

export default function StandardIdentitySelect({
  compact = false,
  value = "3",
  onValueChange,
  fillColor,
  onFillColorChange,
}: Props) {
  const [showAll, setShowAll] = useState(false);

  const items = useMemo(() => {
    return showAll
      ? ALL_SID_ITEMS
      : ALL_SID_ITEMS.filter((e) => ["1", "3", "6", "4"].includes(e.code));
  }, [showAll]);

  return (
    <div className="mt-4">
      <Label className="text-heading text-sm font-medium">Standard identity</Label>
      
      

      <RadioGroup 
        value={value} 
        onValueChange={onValueChange}
        className={cn(
          "mt-1 grid gap-4",
          compact ? "grid-cols-2" : "sm:grid-cols-4"
        )}
      >
        {items.map((sid) => (
          <div key={sid.code} className="relative">
            <RadioGroupItem
              value={sid.code}
              id={`sid-${sid.code}`}
              className="peer sr-only"
            />
            <label
              htmlFor={`sid-${sid.code}`}
              className={cn(
                "relative flex cursor-pointer rounded-lg border bg-transparent p-4 shadow-sm focus:outline-none",
                "border-input dark:bg-input/30",
                "peer-data-[state=checked]:border-primary peer-data-[state=checked]:ring-2 peer-data-[state=checked]:ring-primary",
                "transition-all hover:bg-muted/50"
              )}
            >
              <span className="flex flex-1">
                <span className="flex w-full flex-col items-center text-center">
                  <span className="text-heading block text-sm font-medium">
                    {sid.text}
                  </span>
                  <span className="mt-2 flex">
                    <MilSymbol
                      sidc={sid.sidc}
                      size={32}
                      modifiers={{ outlineColor: "white", outlineWidth: 4 }}
                    />
                  </span>
                </span>
              </span>

              <CheckCircleIcon
                className={cn(
                  "text-primary absolute top-1 right-1 h-5 w-5 opacity-0 transition-opacity",
                  "peer-data-[state=checked]:opacity-100"
                )}
                aria-hidden="true"
              />
            </label>
          </div>
        ))}
      </RadioGroup>

      <div className="mt-2 flex justify-end">
        <Button 
          type="button" 
          variant="link" 
          onClick={() => setShowAll(!showAll)} 
          size="sm"
        >
          {showAll ? (
            <><span aria-hidden="true">←</span> View less</>
          ) : (
            <>View more <span aria-hidden="true">→</span></>
          )}
        </Button>
      </div>

      <div className={cn(
        "mt-0 grid gap-4",
        compact ? "grid-cols-1" : "sm:grid-cols-2"
      )}>
        <SymbolFillColorSelect 
          value={fillColor} 
          onChange={onFillColorChange} 
          sid={value} 
        />
      </div>
    </div>
  );
}