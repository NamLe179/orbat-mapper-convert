"use client";

import { useState, useEffect } from "react";
import { Minus, Plus } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface AccordionPanelProps {
  // Slot "label" trong Vue giờ có thể là string hoặc ReactNode
  label?: React.ReactNode;
  // Slot mặc định
  children?: React.ReactNode;
  // Slot "right"
  right?: React.ReactNode;
  // Slot "closedContent"
  closedContent?: React.ReactNode;
  // Emits chuyển thành callback props
  onOpened?: () => void;
  onClosed?: () => void;
}

export default function AccordionPanel({
  label,
  children,
  right,
  closedContent,
  onOpened,
  onClosed,
}: AccordionPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Tương đương với watch(open, ...) trong Vue
  useEffect(() => {
    if (isOpen) {
      onOpened?.();
    } else {
      onClosed?.();
    }
  }, [isOpen, onOpened, onClosed]);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="border-border border-b py-6"
    >
      <h3 className="-my-3 flow-root">
        <CollapsibleTrigger className="group flex w-full items-center justify-between py-3 text-sm">
          <span className="text-heading font-bold">
            {/* Tương đương <slot name="label">{{ label }}</slot> */}
            {label}
          </span>
          <span className="ml-6 flex items-center">
            {/* Tương đương <slot name="right"></slot> */}
            {right}
            
            {/* Logic icon toggle */}
            {!isOpen ? (
              <Plus
                className="group-hover:text-muted-foreground size-4"
                aria-hidden="true"
              />
            ) : (
              <Minus
                className="group-hover:text-muted-foreground size-4"
                aria-hidden="true"
              />
            )}
          </span>
        </CollapsibleTrigger>
      </h3>

      {/* Tương đương <slot v-if="!open" name="closedContent" /> */}
      {!isOpen && closedContent}

      <CollapsibleContent className="space-y-4 pt-6">
        {/* Slot mặc định */}
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}