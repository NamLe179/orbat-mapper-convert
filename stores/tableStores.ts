import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ColumnSort, VisibilityState, ColumnSizingState } from "@tanstack/react-table";

// Interface cho State và Actions
export interface TableState {
  columnVisibility: VisibilityState;
  columnSizing: ColumnSizingState;
  columnSorting: ColumnSort[];

  // Actions
  setColumnVisibility: (visibility: VisibilityState) => void;
  setColumnSizing: (sizing: ColumnSizingState) => void;
  setColumnSorting: (sorting: ColumnSort[]) => void;
}

// Factory function tạo store
function createTableStore(storeName: string) {
  return create<TableState>()(
    persist(
      (set) => ({
        // Initial State
        columnVisibility: {},
        columnSizing: {},
        columnSorting: [],

        // Actions
        setColumnVisibility: (visibility) => set({ columnVisibility: visibility }),
        setColumnSizing: (sizing) => set({ columnSizing: sizing }),
        setColumnSorting: (sorting) => set({ columnSorting: sorting }),
      }),
      {
        name: storeName, // Key trong localStorage
      }
    )
  );
}

// Tạo các hooks cụ thể
export const useSupplyCategoryTableStore = createTableStore("supplyCategoryTableStore");
export const useSupplyClassTableStore = createTableStore("supplyClassTableStore");
export const useEquipmentTableStore = createTableStore("equipmentTableStore");
export const usePersonnelTableStore = createTableStore("personnelTableStore");
export const useSupplyUoMTableStore = createTableStore("supplyUoMTableStore");
export const useUnitSupplyTableStore = createTableStore("unitSupplyTableStore");
export const useUnitEquipmentTableStore = createTableStore("unitEquipmentTableStore");
export const useUnitPersonnelTableStore = createTableStore("unitPersonnelTableStore");
export const useFillColorTableStore = createTableStore("fillColorTableStore");
export const useCustomSymbolTableStore = createTableStore("customSymbolTableStore");