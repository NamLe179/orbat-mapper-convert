"use client";

import React, { useEffect, useRef, useState } from "react";
import { draggable } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";

// Types
import { type BreadcrumbItemType } from "@/modules/scenarioeditor/types";
import { getUnitDragItem } from "@/types/draggables";

// Hooks & Utils
import { useActiveScenario } from "@/components/injects";
import { cn } from "@/lib/utils";

// Components
import UnitSymbol from "@/components/UnitSymbol";

interface UnitBreadcrumbItemProps {
  item: BreadcrumbItemType;
}

export default function UnitBreadcrumbItem({ item }: UnitBreadcrumbItemProps) {
  // --- Context & State ---
  const { unitActions, helpers } = useActiveScenario();
  const { isUnitLocked } = unitActions;
  const { getUnitById } = helpers;

  const dragItemRef = useRef<HTMLDivElement>(null);
  const [isDragged, setIsDragged] = useState(false);

  // --- Drag and Drop Logic ---
  useEffect(() => {
    const element = dragItemRef.current;
    if (!element || !item.id) return;

    const unit = getUnitById(item.id);
    if (!unit) return;

    // Tương đương dndCleanup = draggable(...)
    return draggable({
      element: element,
      canDrag: () => !isUnitLocked(unit.id),
      getInitialData: () => getUnitDragItem({ unit }, "breadcrumbs"),
      onDragStart: () => setIsDragged(true),
      onDrop: () => setIsDragged(false),
    });
  }, [item.id, getUnitById, isUnitLocked]);

  return (
    <div className="flex h-7 items-center overflow-clip">
      
      
      <div 
        ref={dragItemRef} 
        className="relative flex shrink-0 cursor-move"
      >
        {item.sidc && (
          <UnitSymbol
            sidc={item.sidc}
            options={item.symbolOptions ?? {}}
            modifiers={{ outlineWidth: 8 }}
            size={15}
            className={cn(
              "w-7 transition-opacity",
              isDragged ? "opacity-20" : "opacity-100"
            )}
          />
        )}
      </div>

      <span
        className={cn(
          "ml-1 select-none whitespace-nowrap",
          item.symbolOptions?.reinforcedReduced && "ml-2",
          item.location && "text-accent-foreground underline"
        )}
      >
        {item.name}
      </span>
    </div>
  );
}