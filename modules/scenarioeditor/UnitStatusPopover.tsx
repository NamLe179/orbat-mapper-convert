"use client";

import React, { useState, useMemo } from "react";
import { sortBy } from "@/utils";
import { useActiveScenario } from "@/components/injects";

// Types
import { type SelectItem } from "@/components/types";

// Components
import SimpleSelect from "@/components/SimpleSelect"; // Giả định đã convert
import BaseButton from "@/components/BaseButton"; // Giả định đã convert
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface UnitStatusPopoverProps {
  disabled?: boolean;
  onUpdate?: (value: string | null | undefined) => void;
}

export default function UnitStatusPopover({
  disabled,
  onUpdate,
}: UnitStatusPopoverProps) {
  // --- Hooks ---
  const { store } = useActiveScenario();
  const { unitStatusMap } = store.state;

  // --- State ---
  const [isOpen, setIsOpen] = useState(false);
  const [statusValue, setStatusValue] = useState<string | null>(null);

  // --- Computed (useMemo) ---
  const unitStatusValues = useMemo<SelectItem[]>(() => {
    // Giả định unitStatusMap là object
    return sortBy(Object.values(unitStatusMap), "name").map((v: any) => ({
      value: v.id,
      label: v.name,
    }));
  }, [unitStatusMap]);

  // --- Handlers ---
  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdate) {
      onUpdate(statusValue);
    }
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" disabled={disabled}>
          Set status
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="">
        <h3 className="font-medium leading-none mb-2">Set unit status</h3>
        
        <form onSubmit={onFormSubmit} className="mt-2 space-y-2">
          <SimpleSelect
            addNone={true} // Vue: add-none
            items={unitStatusValues}
            value={statusValue}
            onValueChange={(val: string | number | null) => setStatusValue(val as string | null)}
          />
          
          <footer className="flex justify-end">
            <BaseButton small primary type="submit">
              Set
            </BaseButton>
          </footer>
        </form>
      </PopoverContent>
    </Popover>
  );
}