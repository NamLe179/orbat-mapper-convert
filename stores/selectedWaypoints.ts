import { create } from "zustand";

interface SelectedWaypointsState {
  // State
  selectedWaypointIds: Set<string>;

  // Actions
  addWaypoint: (id: string) => void;
  removeWaypoint: (id: string) => void;
  toggleWaypoint: (id: string) => void;
  clearWaypoints: () => void;
  setSelectedWaypoints: (ids: Set<string>) => void;
}

export const useSelectedWaypoints = create<SelectedWaypointsState>((set) => ({
  // --- Initial State ---
  selectedWaypointIds: new Set(),

  // --- Actions ---
  
  addWaypoint: (id) =>
    set((state) => {
      const newSet = new Set(state.selectedWaypointIds);
      newSet.add(id);
      return { selectedWaypointIds: newSet };
    }),

  removeWaypoint: (id) =>
    set((state) => {
      const newSet = new Set(state.selectedWaypointIds);
      newSet.delete(id);
      return { selectedWaypointIds: newSet };
    }),

  toggleWaypoint: (id) =>
    set((state) => {
      const newSet = new Set(state.selectedWaypointIds);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return { selectedWaypointIds: newSet };
    }),

  clearWaypoints: () => set({ selectedWaypointIds: new Set() }),

  setSelectedWaypoints: (ids) => set({ selectedWaypointIds: ids }),
}));