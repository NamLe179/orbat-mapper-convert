import { create } from "zustand";
import { persist } from "zustand/middleware";

// -----------------------------------------------------------------------------
// 1. Types
// -----------------------------------------------------------------------------

export type ToeEditMode = "assigned" | "onHand";
export type ToeChangeMode = "absolute" | "diff";

// -----------------------------------------------------------------------------
// 2. Toe Edit Store (General Settings)
// -----------------------------------------------------------------------------

interface ToeEditState {
  // State
  isToeEditMode: boolean; // Ephemeral
  toeEditMode: ToeEditMode; // Persisted
  showAssigned: boolean; // Persisted
  showOnHand: boolean; // Persisted
  showPercentage: boolean; // Persisted
  changeMode: ToeChangeMode; // Persisted

  // Actions
  toggleEditToeMode: (value?: boolean) => void;
  setToeEditMode: (mode: ToeEditMode) => void;
  setShowAssigned: (value: boolean) => void;
  setShowOnHand: (value: boolean) => void;
  setShowPercentage: (value: boolean) => void;
  setChangeMode: (mode: ToeChangeMode) => void;
}

export const useToeEditStore = create<ToeEditState>()(
  persist(
    (set) => ({
      // --- Initial State ---
      isToeEditMode: false,
      toeEditMode: "assigned",
      showAssigned: true,
      showOnHand: true,
      showPercentage: true,
      changeMode: "absolute",

      // --- Actions ---
      toggleEditToeMode: (value) =>
        set((state) => ({
          isToeEditMode: typeof value === "boolean" ? value : !state.isToeEditMode,
        })),
      
      setToeEditMode: (mode) => set({ toeEditMode: mode }),
      setShowAssigned: (value) => set({ showAssigned: value }),
      setShowOnHand: (value) => set({ showOnHand: value }),
      setShowPercentage: (value) => set({ showPercentage: value }),
      setChangeMode: (mode) => set({ changeMode: mode }),
    }),
    {
      name: "toe-store", // Key for localStorage
      // Only persist fields that used useLocalStorage in the original code
      partialize: (state) => ({
        toeEditMode: state.toeEditMode,
        showAssigned: state.showAssigned,
        showOnHand: state.showOnHand,
        showPercentage: state.showPercentage,
        changeMode: state.changeMode,
      }),
    }
  )
);

// -----------------------------------------------------------------------------
// 3. Supplies Edit Store
// -----------------------------------------------------------------------------

interface SuppliesEditState {
  // State
  isSuppliesEditMode: boolean; // Ephemeral
  isOnHandMode: boolean; // Persisted
  isDiffMode: boolean; // Persisted
  diffValue: number; // Ephemeral

  // Actions
  setIsSuppliesEditMode: (value: boolean) => void;
  setIsOnHandMode: (value: boolean) => void;
  setIsDiffMode: (value: boolean) => void;
  setDiffValue: (value: number) => void;
}

export const useSuppliesEditStore = create<SuppliesEditState>()(
  persist(
    (set) => ({
      isSuppliesEditMode: false,
      isOnHandMode: false,
      isDiffMode: false,
      diffValue: 1,

      setIsSuppliesEditMode: (value) => set({ isSuppliesEditMode: value }),
      setIsOnHandMode: (value) => set({ isOnHandMode: value }),
      setIsDiffMode: (value) => set({ isDiffMode: value }),
      setDiffValue: (value) => set({ diffValue: value }),
    }),
    {
      name: "supplies-store",
      partialize: (state) => ({
        isOnHandMode: state.isOnHandMode,
        isDiffMode: state.isDiffMode,
      }),
    }
  )
);

// -----------------------------------------------------------------------------
// 4. Equipment Edit Store
// -----------------------------------------------------------------------------

interface EquipmentEditState {
  // State
  isEditMode: boolean; // Ephemeral
  isOnHandMode: boolean; // Persisted
  isDiffMode: boolean; // Persisted
  showAddForm: boolean; // Persisted
  diffValue: number; // Ephemeral
  includeSubordinates: boolean; // Persisted

  // Actions
  setIsEditMode: (value: boolean) => void;
  setIsOnHandMode: (value: boolean) => void;
  setIsDiffMode: (value: boolean) => void;
  setShowAddForm: (value: boolean) => void;
  setDiffValue: (value: number) => void;
  setIncludeSubordinates: (value: boolean) => void;
}

export const useEquipmentEditStore = create<EquipmentEditState>()(
  persist(
    (set) => ({
      isEditMode: false,
      isOnHandMode: false,
      isDiffMode: false,
      showAddForm: false,
      diffValue: 1,
      includeSubordinates: true,

      setIsEditMode: (value) => set({ isEditMode: value }),
      setIsOnHandMode: (value) => set({ isOnHandMode: value }),
      setIsDiffMode: (value) => set({ isDiffMode: value }),
      setShowAddForm: (value) => set({ showAddForm: value }),
      setDiffValue: (value) => set({ diffValue: value }),
      setIncludeSubordinates: (value) => set({ includeSubordinates: value }),
    }),
    {
      name: "equipment-store",
      partialize: (state) => ({
        isOnHandMode: state.isOnHandMode,
        isDiffMode: state.isDiffMode,
        showAddForm: state.showAddForm,
        includeSubordinates: state.includeSubordinates,
      }),
    }
  )
);

// -----------------------------------------------------------------------------
// 5. Personnel Edit Store
// -----------------------------------------------------------------------------

interface PersonnelEditState {
  // State
  isEditMode: boolean; // Ephemeral
  isOnHandMode: boolean; // Persisted
  isDiffMode: boolean; // Persisted
  showAddForm: boolean; // Persisted
  diffValue: number; // Ephemeral
  includeSubordinates: boolean; // Persisted

  // Actions
  setIsEditMode: (value: boolean) => void;
  setIsOnHandMode: (value: boolean) => void;
  setIsDiffMode: (value: boolean) => void;
  setShowAddForm: (value: boolean) => void;
  setDiffValue: (value: number) => void;
  setIncludeSubordinates: (value: boolean) => void;
}

export const usePersonnelEditStore = create<PersonnelEditState>()(
  persist(
    (set) => ({
      isEditMode: false,
      isOnHandMode: false,
      isDiffMode: false,
      showAddForm: false,
      diffValue: 1,
      includeSubordinates: true,

      setIsEditMode: (value) => set({ isEditMode: value }),
      setIsOnHandMode: (value) => set({ isOnHandMode: value }),
      setIsDiffMode: (value) => set({ isDiffMode: value }),
      setShowAddForm: (value) => set({ showAddForm: value }),
      setDiffValue: (value) => set({ diffValue: value }),
      setIncludeSubordinates: (value) => set({ includeSubordinates: value }),
    }),
    {
      name: "personnel-store",
      partialize: (state) => ({
        isOnHandMode: state.isOnHandMode,
        isDiffMode: state.isDiffMode,
        showAddForm: state.showAddForm,
        includeSubordinates: state.includeSubordinates,
      }),
    }
  )
);

// -----------------------------------------------------------------------------
// 6. Export Union Type
// -----------------------------------------------------------------------------

// This type represents the *instance* (result of calling the hook)
// of either Equipment or Personnel store.
export type ToeEditStore =
  | ReturnType<typeof useEquipmentEditStore>
  | ReturnType<typeof usePersonnelEditStore>;