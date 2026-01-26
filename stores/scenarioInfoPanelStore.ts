import { create } from "zustand";

interface ScenarioInfoPanelState {
  // State
  tabIndex: number;
  showAddEquipment: boolean;
  showAddPersonnel: boolean;
  showAddGroup: boolean;
  showAddSupplies: boolean;

  // Actions
  setTabIndex: (index: number) => void;
  toggleAddEquipment: (value?: boolean) => void;
  toggleAddPersonnel: (value?: boolean) => void;
  toggleAddGroup: (value?: boolean) => void;
  toggleAddSupplies: (value?: boolean) => void;

  setState: (update: Partial<ScenarioInfoPanelState>) => void;
}

export const useScenarioInfoPanelStore = create<ScenarioInfoPanelState>((set) => ({
  // --- Initial State ---
  tabIndex: 0,
  showAddEquipment: false,
  showAddPersonnel: false,
  showAddGroup: false,
  showAddSupplies: false,

  // --- Actions ---
  setTabIndex: (index) => set({ tabIndex: index }),

  // Logic mimics VueUse's useToggle: 
  // if a boolean is passed, set to that value; otherwise toggle current state.
  toggleAddEquipment: (value) =>
    set((state) => ({
      showAddEquipment: typeof value === "boolean" ? value : !state.showAddEquipment,
    })),

  toggleAddPersonnel: (value) =>
    set((state) => ({
      showAddPersonnel: typeof value === "boolean" ? value : !state.showAddPersonnel,
    })),

  toggleAddGroup: (value) =>
    set((state) => ({
      showAddGroup: typeof value === "boolean" ? value : !state.showAddGroup,
    })),

  toggleAddSupplies: (value) =>
    set((state) => ({
      showAddSupplies: typeof value === "boolean" ? value : !state.showAddSupplies,
    })),
  setState: (update) => set(update),
}));