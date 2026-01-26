import { create } from "zustand";
import type { SimpleStyleSpec } from "@/geo/simplestyle";

export type ToolbarType = "measurements" | "draw" | "track";

interface MainToolbarState {
  // State
  currentToolbar: ToolbarType | null;
  addMultiple: boolean;
  currentDrawStyle: Partial<SimpleStyleSpec>;
  modifyFeatureState: boolean;

  // Actions
  toggleToolbar: (toolbar: ToolbarType | null) => void;
  clearToolbar: () => void;
  
  // Setters (Added to replace direct Pinia state mutation)
  setAddMultiple: (value: boolean) => void;
  setCurrentDrawStyle: (style: Partial<SimpleStyleSpec>) => void;
  setModifyFeatureState: (value: boolean) => void;
}

export const useMainToolbarStore = create<MainToolbarState>((set) => ({
  // --- Initial State ---
  currentToolbar: null,
  addMultiple: false,
  currentDrawStyle: {},
  modifyFeatureState: false,

  // --- Actions ---
  toggleToolbar: (toolbar) =>
    set((state) => ({
      currentToolbar: state.currentToolbar === toolbar ? null : toolbar,
    })),

  clearToolbar: () => set({ currentToolbar: null }),

  // --- Setters ---
  setAddMultiple: (value) => set({ addMultiple: value }),
  
  setCurrentDrawStyle: (style) => set({ currentDrawStyle: style }),
  
  setModifyFeatureState: (value) => set({ modifyFeatureState: value }),
}));