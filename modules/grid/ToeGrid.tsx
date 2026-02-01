"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  HTMLProps,
  useCallback,
} from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getGroupedRowModel,
  getExpandedRowModel,
  flexRender,
  type ColumnDef,
  type InitialTableState,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
  type ColumnSizingState,
} from "@tanstack/react-table";

// Project Imports
import ToeGridTableMenu from "@/modules/scenarioeditor/ToeGridTableMenu"; // Giả định đã convert
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// --- Types ---
interface ToeGridProps {
  columns: ColumnDef<any, any>[];
  data: any[];
  rowCount?: number;
  select?: boolean;
  selectAll?: boolean;
  showGlobalFilter?: boolean;
  initialState?: InitialTableState;
  getSubRows?: (row: any) => any[];
  noIndeterminate?: boolean;
  dense?: boolean;
  isLocked?: boolean;

  // v-model replacements
  selectedItems?: any[];
  onSelectedItemsChange?: (items: any[]) => void;
  
  editedId?: string | null;
  onEditedIdChange?: (id: string | null) => void;
  
  editMode?: boolean;
  onEditModeChange?: (mode: boolean) => void;

  // Slot replacement
  renderInlineForm?: (row: any) => React.ReactNode;
}

// --- Helpers ---

// Custom hook debounce nếu chưa cài library
function useDebounceInternal<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

function IndeterminateCheckbox({
  indeterminate,
  className = "",
  ...rest
}: { indeterminate?: boolean } & HTMLProps<HTMLInputElement>) {
  const ref = useRef<HTMLInputElement>(null!);

  useEffect(() => {
    if (typeof indeterminate === "boolean") {
      ref.current.indeterminate = !rest.checked && indeterminate;
    }
  }, [ref, indeterminate, rest.checked]);

  return (
    <input
      type="checkbox"
      ref={ref}
      className={cn(
        "rounded border-gray-300 text-primary focus:ring-ring cursor-pointer",
        className
      )}
      {...rest}
    />
  );
}

// --- Main Component ---

export default function ToeGrid({
  columns: userColumns,
  data,
  select = false,
  selectAll = false,
  noIndeterminate = false,
  dense = true,
  isLocked = false,
  initialState,
  getSubRows,
  selectedItems = [],
  onSelectedItemsChange,
  editedId,
  onEditedIdChange,
  editMode,
  onEditModeChange,
  renderInlineForm,
}: ToeGridProps) {
  
  // --- Local State ---
  // (Thay thế cho tableStore refs)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [query, setQuery] = useState("");
  
  // Use custom hook or external lib
  const debouncedQuery = useDebounceInternal(query, 200);

  // --- Columns Construction ---
  const tableColumns = useMemo<ColumnDef<any, any>[]>(() => {
    const cols: ColumnDef<any, any>[] = [...userColumns];

    if (select) {
      cols.unshift({
        id: "select",
        size: 40,
        enableResizing: false,
        header: ({ table }) => (
          <IndeterminateCheckbox
            checked={table.getIsAllRowsSelected()}
            indeterminate={selectedItems.length > 0 && !table.getIsAllRowsSelected()} // Simplified logic
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <IndeterminateCheckbox
            checked={row.getIsSelected()}
            disabled={!row.getCanSelect()}
            indeterminate={!noIndeterminate ? row.getIsSomeSelected() : undefined}
            onChange={row.getToggleSelectedHandler()}
          />
        ),
      });
    }
    return cols;
  }, [userColumns, select, selectedItems.length, noIndeterminate]);

  // --- Table Instance ---
  const table = useReactTable({
    data,
    columns: tableColumns,
    initialState,
    state: {
      rowSelection,
      globalFilter: debouncedQuery,
      columnVisibility,
      columnSizing,
      sorting,
    },
    getRowId: (row) => row.id,
    enableRowSelection: true,
    columnResizeMode: "onChange",
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    autoResetExpanded: false,
    filterFromLeafRows: true,
    getSubRows,
    // State updaters
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setQuery, // Mapping direct query update
    onColumnVisibilityChange: setColumnVisibility,
    onColumnSizingChange: setColumnSizing,
    onSortingChange: setSorting,
  });

  // --- Effects (Watches) ---

  // 1. Watch selectAll / data changes
  useEffect(() => {
    if (selectAll) {
      table.toggleAllRowsSelected(true);
    }
  }, [data, selectAll, table]);

  // 2. Watch editMode -> clear editedId
  useEffect(() => {
    if (editMode === false && onEditedIdChange) {
      onEditedIdChange(null);
    }
  }, [editMode, onEditedIdChange]);

  // 3. Watch Select Toggle Prop
  useEffect(() => {
    if (!select) {
      table.toggleAllRowsSelected(false);
    }
  }, [select, table]);

  // 4. Sync Row Selection to Parent (v-model replacement)
  useEffect(() => {
    // Chỉ chạy khi rowSelection hoặc query thay đổi
    const selectedRows = table.getFilteredSelectedRowModel().flatRows.map(row => row.original);
    onSelectedItemsChange?.(selectedRows);
  }, [rowSelection, debouncedQuery, table, onSelectedItemsChange]);

  // --- Handlers ---
  const onDblClick = useCallback((row: any) => {
    if (isLocked) return;
    onEditModeChange?.(true);
    onEditedIdChange?.(row.original.id);
  }, [isLocked, onEditModeChange, onEditedIdChange]);

  // --- Render ---
  return (
    <div className="relative flow-root">
      <div className="-mx-4 max-h-96 overflow-x-auto whitespace-nowrap">
        <div className="inline-block min-w-full align-middle">
          <table
            className="w-full border-separate border-spacing-0 text-left text-sm/6"
            tabIndex={0}
          >
            <thead className="bg-muted cursor-pointer">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      role="columnheader"
                      className="bg-muted sticky top-0 z-10 max-w-0 min-w-0 truncate border-b border-b-slate-950/10 px-4 py-2 font-medium first:border-l-0 first:pl-(--gutter,--spacing(4)) last:pr-(--gutter,--spacing(4)) dark:border-b-white/10"
                      onClick={header.column.getToggleSortingHandler()}
                      style={{ width: `${header.getSize()}px` }}
                    >
                      {!header.isPlaceholder && (
                        <>
                          <div
                            className={cn(
                              "flex items-center",
                              // Accessing custom meta safely
                              (header.column.columnDef.meta as any)?.align === "right" && "flex-row-reverse"
                            )}
                          >
                            <span>
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                            </span>
                            {header.column.getCanSort() && header.column.getIsSorted() && (
                              <span className="text-muted-foreground dark:text-muted-foreground group-hover:bg-muted flex-none px-1">
                                {header.column.getIsSorted() === "asc"
                                  ? "↓" // Sử dụng Icon nếu muốn: <ArrowDownIcon />
                                  : "↑"}
                              </span>
                            )}
                          </div>
                          
                          {/* Resizer */}
                          {header.column.getCanResize() && (
                            <div
                              onDoubleClick={() => header.column.resetSize()}
                              onMouseDown={header.getResizeHandler()}
                              onTouchStart={header.getResizeHandler()}
                              onClick={(e) => e.stopPropagation()}
                              role="separator"
                              className={cn(
                                "absolute top-0 right-0 z-5 h-full w-2 cursor-col-resize border-r-2 border-r-slate-950/5 select-none hover:bg-red-100 dark:border-r-white/10",
                                header.column.getIsResizing() && "bg-red-100"
                              )}
                            />
                          )}
                        </>
                      )}
                    </th>
                  ))}
                  
                  {/* Menu Column Header */}
                  <th className="bg-muted sticky top-0 right-0 z-10 truncate border-b border-b-slate-950/10 px-4 py-2 text-right font-medium dark:border-b-white/10">
                    <ToeGridTableMenu table={table} />
                  </th>
                </tr>
              ))}
            </thead>
            
            <tbody className="text-wrap break-words">
              {table.getRowModel().rows.map((row) => (
                <React.Fragment key={row.id}>
                  {row.original.id === editedId ? (
                    <tr className="dark:even:bg-foreground/[2.5%] even:bg-zinc-950/[2.5%]">
                      <td colSpan={row.getVisibleCells().length + 1}>
                        {renderInlineForm ? renderInlineForm(row.original) : null}
                      </td>
                    </tr>
                  ) : (
                    <tr
                      data-index={row.index}
                      className="dark:even:bg-foreground/[2.5%] even:bg-zinc-950/[2.5%]"
                      onDoubleClick={(e) => onDblClick(row)}
                    >
                      {row.getVisibleCells().map((cell, idx) => (
                        <td
                          key={cell.id}
                          className={cn(
                            "max-w-0 min-w-0 px-4 first:pl-(--gutter,--spacing(4)) last:pr-(--gutter,--spacing(4))",
                            dense ? "py-2.5" : "py-4",
                            (cell.column.columnDef.meta as any)?.align === "right" && "text-right"
                          )}
                          data-index={idx}
                          style={{
                            width: `${cell.column.getSize()}px`,
                            minWidth: `${cell.column.getSize()}px`,
                          }}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      ))}
                      
                      {/* Action Cell (Fixed Right) */}
                      <td className="bg-card sticky right-0 align-middle">
                        {editMode && (
                          <div className="flex grow-0 items-center justify-end pr-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onEditedIdChange?.(row.original.id)}
                            >
                              Edit
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}