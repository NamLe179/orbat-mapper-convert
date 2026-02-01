"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { ChevronUp } from "lucide-react";
import { 
  GripVertical, 
  Eye, 
  EyeOff, 
  Lock 
} from "lucide-react";

// Types & DnD
import { 
  type SideAction, 
  SideActions, 
  type UnitAction, 
  UnitActions 
} from "@/types/constants";
import type { NSideGroup, NUnit } from "@/types/internalModels";
import { 
  getSideGroupDragItem, 
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

  return [() => isPending, cancel, start] as const;
}

// Components
import OrbatTree from "./OrbatTree";
import SecondaryButton from "./SecondaryButton";
import EditSideGroupForm from "./EditSideGroupForm";
import TreeDropIndicator from "@/components/TreeDropIndicator";
import SideGroupDropdownMenu from "@/modules/scenarioeditor/SideGroupDropdownMenu";

interface OrbatSideGroupProps {
  group: NSideGroup;
  filterQuery?: string;
  hasLocationFilter?: boolean;
  onUnitAction: (unit: NUnit, action: UnitAction) => void;
  onUnitClick: (unit: NUnit, event: React.MouseEvent) => void;
  onSideGroupAction: (group: NSideGroup, action: SideAction) => void;
}

export default function OrbatSideGroup({
  group,
  filterQuery = "",
  hasLocationFilter = false,
  onUnitAction,
  onUnitClick,
  onSideGroupAction: emitSideGroupAction,
}: OrbatSideGroupProps) {
  const { store } = useActiveScenario();
  const state = useScenarioState(store);

  // --- Refs ---
  const dropRef = useRef<HTMLElement>(null);
  const dragRef = useRef<HTMLElement>(null);

  // --- State ---
  const [isOpen, setIsOpen] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [instruction, setInstruction] = useState<Instruction | null>(null);
  const [showEditForm, setShowEditForm] = useState(!!group._isNew);

  const [isPending, cancel, startOpenTimeout] = useTimeoutFn(() => {
    setIsOpen(true);
  }, 500);

  // --- Computed ---
  const side = useMemo(() => state ? state.sideMap[group._pid!] : null, [state, group._pid]);
  
  const isLocked = useMemo(() => !!(group.locked || side?.locked), [group.locked, side?.locked]);
  const isHidden = useMemo(() => !!(group.isHidden || side?.isHidden), [group.isHidden, side?.isHidden]);
  
  const combinedSymbolOptions = useMemo(() => ({
    ...(side?.symbolOptions || {}),
    ...(group.symbolOptions || {}),
  }), [side?.symbolOptions, group.symbolOptions]);

  // --- DnD Lifecycle ---
  useEffect(() => {
    const element = dropRef.current;
    const dragHandle = dragRef.current;
    if (!element || !dragHandle) return;

    return combine(
      draggable({
        element,
        dragHandle,
        getInitialData: () => getSideGroupDragItem({ sideGroup: group }),
        canDrag: () => !isLocked,
        onDragStart: () => setIsDragging(true),
        onDrop: () => setIsDragging(false),
      }),
      dropTargetForElements({
        element,
        getData: ({ input, element, source }) => {
          const data = getSideGroupDragItem({ sideGroup: group });
          return attachInstruction(data, {
            input,
            element,
            currentLevel: 0,
            indentPerLevel: 0,
            block: isSideGroupDragItem(source.data)
              ? ["make-child", "reparent"]
              : ["reparent", "instruction-blocked", "reorder-above", "reorder-below"],
            mode: "standard",
          });
        },
        canDrop: ({ source }) => {
          return (
            !isLocked &&
            (isUnitDragItem(source.data) ||
              (isSideGroupDragItem(source.data) &&
                source.data.sideGroup.id !== group.id))
          );
        },
        onDragEnter: () => setIsDragOver(true),
        onDrag: (args) => {
          if (isUnitDragItem(args.source.data) && !isOpen && !isPending()) {
            startOpenTimeout();
          }
          setInstruction(extractInstruction(args.self.data));
        },
        onDragLeave: () => {
          setIsDragOver(false);
          setInstruction(null);
          cancel();
        },
        onDrop: (args) => {
          setIsDragOver(false);
          setInstruction(null);
          cancel();
          if (isUnitDragItem(args.source.data) && !isOpen) {
            setIsOpen(true);
          }
        },
      })
    );
  }, [group, isLocked, isOpen, isPending, startOpenTimeout, cancel]);

  // --- Handlers ---
  const handleSideGroupAction = (action: SideAction) => {
    if (action === SideActions.Edit) {
      setShowEditForm(true);
    } else if (action === SideActions.AddSubordinate) {
      onUnitAction(group as unknown as NUnit, UnitActions.AddSubordinate);
    } else {
      emitSideGroupAction(group, action);
    }
  };

  return (
    <div>
      <header
        ref={dropRef as any}
        id={`osg-${group.id}`}
        className={cn(
          "group relative mt-1 flex items-center justify-between py-0 transition-opacity",
          isDragging && "opacity-20"
        )}
      >
        <div ref={dragRef as any} className="flex items-center">
          <GripVertical className="text-muted-foreground h-6 w-6 cursor-move group-focus-within:opacity-100 group-hover:opacity-100 sm:-ml-3 sm:opacity-0" />
        </div>

        <div className="flex flex-auto items-center">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex w-full items-center justify-between text-left"
          >
            <span className="text-heading hover:text-foreground text-sm font-medium">
              {group.name || "Units"}
            </span>
            <ChevronUp
              className={cn(
                "text-muted-foreground group-hover:text-foreground size-5 transition-transform",
                isOpen && "rotate-180"
              )}
            />
          </button>
        </div>

        {isLocked && (
          <Lock className={cn("text-muted-foreground size-5", side?.locked && "opacity-40")} />
        )}

        {isHidden && (
          <button
            type="button"
            className={cn("text-muted-foreground hover:text-foreground ml-1", side?.isHidden && "opacity-40")}
            title="Toggle visibility"
            onClick={() => handleSideGroupAction(isHidden ? SideActions.Show : SideActions.Hide)}
            disabled={!!side?.isHidden}
          >
            <EyeOff className="h-5 w-5" />
          </button>
        )}

        <SideGroupDropdownMenu
          isLocked={isLocked}
          isSideGroupLocked={!!group.locked}
          isSideLocked={!!side?.locked}
          isSideHidden={!!side?.isHidden}
          isSideGroupHidden={!!group.isHidden}
          onAction={handleSideGroupAction}
        />

        {instruction && (
          <div className="z-10 -my-2 -ml-2">
            <TreeDropIndicator instruction={instruction} />
          </div>
        )}
      </header>

      {showEditForm && (
        <div className="-ml-6">
          <EditSideGroupForm
            onClose={() => setShowEditForm(false)}
            sideGroupId={group.id}
          />
        </div>
      )}

      {isOpen && (
        <section>
          <div className={cn("mt-0", isHidden && "opacity-50")}>
            <OrbatTree
              units={group.subUnits}
              unitMap={state?.unitMap || {}}
              filterQuery={filterQuery}
              locationFilter={hasLocationFilter}
              onUnitAction={onUnitAction}
              onUnitClick={onUnitClick}
              symbolOptions={combinedSymbolOptions}
            />
          </div>
          
          {group.subUnits.length === 0 && (
            <div className="border-border mr-4 flex justify-center border-2 border-dashed p-8">
              <SecondaryButton onClick={() => handleSideGroupAction(SideActions.AddSubordinate)}>
                Add root unit
              </SecondaryButton>
            </div>
          )}
        </section>
      )}
    </div>
  );
}