"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useEventListener } from "usehooks-ts";
import { monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { extractInstruction, type Instruction } from "@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item";

// Logic & Stores
import { useActiveScenario, useActiveParent } from "@/components/injects";
import { useSelectedItems } from "@/stores/selectedStore";
import { useUnitActions } from "@/hooks/scenarioActions";
import { useNotifications } from "@/hooks/notifications";
import { SideActions, type SideAction } from "@/types/constants";
import { isSideDragItem, isSideGroupDragItem, isUnitDragItem } from "@/types/draggables";
import { triggerPostMoveFlash, nanoid } from "@/utils";
import { serializeUnit } from "@/scenariostore/io";
import { addUnitHierarchy, orbatToText, parseApplicationOrbat } from "@/importexport/convertUtils";
import { inputEventFilter } from "@/components/helpers";
import { useScenarioState } from "@/scenariostore/useScenarioState";

// Components
import OrbatSide from "@/components/OrbatSide";
import OrbatPanelAddSide from "@/components/OrbatPanelAddSide";

// Types
import type { NSide, NSideGroup, NUnit } from "@/types/internalModels";
import type { EntityId } from "@/types/base";
import type { DropTarget } from "@/components/types";

interface Props {
  hideFilter?: boolean;
  headerSlot?: React.ReactNode;
}

export default function OrbatPanel({ hideFilter = false, headerSlot }: Props) {
  const activeScenario = useActiveScenario();
  const { store, unitActions, io, time } = activeScenario;
  const activeParentContext = useActiveParent();
  const activeParentId = activeParentContext?.activeParentId;
  const setActiveParentId = activeParentContext?.setActiveParentId;

  // Subscribe to store state changes to ensure re-renders
  const state = useScenarioState(store);
  const { selectedUnitIds, activeUnitId, setActiveUnitId } = useSelectedItems();
  const { onUnitAction } = useUnitActions();

  // --- Local State ---
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingUnit, setIsDraggingUnit] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [isCopyingState, setIsCopyingState] = useState(false);

  // --- Computed ---
  const sides = useMemo(() => {
    if (!state) return [];
    return state.sides.map((id) => state.sideMap[id]);
  }, [state]);

  // --- Drag and Drop Instruction Mapper ---
  const mapInstructionToTarget = (instruction: Instruction): DropTarget => {
    if (instruction.type === "make-child") return "on";
    if (instruction.type === "reorder-above") return "above";
    return "below";
  };

  // --- Drag and Drop Monitor ---
  useEffect(() => {
    return monitorForElements({
      canMonitor: ({ source }) =>
        isUnitDragItem(source.data) || isSideGroupDragItem(source.data) || isSideDragItem(source.data),
      onDragStart: ({ location, source }) => {
        setIsDragging(true);
        setIsCopying(location.initial.input.ctrlKey || location.initial.input.metaKey);
        setIsCopyingState((location.initial.input.ctrlKey || location.initial.input.metaKey) && location.initial.input.altKey);
        setIsDraggingUnit(isUnitDragItem(source.data));
      },
      onDrop: ({ source, location }) => {
        setIsDragging(false);
        setIsDraggingUnit(false);
        const destination = location.current.dropTargets[0];
        if (!destination) return;

        const instruction = extractInstruction(destination.data);
        if (!instruction) return;

        const isDuplicateAction = location.initial.input.ctrlKey || location.initial.input.metaKey;
        const isDuplicateState = isDuplicateAction && location.initial.input.altKey;

        const sourceData = source.data;
        const destinationData = destination.data;
        const target = mapInstructionToTarget(instruction);

        if (isUnitDragItem(sourceData)) {
          // Unit Drop Logic
          let dest: NUnit | NSideGroup | NSide | null = null;
          if (isUnitDragItem(destinationData)) dest = destinationData.unit;
          else if (isSideGroupDragItem(destinationData)) dest = destinationData.sideGroup;
          else if (isSideDragItem(destinationData)) dest = destinationData.side;

          if (dest) {
            handleUnitDrop(sourceData.unit, dest, target, { isDuplicateAction, isDuplicateState });
            if (instruction.type === "make-child" && isUnitDragItem(destinationData)) {
              destinationData.unit._isOpen = true;
            }
          }
          
          setTimeout(() => {
            const el = document.getElementById(`ou-${sourceData.unit.id}`);
            if (el) triggerPostMoveFlash(el);
          }, 0);
        } 
        // Logic cho SideGroup và Side tương tự...
      },
    });
  }, [selectedUnitIds]);

  // --- Handlers ---
  const handleUnitDrop = (
    unit: NUnit,
    destination: NUnit | NSideGroup | NSide,
    target: DropTarget,
    opts: { isDuplicateAction: boolean; isDuplicateState: boolean }
  ) => {
    store.groupUpdate(() => {
      const selUnits = new Set([...Array.from(selectedUnitIds), unit.id]);
      selUnits.forEach((id) => {
        let unitId = id;
        if (opts.isDuplicateAction) {
          unitId = unitActions.cloneUnit(id, {
            includeSubordinates: true,
            includeState: opts.isDuplicateState,
          })!;
        }
        unitActions.changeUnitParent(unitId, destination.id, target);
      });
    });
    if (opts.isDuplicateState && state) time.setCurrentTime(state.currentTime);
  };

  const calculateSelectedUnitIds = (newUnitId: EntityId): EntityId[] => {
    const lastSelectedId = Array.from(selectedUnitIds).pop();
    if (!lastSelectedId || !state) return [newUnitId];
    
    const allOpenUnits: EntityId[] = [];
    state.sides.forEach(side => {
      unitActions.walkSide(side, (u) => {
        allOpenUnits.push(u.id);
        return u._isOpen;
      });
    });

    const lastIdx = allOpenUnits.indexOf(lastSelectedId);
    const newIdx = allOpenUnits.indexOf(newUnitId);
    if (lastIdx === -1 || newIdx === -1) return [newUnitId];
    
    return allOpenUnits.slice(Math.min(lastIdx, newIdx), Math.max(lastIdx, newIdx) + 1);
  };

  const handleUnitClick = (unit: NUnit, event: React.MouseEvent) => {
    const ids = new Set(selectedUnitIds);
    if (event.shiftKey) {
      const selected = calculateSelectedUnitIds(unit.id);
      selected.forEach(id => ids.add(id));
    } else if (event.ctrlKey || event.metaKey) {
      ids.has(unit.id) ? ids.delete(unit.id) : ids.add(unit.id);
    } else {
      setActiveUnitId(unit.id);
      setActiveParentId?.(unit.id);
      return;
    }
    // Update selected store...
  };

  // --- Clipboard Handlers ---
  useEventListener("copy", (e: ClipboardEvent) => {
    if (!inputEventFilter(e)) return;
    const target = document.activeElement as HTMLElement;
    const unitEl = target.closest('li[id^="ou-"]');
    if (!unitEl || !state) return;

    const serialized = Array.from(selectedUnitIds).map(id => serializeUnit(id, state, { newId: true }));
    e.clipboardData?.setData("application/orbat", io.stringifyObject(serialized));
    e.clipboardData?.setData("text/plain", serialized.map(u => orbatToText(u).join("")).join(""));
    e.preventDefault();
  });

  useEventListener("paste", (e: ClipboardEvent) => {
    if (!inputEventFilter(e)) return;
    const target = document.activeElement as HTMLElement;
    const unitEl = target.closest('li[id^="ou-"]');
    const parentId = unitEl?.id.slice(3);

    if (parentId && e.clipboardData?.types.includes("application/orbat")) {
      const pasted = parseApplicationOrbat(e.clipboardData.getData("application/orbat"));
      pasted?.forEach(u => addUnitHierarchy(u, parentId, activeScenario));
      e.preventDefault();
    }
  });

  return (
    <div className="space-y-1 pt-2 relative">
      {headerSlot}

      

      <div className="orbat-list">
        {sides.map((side) => (
          <OrbatSide
            key={side.id}
            side={side}
            onUnitAction={onUnitAction}
            onUnitClick={handleUnitClick}
            onSideAction={(side, action) => {
              console.log("Side action:", action, "for side:", side.id);
              switch (action) {
                case SideActions.Delete:
                  unitActions.deleteSide(side.id);
                  break;
                case SideActions.MoveUp:
                  unitActions.reorderSide(side.id, "up");
                  break;
                case SideActions.MoveDown:
                  unitActions.reorderSide(side.id, "down");
                  break;
                case SideActions.Clone:
                  unitActions.cloneSide(side.id);
                  break;
                case SideActions.CloneWithState:
                  unitActions.cloneSide(side.id, { includeState: true });
                  break;
                case SideActions.Lock:
                  unitActions.updateSide(side.id, { locked: true });
                  break;
                case SideActions.Unlock:
                  unitActions.updateSide(side.id, { locked: false });
                  break;
                case SideActions.Hide:
                  unitActions.updateSide(side.id, { isHidden: true });
                  break;
                case SideActions.Show:
                  unitActions.updateSide(side.id, { isHidden: false });
                  break;
                case SideActions.Add:
                  console.log("Adding new side");
                  const newSideId = unitActions.addSide();
                  console.log("New side created with ID:", newSideId);
                  break;
                default:
                  console.warn("Unhandled side action:", action);
              }
            }}
            hideFilter={hideFilter}
          />
        ))}
      </div>

      {sides.length < 2 && (
        <div className="mt-8">
          <OrbatPanelAddSide
            simple={sides.length >= 1}
            onAdd={() => {
              console.log("Add side button clicked");
              const newSideId = unitActions.addSide();
              console.log("New side created with ID:", newSideId);
            }}
          />
        </div>
      )}

      {/* Floating Status Indicators */}
      {isDragging && isCopying && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-full border bg-background/90 px-4 py-2 shadow-lg text-sm font-medium animate-in fade-in slide-in-from-top-4">
          <p>Dragging copy mode {isCopyingState && <span className="text-primary">(including state)</span>}</p>
        </div>
      )}

      {isDraggingUnit && selectedUnitIds.size > 1 && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-full border bg-background/90 px-4 py-2 shadow-lg text-sm font-medium animate-in fade-in slide-in-from-top-4">
          <p>Dragging <span className="bg-muted px-2 py-0.5 rounded-full">{selectedUnitIds.size}</span> units</p>
        </div>
      )}
    </div>
  );
}