import { create } from "zustand";

export interface MapViewState {
  // State
  zoomLevel: number;

  // Actions
  setZoomLevel: (level: number) => void;
}

export const useMapViewStore = create<MapViewState>((set) => ({
  // Initial State
  zoomLevel: 0,

  // Actions
  setZoomLevel: (zoomLevel) => set({ zoomLevel }),
}));