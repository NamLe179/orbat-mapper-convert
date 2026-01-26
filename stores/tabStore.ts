import { create } from "zustand";
import { TAB_ORBAT } from "@/types/constants";

interface TabState {
  // State
  activeScenarioTab: number; // Assuming TAB_ORBAT is a number or string based on usage
  unitDetailsTab: number;
  featureDetailsTab: number;

  // Actions
  setActiveScenarioTab: (tab: number) => void;
  setUnitDetailsTab: (tab: number) => void;
  setFeatureDetailsTab: (tab: number) => void;
  
  // Getters (Helper functions)
  isOrbatTabActive: () => boolean;
}

export const useTabStore = create<TabState>((set, get) => ({
  // --- Initial State ---
  activeScenarioTab: TAB_ORBAT,
  unitDetailsTab: 0,
  featureDetailsTab: 0,

  // --- Actions ---
  setActiveScenarioTab: (tab) => set({ activeScenarioTab: tab }),
  setUnitDetailsTab: (tab) => set({ unitDetailsTab: tab }),
  setFeatureDetailsTab: (tab) => set({ featureDetailsTab: tab }),

  // --- Getter Logic ---
  isOrbatTabActive: () => get().activeScenarioTab === TAB_ORBAT,
}));