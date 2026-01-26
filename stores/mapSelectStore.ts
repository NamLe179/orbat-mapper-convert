import { create } from "zustand";

interface MapSelectState {
  // State
  unitSelectEnabled: boolean;
  featureSelectEnabled: boolean;
  hoverEnabled: boolean;

  // Actions
  setUnitSelectEnabled: (enabled: boolean) => void;
  setFeatureSelectEnabled: (enabled: boolean) => void;
  setHoverEnabled: (enabled: boolean) => void;
}

export const useMapSelectStore = create<MapSelectState>((set) => ({
  // Initial State
  unitSelectEnabled: true,
  featureSelectEnabled: true,
  hoverEnabled: true,

  // Setters
  setUnitSelectEnabled: (v) => set({ unitSelectEnabled: v }),
  setFeatureSelectEnabled: (v) => set({ featureSelectEnabled: v }),
  setHoverEnabled: (v) => set({ hoverEnabled: v }),
}));