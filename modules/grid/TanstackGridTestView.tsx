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
  createColumnHelper,
  flexRender,
  type ColumnDef,
  type SortingState,
  type GroupingState,
  type RowSelectionState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ArrowSmallDownIcon,
  ArrowSmallUpIcon,
  ChevronRightIcon,
} from "@heroicons/react/20/solid";

// Project imports
import type { NUnit } from "@/types/internalModels";
import { useScenario } from "@/scenariostore"; // Giả định hook React
import { SideAction, SideActions } from "@/types/constants";
import type { MenuItemData } from "@/components/types";
import { getUnitRuntimeState } from "@/scenariostore/runtimeState"; // Importing the new runtime state accessor
import { cn } from "@/lib/utils"; // Giả định utility merge class

// Custom Components (Giả định đã convert)
import BaseButton from "@/components/BaseButton";
import MilitarySymbol from "@/components/MilitarySymbol";
import DotsMenu from "@/components/DotsMenu";
import InputGroup from "@/components/InputGroup";

// --- Types ---
interface ExtendedUnit extends NUnit {
  sideName: string;
  sideGroupName: string;
  sideId: string;
}

// --- Helpers ---

// Custom Hook Debounce (Thay thế useDebounce của VueUse)
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

// Component Checkbox hỗ trợ trạng thái Indeterminate
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
        "m-2 rounded border-gray-300 text-primary focus:ring-ring sm:left-6 cursor-pointer",
        className
      )}
      {...rest}
    />
  );
}

// --- Main Component ---

export default function TanstackGridTestView() {
  const { scenario } = useScenario();

  // --- State ---
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [grouping, setGrouping] = useState<GroupingState>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 200);
  const [data, setData] = useState<ExtendedUnit[]>([]);
  
  const parentRef = useRef<HTMLDivElement>(null);

  // Constants
  const sideMenuItems: MenuItemData<SideAction>[] = useMemo(
    () => [
      { label: "Edit", action: SideActions.Edit },
      { label: "Add group", action: SideActions.AddGroup },
      { label: "Delete side", action: SideActions.Delete },
      { label: "Move up", action: SideActions.MoveUp },
      { label: "Move down", action: SideActions.MoveDown },
    ],
    []
  );

  const onAction = useCallback((action: SideAction, props: any) => {
    console.log("on action", action, props);
  }, []);

  // --- Column Definitions ---
  const columns = useMemo<ColumnDef<ExtendedUnit, any>[]>(() => {
    const columnHelper = createColumnHelper<ExtendedUnit>();
    
    return [
      columnHelper.display({
        id: "select",
        size: 80,
        enableResizing: false,
        header: ({ table }) => (
          <IndeterminateCheckbox
            {...{
              checked: table.getIsAllRowsSelected(),
              indeterminate: table.getIsSomeRowsSelected(),
              onChange: table.getToggleAllRowsSelectedHandler(),
            }}
          />
        ),
        cell: ({ row }) => (
          <IndeterminateCheckbox
            {...{
              checked: row.getIsSelected(),
              disabled: !row.getCanSelect(),
              indeterminate: row.getIsSomeSelected(),
              onChange: row.getToggleSelectedHandler(),
            }}
          />
        ),
      }),
      columnHelper.accessor("sidc", {
        size: 80,
        header: "Icon",
        enableSorting: false,
        cell: ({ row, getValue }) => (
          <MilitarySymbol
            sidc={getValue()}
            size={20}
            modifiers={row.original.symbolOptions}
          />
        ),
      }),
      columnHelper.group({
        header: "Meta",
        columns: [
          columnHelper.accessor("name", { header: "Name" }),
          columnHelper.accessor("shortName", { header: "Short name" }),
          columnHelper.accessor("externalUrl", { header: "URL" }),
        ],
      }),
      columnHelper.accessor("sideName", { header: "Side" }),
      columnHelper.accessor("sideGroupName", { header: "Side group" }),
      columnHelper.accessor("id", {
        header: "id",
        enableGlobalFilter: false,
      }),
      columnHelper.accessor((row) => getUnitRuntimeState(row.id)?.location, {
        id: "position",
        header: "Position",
        enableSorting: false,
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: (props) => (
          <DotsMenu
            className="text-wrap"
            items={sideMenuItems}
            onAction={(action: SideAction) => onAction(action, props)}
            portal={true}
          />
        ),
      }),
    ];
  }, [sideMenuItems, onAction]);

  // --- Table Instance ---
  const table = useReactTable({
    data,
    columns,
    state: {
      rowSelection,
      grouping,
      sorting,
      globalFilter: debouncedQuery,
    },
    enableRowSelection: true,
    columnResizeMode: "onChange",
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    autoResetAll: false,
    getRowId: (row) => row.id,
    // React Table tự động xử lý functional update state, nên truyền setter trực tiếp
    onRowSelectionChange: setRowSelection,
    onGroupingChange: setGrouping,
    onSortingChange: setSorting,
    onGlobalFilterChange: setQuery, // Lưu ý: global filter thường sync với input, ở đây input sync với 'query' state
    // Nếu muốn set trực tiếp debounced value vào table state thì cần logic khác, 
    // nhưng ở đây table state globalFilter được gán từ prop 'state' nên ta không cần onGlobalFilterChange của table
  });

  // --- Virtualization ---
  const { rows } = table.getRowModel();

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 5,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();

  // --- Data Loading ---
  useEffect(() => {
    // Giả lập async load để tránh block UI
    const loadData = async () => {
      if (!scenario?.store) return;
      
      // Giả định io.loadDemoScenario đã convert sang Promise
      // await scenario.io.loadDemoScenario("falkland82");

      const { sideMap } = scenario.store.state;
      const { unitActions } = scenario;
      const unitData: ExtendedUnit[] = [];

      Object.keys(sideMap).forEach((sideId) =>
        unitActions.walkSide(
          sideId,
          (unit: any, level: any, parent: any, sideGroup: any, side: any) => {
            unitData.push({
              ...unit,
              sideId: side.id,
              sideName: side?.name,
              sideGroupName: sideGroup?.name ?? "",
              symbolOptions: unitActions.getCombinedSymbolOptions(unit),
            });
          }
        )
      );
      setData(unitData);
    };

    loadData();
  }, [scenario]);

  // --- Actions ---
  const mutateData = () => {
    setData((prev) => {
      if (prev.length === 0) return prev;
      const copy = [...prev];
      // Mutation safe way
      copy[0] = { ...copy[0], name: "Mutated" };
      return copy;
    });
  };

  // --- Debug Watcher ---
  useEffect(() => {
    // console.log(table.getState().rowSelection);
    // console.log(table.getSelectedRowModel().rows);
  }, [rowSelection, table]); // eslint-disable-line

  // --- Render ---
  return (
    <main className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-4 p-4">
        <span>
          Selected: {Object.keys(rowSelection).length} {JSON.stringify(grouping)}
        </span>
        <BaseButton onClick={mutateData}>Mutate</BaseButton>
        <InputGroup 
          value={query} 
          onChange={(e: any) => setQuery(e.target.value)} 
          placeholder="Search" 
        />
      </div>
      
      <section
        className="relative h-full overflow-auto rounded-lg border shadow-sm"
        ref={parentRef}
      >
        <div 
          style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%' }}
          className="relative"
        >
           <table className="grid w-full">
            <thead className="sticky top-0 z-10 grid w-full">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr
                  key={headerGroup.id}
                  className="flex divide-x divide-gray-200 w-full"
                >
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      style={{
                        width: `${header.getSize()}px`,
                      }}
                      role="columnheader"
                      className={cn(
                        "text-foreground bg-muted relative flex items-center justify-between overflow-hidden border-b px-4 py-3.5 text-left text-sm font-semibold select-none",
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
                          
                          {/* Grouping Button */}
                          {header.column.getCanGroup() && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                header.column.getToggleGroupingHandler()();
                              }}
                              className="mx-1"
                            >
                              GR
                            </button>
                          )}

                          {/* Sort Icons */}
                          {header.column.getCanSort() && header.column.getIsSorted() && (
                            <span className="text-muted-foreground group-hover:bg-muted flex-none rounded ml-1">
                              {header.column.getIsSorted() === "asc" ? (
                                <ArrowSmallDownIcon
                                  className="h-5 w-5"
                                  aria-hidden="true"
                                />
                              ) : (
                                <ArrowSmallUpIcon
                                  className="h-5 w-5"
                                  aria-hidden="true"
                                />
                              )}
                            </span>
                          )}

                          {/* Resize Handle */}
                          {header.column.getCanResize() && (
                            <div
                              onDoubleClick={() => header.column.resetSize()}
                              onMouseDown={header.getResizeHandler()}
                              onTouchStart={header.getResizeHandler()}
                              onClick={(e) => e.stopPropagation()}
                              role="separator"
                              className="absolute top-0 right-0 z-5 h-full w-4 cursor-col-resize hover:bg-red-100 sm:w-2"
                            />
                          )}
                        </>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            
            <tbody
              className="absolute top-0 w-full"
              // Virtualizer yêu cầu translateY trên từng row, không phải tbody
            >
              {virtualRows.map((virtualRow) => {
                const row = rows[virtualRow.index];
                return (
                  <tr
                    key={row.id}
                    data-index={virtualRow.index}
                    ref={rowVirtualizer.measureElement}
                    style={{
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    className="group hover:bg-muted/50 absolute flex h-10 w-full divide-x divide-gray-200 left-0 top-0"
                  >
                    {row.getVisibleCells().map((cell, idx) => (
                      <td
                        key={cell.id}
                        id={cell.id}
                        style={{
                          width: `${cell.column.getSize()}px`,
                        }}
                        className="cell flex shrink-0 items-center overflow-hidden border-b p-4 text-nowrap"
                        data-index={idx}
                      >
                        {cell.getIsGrouped() ? (
                          <button
                            onClick={row.getToggleExpandedHandler()}
                            className="flex items-center"
                          >
                            <ChevronRightIcon
                              className={cn(
                                "group-hover:text-foreground dark:text-muted-foreground dark:group-hover:text-foreground h-6 w-6 text-red-800 transition-transform",
                                row.getIsExpanded() && "rotate-90"
                              )}
                            />
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                            &nbsp; ({row.subRows.length})
                          </button>
                        ) : cell.getIsPlaceholder() ? null : (
                          flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}