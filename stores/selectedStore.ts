import { create } from "zustand";
import { type DetailsPanel } from "@/modules/scenarioeditor/types"; // Import types
import type { FeatureId } from "@/types/scenarioGeoModels";
import type { EntityId } from "@/types/base";

// Helper type for the store state
export type SelectedScenarioFeatures = Set<FeatureId>;

interface SelectedState {
  // --- State ---
  selectedUnitIds: Set<EntityId>;
  activeUnitId: EntityId | null;

  selectedFeatureIds: SelectedScenarioFeatures;
  activeFeatureId: FeatureId | null;

  selectedMapLayerIds: SelectedScenarioFeatures;
  activeMapLayerId: FeatureId | null;

  selectedScenarioEventIds: Set<EntityId>;
  activeScenarioEventId: EntityId | null;

  showScenarioInfo: boolean;

  // --- Actions ---
  // "Set Active" logic mimics the Vue computed setter: 
  // It clears everything else, then selects/activates the target.
  setActiveUnitId: (id: EntityId | null) => void;
  setActiveFeatureId: (id: FeatureId | null) => void;
  setActiveMapLayerId: (id: FeatureId | null) => void;
  setActiveScenarioEventId: (id: EntityId | null) => void;
  setShowScenarioInfo: (show: boolean) => void;

  // "Multi-select" actions (mimics direct Set mutation + Watcher logic)
  toggleUnitSelection: (id: EntityId) => void;
  toggleFeatureSelection: (id: FeatureId) => void;
  
  selectFeature: (id: FeatureId) => void;
  deselectFeature: (id: FeatureId) => void;

  setSelectedUnitIds: (ids: Set<EntityId>) => void;
  addSelectedUnitId: (id: EntityId) => void;
  deleteSelectedUnitId: (id: EntityId) => void;
  clearSelectedUnitIds: () => void;

  setSelectedFeatureIds: (ids: Set<FeatureId>) => void;
  clearSelectedFeatureIds: () => void;

  // General
  clear: () => void;
}

// Helper to simulate the Vue 'watch' logic for syncing Active ID with Set
// Rule: If Set has 1 item, make it active. If 0, clear active.
function syncActiveId<T>(selectedSet: Set<T>, currentActiveId: T | null): T | null {
  if (selectedSet.size === 1) {
    const singleItem = Array.from(selectedSet)[0];
    // Only update if not already active to avoid loops (though less relevant in Reducer logic)
    if (currentActiveId !== singleItem) return singleItem;
  } else if (selectedSet.size === 0) {
    return null;
  }
  return currentActiveId;
}

export const useSelectedStore = create<SelectedState>((set, get) => ({
  // --- Initial State ---
  selectedUnitIds: new Set(),
  activeUnitId: null,
  selectedFeatureIds: new Set(),
  activeFeatureId: null,
  selectedMapLayerIds: new Set(),
  activeMapLayerId: null,
  selectedScenarioEventIds: new Set(),
  activeScenarioEventId: null,
  showScenarioInfo: false,

  // --- Clear Action ---
  clear: () =>
    set({
      selectedUnitIds: new Set(),
      // activeUnitId: null, // Original Vue code didn't explicitly null active refs in clear(), only the sets. 
      // However, the watchers would then nullify the active refs because sets became size 0.
      // So we must nullify them here to match the watcher behavior.
      activeUnitId: null,
      selectedFeatureIds: new Set(),
      activeFeatureId: null,
      selectedScenarioEventIds: new Set(),
      activeScenarioEventId: null,
      selectedMapLayerIds: new Set(),
      activeMapLayerId: null,
      showScenarioInfo: false,
    }),

  // --- Set Active Actions (Equivalent to computed setters) ---
  setSelectedFeatureIds: (ids) => {
    set((state) => ({
      selectedFeatureIds: ids,
      activeFeatureId: syncActiveId(ids, state.activeFeatureId)
    }));
  },

  clearSelectedFeatureIds: () => {
    set({
      selectedFeatureIds: new Set(),
      activeFeatureId: null
    });
  },

  setActiveUnitId: (id) => {
    get().clear();
    if (id) {
      set({ 
        activeUnitId: id, 
        selectedUnitIds: new Set([id]) 
      });
    }
  },

  setActiveFeatureId: (id) => {
    get().clear();
    if (id) {
      set({ 
        activeFeatureId: id, 
        selectedFeatureIds: new Set([id]) 
      });
    }
  },

  setActiveScenarioEventId: (id) => {
    get().clear();
    if (id) {
      set({ 
        activeScenarioEventId: id, 
        selectedScenarioEventIds: new Set([id]) 
      });
    }
  },

  setActiveMapLayerId: (id) => {
    get().clear();
    if (id) {
      set({ 
        activeMapLayerId: id, 
        selectedMapLayerIds: new Set([id]) 
      });
    }
  },

  setShowScenarioInfo: (show) => {
    if (show) get().clear();
    set({ showScenarioInfo: show });
  },

  selectFeature: (id) => {
    set((state) => {
      const newSet = new Set(state.selectedFeatureIds);
      newSet.add(id);
      return {
        selectedFeatureIds: newSet,
        activeFeatureId: syncActiveId(newSet, state.activeFeatureId)
      };
    });
  },

  deselectFeature: (id) => {
    set((state) => {
      const newSet = new Set(state.selectedFeatureIds);
      newSet.delete(id);
      return {
        selectedFeatureIds: newSet,
        activeFeatureId: syncActiveId(newSet, state.activeFeatureId)
      };
    });
  },

  // --- Toggle/Modification Actions (Equivalent to mutating sets + watching) ---

  toggleUnitSelection: (id) => {
    set((state) => {
      const newSet = new Set(state.selectedUnitIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      
      return {
        selectedUnitIds: newSet,
        activeUnitId: syncActiveId(newSet, state.activeUnitId)
      };
    });
  },

  toggleFeatureSelection: (id) => {
    set((state) => {
      const newSet = new Set(state.selectedFeatureIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);

      return {
        selectedFeatureIds: newSet,
        activeFeatureId: syncActiveId(newSet, state.activeFeatureId)
      };
    });
  },

  setSelectedUnitIds: (ids) => {
    set((state) => ({
      selectedUnitIds: ids,
      activeUnitId: syncActiveId(ids, state.activeUnitId)
    }));
  },

  addSelectedUnitId: (id) => {
    set((state) => {
      const newSet = new Set(state.selectedUnitIds);
      newSet.add(id);
      return {
        selectedUnitIds: newSet,
        activeUnitId: syncActiveId(newSet, state.activeUnitId)
      };
    });
  },

  deleteSelectedUnitId: (id) => {
    set((state) => {
      const newSet = new Set(state.selectedUnitIds);
      newSet.delete(id);
      return {
        selectedUnitIds: newSet,
        activeUnitId: syncActiveId(newSet, state.activeUnitId)
      };
    });
  },

  clearSelectedUnitIds: () => {
    set({
      selectedUnitIds: new Set(),
      activeUnitId: null
    });
  },
}));

// --- Derived State Hook (Equivalent to activeDetailsPanel computed) ---

export function useActiveDetailsPanel(): DetailsPanel | null | undefined {
  const selectedFeatureSize = useSelectedStore(s => s.selectedFeatureIds.size);
  const activeUnitId = useSelectedStore(s => s.activeUnitId);
  const selectedUnitSize = useSelectedStore(s => s.selectedUnitIds.size);
  const activeScenarioEventId = useSelectedStore(s => s.activeScenarioEventId);
  const activeMapLayerId = useSelectedStore(s => s.activeMapLayerId);
  const showScenarioInfo = useSelectedStore(s => s.showScenarioInfo);

  if (selectedFeatureSize > 0) {
    return "feature";
  }
  if (activeUnitId || selectedUnitSize > 0) {
    return "unit";
  }
  if (activeScenarioEventId) {
    return "event";
  }
  if (activeMapLayerId) {
    return "mapLayer";
  }
  if (showScenarioInfo) {
    return "scenario";
  }
  return undefined;
}

// --- Compatibility Hook (Optional) ---
// Mimics the original useSelectedItems return signature for easier refactoring
export function useSelectedItems() {
  const store = useSelectedStore();
  const activeDetailsPanel = useActiveDetailsPanel();

  return {
    ...store,
    activeDetailsPanel,
  };
}