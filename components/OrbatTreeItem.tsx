"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { ChevronRight, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

// Drag and Drop (Pragmatic DnD)
import {
  draggable,
  dropTargetForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import {
  attachInstruction,
  extractInstruction,
  type Instruction,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";

// Constants & Types
import { CUSTOM_SYMBOL_PREFIX, CUSTOM_SYMBOL_SLICE } from "@/config/constants";
import { type UnitAction } from "@/types/constants";
import type { NOrbatItemData, NUnit } from "@/types/internalModels";
import { mapReinforcedStatus2Field } from "@/types/scenarioModels";
import type { SymbolOptions } from "milsymbol";
import { getUnitDragItem, isUnitDragItem } from "@/types/draggables";

// Hooks & Stores
import { useActiveScenario, useActiveParent } from "@/components/injects"; // Giả định hooks
import { useActiveUnit } from "@/stores/dragStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useSelectedItems } from "@/stores/selectedStore";
import { useUnitMenu } from "@/hooks/scenarioActions";

// Components
import DotsMenu from "./DotsMenu";
import MilitarySymbol from "@/components/NewMilitarySymbol"; // Giả định đã convert
import TreeDropIndicator from "@/components/TreeDropIndicator";

interface OrbatTreeItemProps {
  item: NOrbatItemData;
  symbolOptions?: SymbolOptions;
  level?: number;
  lastInGroup?: boolean;
  
  // Events
  onUnitAction: (unit: NUnit, action: UnitAction) => void;
  onUnitClick: (unit: NUnit, event: React.MouseEvent) => void;
}

export default function OrbatTreeItem({
  item,
  symbolOptions,
  level = 0,
  lastInGroup,
  onUnitAction,
  onUnitClick,
}: OrbatTreeItemProps) {
  // --- Hooks & Contexts ---
  const activeParentId = useActiveParent();
  const {
    unitActions: { isUnitLocked },
    store: { state },
  } = useActiveScenario();
  
  const settingsStore = useSettingsStore();
  const { selectedUnitIds, activeUnitId } = useSelectedItems();
  const activeUnitStore = useActiveUnit();

  const unit = item.unit;

  // --- State ---
  // Initialize isOpen from the mutable unit object
  const [isOpen, setIsOpen] = useState(!!unit._isOpen);
  
  // Sync isOpen with unit._isOpen when it changes from store
  useEffect(() => {
    setIsOpen(!!unit._isOpen);
  }, [unit._isOpen]);
  
  // Drag State
  const [isDragged, setIsDragged] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [instruction, setInstruction] = useState<Instruction | null>(null);

  // Refs
  const itemRef = useRef<HTMLDivElement>(null);
  const dragItemRef = useRef<HTMLDivElement>(null);
  const expandTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- Computed (useMemo) ---
  
  const isLocked = isUnitLocked(unit.id);
  const isSideGroupLocked = isUnitLocked(unit.id, { excludeUnit: true });
  
  const combinedOptions = useMemo(() => ({
    ...(symbolOptions || {}),
    ...(unit.symbolOptions || {}),
    outlineWidth: 8,
  }), [symbolOptions, unit.symbolOptions]);

  const unitLabel = useMemo(() => 
    settingsStore.orbatShortName
      ? unit.shortName || unit.name
      : unit.name
  , [settingsStore.orbatShortName, unit.shortName, unit.name]);

  const customSidc = useMemo(() => {
    const currentSidc = unit._state?.sidc || unit.sidc;
    if (currentSidc.startsWith(CUSTOM_SYMBOL_PREFIX)) {
      return currentSidc.slice(CUSTOM_SYMBOL_SLICE);
    }
    return null;
  }, [unit._state?.sidc, unit.sidc]);

  const isActiveUnit = activeUnitId === unit.id;
  const isParent = Boolean(item.children && item.children.length);
  
  const hasActiveChildren = useMemo(() => 
    activeUnitStore.activeUnitParentIds.includes(unit.id),
    [activeUnitStore.activeUnitParentIds, unit.id]
  );

  const { unitMenuItems: menuItems } = useUnitMenu(item, isLocked, isSideGroupLocked);

  // --- Handlers ---

  const toggleOpen = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    const newValue = !isOpen;
    setIsOpen(newValue);
    // Update via store to persist state (don't mutate frozen object)
    // unit._isOpen is read-only in React, need to update via store action
  }, [isOpen]);

  // Logic for Auto-Expand on Drag Hover
  const startOpenTimeout = () => {
    if (expandTimeoutRef.current) clearTimeout(expandTimeoutRef.current);
    expandTimeoutRef.current = setTimeout(() => {
      setIsOpen(true);
      // unit._isOpen is read-only - state persisted via React state
    }, 500);
  };

  const stopOpenTimeout = () => {
    if (expandTimeoutRef.current) {
      clearTimeout(expandTimeoutRef.current);
      expandTimeoutRef.current = null;
    }
  };

  // --- Effects (Drag and Drop) ---

  useEffect(() => {
    const element = itemRef.current;
    const dragHandle = dragItemRef.current;

    if (!element || !dragHandle) return;

    return combine(
      draggable({
        element: dragHandle,
        canDrag: () => !isUnitLocked(unit.id),
        getInitialData: () => getUnitDragItem({ unit }),
        onDragStart: () => setIsDragged(true),
        onDrop: () => setIsDragged(false),
      }),
      dropTargetForElements({
        element,
        getData: ({ input, element }) => {
          const data = getUnitDragItem({ unit });
          return attachInstruction(data, {
            input,
            element,
            currentLevel: level,
            indentPerLevel: 20,
            block: ["reparent"],
            mode:
              isParent && isOpen
                ? "expanded"
                : lastInGroup
                ? "last-in-group"
                : "standard",
          });
        },
        canDrop: ({ source }) => {
          return (
            !isUnitLocked(unit.id) &&
            isUnitDragItem(source.data) &&
            source.data.unit.id !== unit.id &&
            unit._pid !== source.data.unit.id &&
            // @ts-ignore: selectedUnitIds is likely a Set
            !selectedUnitIds.has(unit.id)
          );
        },
        onDragEnter: () => setIsDragOver(true),
        onDrag: (args) => {
          const newInstruction = extractInstruction(args.self.data);
          setInstruction(newInstruction);

          if (
            newInstruction?.type === "make-child" &&
            isParent &&
            !isOpen &&
            !expandTimeoutRef.current
          ) {
            startOpenTimeout();
          }

          if (newInstruction?.type !== "make-child" && expandTimeoutRef.current) {
            stopOpenTimeout();
          }
        },
        onDragLeave: () => {
          setIsDragOver(false);
          setInstruction(null);
          stopOpenTimeout();
        },
        onDrop: () => {
          setIsDragOver(false);
          setInstruction(null);
          stopOpenTimeout();
        },
      })
    );
  }, [unit, level, isParent, isOpen, lastInGroup, isUnitLocked, selectedUnitIds]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => stopOpenTimeout();
  }, []);


  // --- Render ---

  return (
    <li id={`ou-${unit.id}`} className="text-foreground relative">
      <div
        ref={itemRef}
        className={cn(
          "group relative flex items-center justify-between border-l-2 py-1 pl-2 sm:pl-0 cursor-pointer",
          selectedUnitIds.has(unit.id) && selectedUnitIds.size > 1
            ? "bg-primary/10 hover:bg-sidebar-accent/60"
            : "",
          isActiveUnit ? "border-primary bg-primary/10" : "border-transparent"
        )}
        onDoubleClick={toggleOpen}
        onClick={(e) => onUnitClick(unit, e)}
      >
        <div className="flex items-center space-x-1">
          {/* Expand/Collapse Button */}
          <div className="h-6 w-6 flex items-center justify-center">
            {isParent && (
              <button onClick={toggleOpen} type="button">
                <ChevronRight
                  className={cn(
                    "text-muted-foreground group-hover:text-foreground h-6 w-6 transform transition-transform",
                    isOpen && "rotate-90",
                    hasActiveChildren && "text-primary"
                  )}
                />
              </button>
            )}
          </div>

          {/* Unit Icon and Name */}
          <button className="flex items-center space-x-1 text-sm" type="button">
            <span className={cn("flex items-center space-x-1", isDragged && "opacity-20")}>
              {/* Draggable Icon Area */}
              <div
                className="relative flex cursor-move justify-center"
                style={{ width: `${settingsStore.orbatIconSize}pt` }}
                ref={dragItemRef}
              >
                {customSidc ? (
                  <img
                    src={state.customSymbolMap[customSidc]?.src ?? ""}
                    alt={unitLabel}
                    style={{ width: `${settingsStore.orbatIconSize * 1.2}px` }}
                    draggable="false"
                  />
                ) : (
                  <>
                    <MilitarySymbol
                      sidc={unit._state?.sidc || unit.sidc}
                      size={settingsStore.orbatIconSize}
                      options={combinedOptions}
                    />
                    {unit.reinforcedStatus && (
                      <span className="absolute -top-2 -right-2.5 text-xs font-medium">
                        {mapReinforcedStatus2Field(unit.reinforcedStatus, {
                          compact: true,
                        })}
                      </span>
                    )}
                  </>
                )}
              </div>

              {/* Label */}
              <span
                className={cn(
                  "flex-auto pl-1 text-left",
                  isActiveUnit && "font-medium"
                )}
              >
                {unitLabel}
              </span>
              
              {unit._state?.location && (
                <span className="text-destructive-foreground">&deg;</span>
              )}
            </span>
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center">
          {unit.locked && <Lock className="text-muted-foreground h-4 w-4 mr-1" />}
          
          <div className="shrink-0 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 transition-opacity">
            <DotsMenu
              items={menuItems}
              onAction={(action) => onUnitAction(unit, action)}
            />
          </div>
        </div>

        {/* Drop Indicator */}
        {instruction && <TreeDropIndicator instruction={instruction} />}
      </div>

      {/* Recursive Children */}
      {isOpen && item.children && item.children.length > 0 && (
        <ul className="ml-6 pb-1">
          {item.children.map((subUnit, index) => (
            <OrbatTreeItem
              key={subUnit.unit.id}
              item={subUnit}
              level={level + 1}
              lastInGroup={index === item.children!.length - 1}
              symbolOptions={symbolOptions}
              onUnitAction={onUnitAction}
              onUnitClick={onUnitClick}
            />
          ))}
        </ul>
      )}
    </li>
  );
}