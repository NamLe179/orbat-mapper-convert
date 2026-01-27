"use client";

import React, { useState } from "react";
import { Minus, Plus } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface NewAccordionPanelProps {
  label: string;
  children?: React.ReactNode;
  header?: React.ReactNode; // Thay thế cho slot "header"
  
  // Props cho việc điều khiển trạng thái (mô phỏng v-model)
  open?: boolean;           // Controlled state
  defaultOpen?: boolean;    // Uncontrolled default state (Vue default: true)
  onOpenChange?: (open: boolean) => void;
  
  className?: string;
}

export default function NewAccordionPanel({
  label,
  children,
  header,
  open,
  defaultOpen = true,
  onOpenChange,
  className,
}: NewAccordionPanelProps) {
  // Logic xử lý state: 
  // Nếu prop 'open' được truyền vào -> Mode Controlled
  // Nếu không -> Dùng internal state (Mode Uncontrolled)
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  
  const isOpen = open !== undefined ? open : internalOpen;

  const handleOpenChange = (value: boolean) => {
    if (open === undefined) {
      setInternalOpen(value);
    }
    onOpenChange?.(value);
  };

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={handleOpenChange}
      className={cn("border-border relative border-b", className)}
    >
      <CollapsibleTrigger className="group flex w-full items-center justify-between py-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          {label}
        </h3>
        
        {/* Icons toggle dựa trên group-data-state */}
        <Plus className="text-muted-foreground hidden h-4 w-4 group-data-[state=closed]:block" />
        <Minus className="text-muted-foreground hidden h-4 w-4 group-data-[state=open]:block" />
      </CollapsibleTrigger>

      {/* Header Slot Area */}
      {/* Logic Vue: v-if="$slots.header && open" */}
      {header && isOpen && (
        <div className="pointer-events-none absolute top-0 right-6 left-0 flex justify-end">
          <div className="pointer-events-auto">
            {header}
          </div>
        </div>
      )}

      <CollapsibleContent className="pt-1 pb-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}