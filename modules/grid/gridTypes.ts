import type { MenuItemData } from "@/components/types";

export type CellType = "text" | "number" | "sidc" | "dots";
export type ColumnWidths = Record<string, number>;
export type SortDirection = "asc" | "desc";

export interface ColumnProperties<TData = Record<string, any>> {
  field: keyof TData | string;
  id?: string;
  label?: string;
  width?: number;
  type?: CellType;
  menu?: MenuItemData[];
  resizable?: boolean;
  sortable?: boolean;
  rowGroup?: boolean;
  hide?: boolean;
  groupOpen?: boolean;
}

export interface RuntimeColumnProperties extends Required<ColumnProperties> {
  sorted: SortDirection | null;
  objectPath: string[];
}

export interface IId {
  id: string;
}

export interface RowData<TData = any> extends IId {
  id: string;
}

/**
 * Interface cho React Context (thay thế cho GridDataKey/InjectionKey của Vue).
 * Sử dụng: const GridContext = createContext<GridContextValue | null>(null);
 */
export interface GridContextValue {
  columnDefs: RuntimeColumnProperties; // React không cần ComputedRef wrapper
}

export type CheckedState = "indeterminate" | "checked" | false;