"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { ChevronUp, Eye, EyeOff, Lock, GripVertical, Filter, FilterIcon } from "lucide-react";
import { useDebounceValue } from "usehooks-ts";

// DnD & Types
import { type SideAction, SideActions, type UnitAction } from "@/types/constants";
import type { NSide, NSideGroup, NUnit } from "@/types/internalModels";
import { 
  getSideDragItem, 
  isSideDragItem, 
  isSideGroupDragItem, 
  isUnitDragItem 
} from "@/types/draggables";
import { 
  attachInstruction, 
  extractInstruction, 
  type Instruction 
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item";
import { draggable, dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";

// Hooks & Stores
import { useActiveScenario } from "@/components/injects";
import { useScenarioState } from "@/scenariostore/useScenarioState";
import { cn } from "@/lib/utils";

// Custom timeout hook
function useTimeoutFn(callback: () => void, delay: number) {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const [isPending, setIsPending] = useState(false);

  const start = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsPending(true);
    timeoutRef.current = setTimeout(() => {
      callback();
      setIsPending(false);
    }, delay);
  };

  const cancel = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      setIsPending(false);
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return [() => isPending, start, cancel] as const;
}

// Components
import FilterQueryInput from "./FilterQueryInput";
import EditSideForm from "./EditSideForm";
import OrbatSideGroup from "./OrbatSideGroup";
import OrbatTree from "@/components/OrbatTree";
import TreeDropIndicator from "@/components/TreeDropIndicator";
import SideDropdownMenu from "@/modules/scenarioeditor/SideDropdownMenu";
import { Toggle } from "@/components/ui/toggle";

interface OrbatSideProps {
  side: NSide;
  hideFilter?: boolean;
  onUnitAction: (unit: NUnit, action: UnitAction) => void;
  onUnitClick: (unit: NUnit, event: React.MouseEvent) => void;
  onSideAction: (side: NSide, action: SideAction) => void;
}

export default function OrbatSide({
  side,
  hideFilter = false,
  onUnitAction,
  onUnitClick,
  onSideAction: emitSideAction,
}: OrbatSideProps) {
  const { store, unitActions } = useActiveScenario();
  const state = useScenarioState(store);

  // --- Refs ---
  const dropRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);

  // --- State ---
  const [isOpen, setIsOpen] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [instruction, setInstruction] = useState<Instruction | null>(null);
  const [showEditSideForm, setShowEditSideForm] = useState(!!side._isNew);
  const [showFilter, setShowFilter] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const [hasLocationFilter, setHasLocationFilter] = useState(false);

  const [debouncedFilterQuery] = useDebounceValue(filterQuery, 100);

  // --- Computed ---
  const isLocked = useMemo(() => !!side.locked, [side.locked]);
  const isHidden = useMemo(() => !!side.isHidden, [side.isHidden]);
  const sideGroups = useMemo(() => 
    state ? side.groups.map((id) => state.sideGroupMap[id]).filter(Boolean) : [], 
    [side.groups, state]
  );

  const [isPending, startOpenTimeout, stopOpenTimeout] = useTimeoutFn(() => {
    setIsOpen(true);
  }, 500);

  // --- DnD Lifecycle ---
  useEffect(() => {
    const element = dropRef.current;
    const dragHandle = dragRef.current;
    if (!element || !dragHandle) return;

    return combine(
      draggable({
        element,
        dragHandle,
        getInitialData: () => getSideDragItem({ side }),
        onDragStart: () => setIsDragging(true),
        onDrop: () => setIsDragging(false),
      }),
      dropTargetForElements({
        element,
        getData: ({ input, element, source }) => {
          const data = getSideDragItem({ side });
          return attachInstruction(data, {
            input,
            element,
            currentLevel: 0,
            indentPerLevel: 0,
            block: isSideDragItem(source.data)
              ? ["make-child", "reparent"]
              : ["reparent", "instruction-blocked", "reorder-above", "reorder-below"],
            mode: "standard",
          });
        },
        canDrop: ({ source }) => (
          isUnitDragItem(source.data) ||
          (isSideGroupDragItem(source.data) && source.data.sideGroup._pid !== side.id) ||
          (isSideDragItem(source.data) && source.data.side.id !== side.id)
        ),
        onDragEnter: () => setIsDragOver(true),
        onDrag: (args) => {
          if ((isUnitDragItem(args.source.data) || isSideGroupDragItem(args.source.data)) && !isOpen && !isPending()) {
            startOpenTimeout();
          }
          setInstruction(extractInstruction(args.self.data));
        },
        onDragLeave: () => {
          setIsDragOver(false);
          setInstruction(null);
          stopOpenTimeout();
        },
        onDrop: (args) => {
          setIsDragOver(false);
          setInstruction(null);
          stopOpenTimeout();
          if (isSideGroupDragItem(args.source.data) && !isOpen) setIsOpen(true);
        },
      })
    );
  }, [side, isOpen, isLocked, isPending, startOpenTimeout, stopOpenTimeout]);

  // --- Handlers ---
  const handleSideAction = (action: SideAction) => {
    if (action === SideActions.AddSubordinate) {
      unitActions.createSubordinateUnit(side.id);
    } else if (action === SideActions.AddGroup) {
      unitActions.addSideGroup(side.id);
    } else if (action === SideActions.Edit) {
      setShowEditSideForm(true);
    } else {
      emitSideAction(side, action);
    }
  };

  const handleSideGroupAction = (sideGroup: NSideGroup, action: SideAction) => {
    // Logic xử lý sideGroup tương tự Vue
    switch (action) {
      case SideActions.Delete: unitActions.deleteSideGroup(sideGroup.id); break;
      case SideActions.MoveDown: unitActions.reorderSideGroup(sideGroup.id, "down"); break;
      case SideActions.MoveUp: unitActions.reorderSideGroup(sideGroup.id, "up"); break;
      case SideActions.Hide: unitActions.updateSideGroup(sideGroup.id, { isHidden: true }); break;
      case SideActions.Show: unitActions.updateSideGroup(sideGroup.id, { isHidden: false }); break;
      // ... thêm các case khác
    }
  };

  return (
    <div className="pl-4">
      <header
        ref={dropRef}
        id={`os-${side.id}`}
        className={cn(
          "group border-border bg-muted relative -ml-4 flex items-center justify-between border-y-2 py-0 pl-4 transition-opacity",
          isDragging && "opacity-20"
        )}
      >
        <div ref={dragRef} className="flex-none cursor-move">
          <GripVertical className="text-muted-foreground size-6 group-focus-within:opacity-100 group-hover:opacity-100 sm:-ml-3 sm:opacity-0" />
        </div>

        <button onClick={() => setIsOpen(!isOpen)} className="flex w-full items-center justify-between text-left">
          <span className="text-foreground text-sm font-medium">{side.name}</span>
          <ChevronUp className={cn("text-muted-foreground size-5 transition-transform", isOpen && "rotate-180")} />
        </button>

        <div className="flex items-center gap-1">
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => handleSideAction(isHidden ? SideActions.Show : SideActions.Hide)}
          >
            {isHidden ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>

          {!hideFilter && (
            <Toggle pressed={showFilter} onPressedChange={setShowFilter} className="h-8 w-8 p-0">
              <Filter className="h-5 w-5" />
            </Toggle>
          )}

          {isLocked && <Lock className="text-muted-foreground size-5" />}

          <SideDropdownMenu onAction={handleSideAction} isLocked={isLocked} isHidden={isHidden} />
        </div>

        {instruction && (
          <div className="z-10">
            <TreeDropIndicator instruction={instruction} />
          </div>
        )}
      </header>

      

      {showEditSideForm && (
        <div className="-ml-6">
          <EditSideForm sideId={side.id} onClose={() => setShowEditSideForm(false)} />
        </div>
      )}

      {isOpen && (
        <div className="transition-all">
          {showFilter && (
            <div className="mt-4 mr-10">
              <FilterQueryInput 
                value={filterQuery} 
                onValueChange={setFilterQuery}
                locationFilter={hasLocationFilter}
                onLocationFilterChange={setHasLocationFilter}
              />
            </div>
          )}

          {side.subUnits.length > 0 && state && (
            <div className={cn("mt-2", isHidden && "opacity-50")}>
              <OrbatTree
                units={side.subUnits}
                unitMap={state.unitMap}
                filterQuery={filterQuery}
                locationFilter={hasLocationFilter}
                onUnitAction={onUnitAction}
                onUnitClick={onUnitClick}
                symbolOptions={{ ...side.symbolOptions }}
              />
            </div>
          )}

          {sideGroups.map((group) => (
            <OrbatSideGroup
              key={group.id}
              group={group}
              filterQuery={debouncedFilterQuery}
              hasLocationFilter={hasLocationFilter}
              onUnitAction={onUnitAction}
              onUnitClick={onUnitClick}
              onSideGroupAction={handleSideGroupAction}
            />
          ))}
        </div>
      )}
    </div>
  );
}