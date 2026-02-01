"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import {
  ArrowDown as ArrowSmallDownIcon,
  ArrowUp as ArrowSmallUpIcon,
  ChevronRight as ChevronRightIcon,
} from "lucide-react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getGroupedRowModel,
  getSortedRowModel,
  type InitialTableState,
  type RowSelectionState,
  useReactTable,
  type SortingState,
  type GroupingState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils"; // Giả định utility

// Components
import InputGroup from "@/components/InputGroup";

// --- Custom Hook: useDebounce ---
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// --- Types ---
interface DataGridProps {
  columns: (ColumnDef<any, any> | false | undefined)[];
  data: any[];
  rowCount?: number;
  rowHeight?: number;
  select?: boolean;
  selected?: any[];
  selectAll?: boolean;
  showGlobalFilter?: boolean;
  initialState?: InitialTableState;
  getSubRows?: (row: any) => any[];
  noIndeterminate?: boolean;
  
  // Events
  onAction?: (action: string, data?: any) => void;
  onSelectionChange?: (selectedRows: any[]) => void;
}

export default function DataGrid({
  columns,
  data,
  rowCount,
  rowHeight = 48,
  select = false,
  selected = [],
  selectAll = false,
  showGlobalFilter = false,
  initialState,
  getSubRows,
  noIndeterminate = false,
  onSelectionChange,
}: DataGridProps) {
  // --- Refs & State ---
  const parentRef = useRef<HTMLDivElement>(null);
  
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 200);

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [grouping, setGrouping] = useState<GroupingState>([]);

  // --- Effects ---

  // Handle selectAll prop
  useEffect(() => {
    if (selectAll) {
      // Logic toggle all rows
      // Lưu ý: Trong React Table, toggleAllRowsSelected(true) cần truy cập qua instance table.
      // Tuy nhiên instance table được tạo sau. Chúng ta sẽ dùng useEffect phụ thuộc table bên dưới 
      // hoặc setRowSelection trực tiếp nếu biết ID.
      // Cách đơn giản nhất trong React model là setRowSelection object full keys.
    }
  }, [selectAll]);

  // Reset selection on data change if needed (Vue behavior matches this via watcher)
  useEffect(() => {
    if (selectAll) {
      // table.toggleAllRowsSelected(true); // Cần table instance
    }
  }, [data, selectAll]);


  // --- Columns Definition ---
  const computedColumns = useMemo(() => {
    const selectColumn: ColumnDef<any, any> = {
      id: "select",
      size: 60,
      enableResizing: false,
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllRowsSelected()}
          ref={(input) => {
            if (input) {
              input.indeterminate = table.getIsSomeRowsSelected();
            }
          }}
          onChange={table.getToggleAllRowsSelectedHandler()}
          className="m-2 rounded border-input accent-primary focus:ring-primary sm:left-6"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          ref={(input) => {
            if (input && !noIndeterminate) {
              input.indeterminate = row.getIsSomeSelected();
            }
          }}
          onChange={row.getToggleSelectedHandler()}
          className="m-2 rounded border-input accent-primary focus:ring-primary sm:left-6"
        />
      ),
    };

    const rawCols = select ? [selectColumn, ...columns] : columns;
    return rawCols.filter(Boolean) as ColumnDef<any, any>[];
  }, [columns, select, noIndeterminate]);

  // --- Table Instance ---
  const table = useReactTable({
    data,
    columns: computedColumns,
    state: {
      rowSelection,
      globalFilter: debouncedQuery,
      sorting,
      grouping,
    },
    initialState,
    enableRowSelection: true,
    columnResizeMode: "onChange",
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    autoResetExpanded: false,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onGroupingChange: setGrouping,
    onGlobalFilterChange: setQuery, // Update query state directly
    getSubRows,
    filterFromLeafRows: true,
  });

  // --- Sync Selection to Parent ---
  useEffect(() => {
    const selectedRows = table.getFilteredSelectedRowModel().flatRows.map((row) => row.original);
    onSelectionChange?.(selectedRows);
  }, [rowSelection, debouncedQuery, table, onSelectionChange]);

  // Handle selectAll imperative trigger
  useEffect(() => {
      if (selectAll) {
          table.toggleAllRowsSelected(true);
      }
  }, [selectAll, table, data]); // Re-run when data changes if selectAll is true


  // --- Virtualization ---
  const { rows } = table.getRowModel();
  
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 20,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();

  // --- Helpers ---
  const onEsc = (e: React.KeyboardEvent) => {
    if (query.length) {
      e.stopPropagation();
      setQuery("");
    }
  };

  const filteredRowCount = useMemo(() => {
    const isGrouped = table.getState().grouping.length > 0;
    if (isGrouped) {
      return table.getRowCount() - table.getGroupedRowModel().rows.length;
    }
    return table.getRowCount();
  }, [table]);

  return (
    <div className="flex flex-col">
      {/* Header / Global Filter */}
      {showGlobalFilter && (
        <header className="flex flex-none items-center justify-between pb-2">
          <InputGroup
            value={query}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
            placeholder="Filter rows"
            onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Escape') onEsc(e);
            }}
          />
          <span className="text-sm">
            ({filteredRowCount} /{" "}
            {rowCount === undefined ? data.length : rowCount})
          </span>
        </header>
      )}

      {/* Table Container */}
      <section
        className="border-border relative overflow-auto rounded-lg border shadow-sm"
        ref={parentRef}
        // Đặt chiều cao cố định hoặc max-height để virtualization hoạt động
        style={{ height: '100%', maxHeight: '80vh' }} 
      >
        <table className="grid w-full">
          {/* Table Header */}
          <thead className="sticky top-0 z-10 grid w-full">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                className="divide-border flex w-full divide-x"
              >
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    style={{ width: `${header.getSize()}px` }}
                    role="columnheader"
                    className={cn(
                      "bg-muted text-foreground relative flex items-center justify-between overflow-hidden border-b px-4 py-3.5 text-left text-sm font-semibold select-none",
                      header.column.getCanSort() && "cursor-pointer"
                    )}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {!header.isPlaceholder && (
                      <>
                        <span className="truncate">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                        </span>

                        {/* Sort Icons */}
                        {header.column.getCanSort() && header.column.getIsSorted() && (
                          <span className="text-muted-foreground group-hover:bg-muted flex-none rounded">
                            {header.column.getIsSorted() === "asc" ? (
                              <ArrowSmallDownIcon className="h-5 w-5" aria-hidden="true" />
                            ) : (
                              <ArrowSmallUpIcon className="h-5 w-5" aria-hidden="true" />
                            )}
                          </span>
                        )}

                        {/* Resizer */}
                        {header.column.getCanResize() && (
                          <div
                            onDoubleClick={() => header.column.resetSize()}
                            onMouseDown={header.getResizeHandler()}
                            onTouchStart={header.getResizeHandler()}
                            onClick={(e) => e.stopPropagation()}
                            role="separator"
                            className="absolute top-0 right-0 z-[5] h-full w-4 cursor-col-resize hover:bg-red-100 sm:w-2"
                          />
                        )}
                      </>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          {/* Table Body */}
          <tbody
            className="relative grid w-full"
            style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
          >
            {virtualRows.map((virtualRow) => {
              const row = rows[virtualRow.index];
              return (
                <tr
                  key={row.id}
                  data-index={virtualRow.index}
                  className="group divide-border hover:bg-muted absolute flex h-10 w-full divide-x text-sm left-0 top-0"
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  {row.getVisibleCells().map((cell, idx) => (
                    <td
                      key={cell.id}
                      id={cell.id}
                      style={{ width: `${cell.column.getSize()}px` }}
                      className="cell flex shrink-0 items-center overflow-hidden border-b p-4 text-nowrap"
                      data-index={idx}
                    >
                      {/* Grouping Toggle or Cell Content */}
                      {cell.getIsGrouped() ? (
                        <button
                          type="button"
                          onClick={cell.row.getToggleExpandedHandler()}
                          className="flex items-center"
                          style={{ cursor: 'pointer' }}
                        >
                          <ChevronRightIcon
                            className={cn(
                              "text-muted-foreground group-hover:text-foreground h-6 w-6 transition-transform",
                              cell.row.getIsExpanded() && "rotate-90"
                            )}
                          />
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                          &nbsp; ({cell.row.subRows.length})
                        </button>
                      ) : !cell.getIsPlaceholder() ? (
                        flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )
                      ) : null}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}