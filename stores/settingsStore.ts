import { create } from "zustand";
import { persist } from "zustand/middleware";
import { type SymbologyStandard } from "@/types/scenarioModels";

// -----------------------------------------------------------------------------
// 1. Settings Store (App General Settings)
// -----------------------------------------------------------------------------

interface SettingsState {
  // State
  orbatIconSize: number;
  orbatShortName: boolean;

  // Actions
  setOrbatIconSize: (size: number) => void;
  setOrbatShortName: (value: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Defaults
      orbatIconSize: 20,
      orbatShortName: false,

      // Setters
      setOrbatIconSize: (size) => set({ orbatIconSize: size }),
      setOrbatShortName: (value) => set({ orbatShortName: value }),
    }),
    {
      name: "settings-storage", // localStorage key
      // Both fields were persisted in Vue, so defaults are fine
    }
  )
);

// -----------------------------------------------------------------------------
// 2. Symbol Settings Store
// -----------------------------------------------------------------------------

export interface SymbolSettingsState {
  // State
  symbologyStandard: SymbologyStandard;
  simpleStatusModifier: boolean;

  // Actions
  setSymbologyStandard: (standard: SymbologyStandard) => void;
  setSimpleStatusModifier: (value: boolean) => void;
  
  // Computed Getter equivalent
  getSymbolOptions: () => {
    symbologyStandard: SymbologyStandard;
    simpleStatusModifier: boolean;
  };
}

export const useSymbolSettingsStore = create<SymbolSettingsState>()(
  persist(
    (set, get) => ({
      // Defaults
      symbologyStandard: "2525",
      simpleStatusModifier: false,

      // Setters
      setSymbologyStandard: (standard) => set({ symbologyStandard: standard }),
      setSimpleStatusModifier: (value) => set({ simpleStatusModifier: value }),

      // Getter equivalent: Call this function to get the derived object
      getSymbolOptions: () => ({
        symbologyStandard: get().symbologyStandard,
        simpleStatusModifier: get().simpleStatusModifier,
      }),
    }),
    {
      name: "symbol-settings-storage",
      // Only 'simpleStatusModifier' was using useLocalStorage in original code.
      // 'symbologyStandard' was just a string literal in state.
      partialize: (state) => ({
        simpleStatusModifier: state.simpleStatusModifier,
      }),
    }
  )
);