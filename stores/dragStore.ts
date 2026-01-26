import { create } from "zustand";
import { useMemo } from "react";

// Project Types
import type { Unit } from "@/types/scenarioModels";
import type { NScenarioFeature, NUnit } from "@/types/internalModels";

// Context/Store Imports
import { useScenario } from "@/scenariostore";
import { useSelectedItems } from "@/stores/selectedStore"; // Assumed converted to React/Zustand
import { useActiveParent } from "@/components/injects"; // Hypothetical context hook

// --- 1. Drag Store (Zustand) ---

interface DragState {
  draggedUnit: Unit | null;
  draggedFiles: File[] | null;
  draggedFeature: NScenarioFeature | null;

  // Actions
  setDraggedUnit: (unit: Unit | null) => void;
  setDraggedFiles: (files: File[] | null) => void;
  setDraggedFeature: (feature: NScenarioFeature | null) => void;
  clearDrag: () => void;
}

export const useDragStore = create<DragState>((set) => ({
  draggedUnit: null,
  draggedFiles: null,
  draggedFeature: null,

  setDraggedUnit: (draggedUnit) => set({ draggedUnit }),
  setDraggedFiles: (draggedFiles) => set({ draggedFiles }),
  setDraggedFeature: (draggedFeature) => set({ draggedFeature }),
  clearDrag: () => set({ draggedUnit: null, draggedFiles: null, draggedFeature: null }),
}));

// --- 2. Active Unit Hook ---

export function useActiveUnit() {
  const { scenario } = useScenario();
  const { activeUnitId, setActiveUnitId, clear: clearSelection } = useSelectedItems();
  
  // Assuming activeParentKey corresponds to a Context providing [id, setId]
  const parentContext = useActiveParent();
  const activeParentId = parentContext?.activeParentId;
  const setActiveParentId = parentContext?.setActiveParentId;

  // Helper to ensure we have a valid scenario store instance
  const store = scenario?.store;
  const unitActions = scenario?.unitActions;
  const helpers = scenario?.helpers;

  // Computed: Active Unit
  const activeUnit = useMemo(() => {
    if (!activeUnitId || !helpers) return null;
    return helpers.getUnitById(activeUnitId) || null;
  }, [activeUnitId, helpers]);

  // Computed: Active Parent
  const activeParent = useMemo(() => {
    if (!activeParentId || !unitActions) return null;
    return unitActions.getUnitOrSideGroup(activeParentId) || null;
  }, [activeParentId, unitActions]);

  // Computed: Active Unit Hierarchy
  const activeUnitParentIds = useMemo(() => {
    if (!activeUnitId || !unitActions) return [];
    const { parents } = unitActions.getUnitHierarchy(activeUnitId);
    return parents.map((p) => p.id);
  }, [activeUnitId, unitActions]);

  // Action: Reset Active Parent
  function resetActiveParent() {
    if (!store || !helpers || !setActiveParentId) return;
    
    const firstSideId = store.state.sides[0];
    if (!firstSideId) return;

    const firstGroup = helpers.getSideById(firstSideId)?.groups[0];
    if (!firstGroup) return;

    // Assuming getSideGroupById returns the group object which has subUnits
    const groupObj = helpers.getSideGroupById(firstGroup);
    const firstSubUnit = groupObj?.subUnits[0];
    
    if (firstSubUnit) {
      setActiveParentId(firstSubUnit);
    }
  }

  // Action: Set/Toggle Unit
  function setActiveUnit(unit: NUnit | Unit) {
    setActiveUnitId(unit.id);
  }

  function toggleActiveUnit(unit: NUnit | Unit) {
    if (activeUnitId === unit.id) {
      clearSelection(); // Or setActiveUnitId(null)
    } else {
      setActiveUnitId(unit.id);
    }
  }

  return {
    activeUnitId,
    activeUnit,
    activeParent,
    activeParentId,
    activeUnitParentIds,
    
    resetActiveParent,
    clearActiveUnit: clearSelection,
    setActiveUnit,
    toggleActiveUnit,
  };
}