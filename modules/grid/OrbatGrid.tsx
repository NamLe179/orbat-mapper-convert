"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { nanoid } from "@/utils";
import { groupBy } from "@/utils"; // Giả định helper này đã có

// Types
import type {
  CheckedState,
  ColumnProperties,
  ColumnWidths,
  RuntimeColumnProperties,
  SortDirection,
} from "@/modules/grid/gridTypes";

// Components
import OrbatGridHeader from "@/modules/grid/OrbatGridHeader";
import DotsMenu from "@/components/DotsMenu";
import OrbatGridGroupRow from "@/modules/grid/OrbatGridGroupRow";
import MilitarySymbol from "@/components/MilitarySymbol";
import { getValue } from "./helpers";
import { cn } from "@/lib/utils";

interface Props {
  columns: ColumnProperties[];
  data: any[];
  rowHeight?: number;
  select?: boolean;
  selectAll?: boolean;
  selected?: any[];
  onSelectionChange?: (selected: any[]) => void;
  onAction?: (action: string, payload: { data: any; index: number }) => void;
}

export default function OrbatGrid({
  columns,
  data,
  rowHeight = 48,
  select = false,
  selectAll = false,
  selected = [],
  onSelectionChange,
  onAction,
}: Props) {
  // --- Refs & State ---
  const parentRef = useRef<HTMLDivElement>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [sortField, setSortField] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [openMap, setOpenMap] = useState<Map<any, boolean>>(new Map());

  // Initialize Column Definitions
  const [columnDefs, setColumnDefs] = useState<RuntimeColumnProperties[]>(() =>
    columns.map((column) => ({
      ...column,
      label: column.label || column.field,
      id: column.id || nanoid(),
      width: column.width || 300,
      type: column.type || "text",
      menu: column.menu || [],
      resizable: column.resizable ?? true,
      sortable: column.sortable ?? false,
      sorted: null,
      rowGroup: column.rowGroup ?? false,
      hide: column.hide ?? false,
      groupOpen: column.groupOpen ?? true,
      objectPath: column.field.split("."),
    }))
  );

  const [columnWidths, setColumnWidths] = useState<ColumnWidths>(() =>
    Object.fromEntries(columnDefs.map((e) => [e.id, e.width]))
  );

  // --- Computed (useMemo) ---
  const visibleColumnDefs = useMemo(
    () => columnDefs.filter((c) => !c.hide),
    [columnDefs]
  );

  const sortedData = useMemo(() => {
    if (!sortField) return [...data];
    return [...data].sort((a, b) => {
      const valA = a[sortField] || "";
      const valB = b[sortField] || "";
      if (sortDirection === "asc") return valA > valB ? 1 : -1;
      return valA < valB ? 1 : -1;
    });
  }, [data, sortField, sortDirection]);

  const groupField = useMemo(
    () => columnDefs.find((c) => c.rowGroup)?.field,
    [columnDefs]
  );

  const groupedData = useMemo(() => {
    if (groupField) return groupBy(sortedData, groupField); // Trả về Map<groupName, Items[]>
    return sortedData;
  }, [sortedData, groupField]);

  const visibleData = useMemo(() => {
    if (groupField && groupedData instanceof Map) {
      const result: { type: "group" | "row"; item: any }[] = [];
      for (const [groupName, items] of groupedData.entries()) {
        result.push({ type: "group", item: groupName });
        if (openMap.get(groupName) !== false) {
          items.forEach((item: any) => result.push({ type: "row", item }));
        }
      }
      return result;
    }
    return sortedData.map((item) => ({ type: "row" as const, item }));
  }, [groupedData, groupField, openMap, sortedData]);

  // Virtualization
  const rowVirtualizer = useVirtualizer({
    count: visibleData.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 10,
  });

  const checkedState = useMemo((): CheckedState => {
    if (selected.length > 0 && selected.length < data.length) return "indeterminate";
    if (selected.length > 0 && selected.length === data.length) return "checked";
    return false;
  }, [selected, data]);

  // --- Handlers ---
  const toggleSelectAll = (isChecked: boolean) => {
    onSelectionChange?.(isChecked ? [...data] : []);
  };

  const onColumnSort = (column: RuntimeColumnProperties) => {
    if (isDragging) return;
    let newDir: SortDirection = "asc";
    if (sortField === column.field) {
      newDir = sortDirection === "desc" ? "asc" : "desc";
    }
    setSortField(column.field);
    setSortDirection(newDir);

    setColumnDefs((prev) =>
      prev.map((c) => ({
        ...c,
        sorted: c.field === column.field ? newDir : null,
      }))
    );
  };

  const getGroupChecked = (groupName: any) => {
    if (!select || !(groupedData instanceof Map))
      return { checked: false, indeterminate: false };
    const groupItems = groupedData.get(groupName) || [];
    const checked = groupItems.every((e: any) => selected.includes(e));
    const indeterminate =
      !checked && groupItems.some((e: any) => selected.includes(e));
    return { checked, indeterminate };
  };

  const toggleGroupSelect = (groupName: any, isChecked: boolean) => {
    if (!(groupedData instanceof Map)) return;
    const groupItems = groupedData.get(groupName) || [];
    if (isChecked) {
      onSelectionChange?.([...new Set([...selected, ...groupItems])]);
    } else {
      onSelectionChange?.(selected.filter((item) => !groupItems.includes(item)));
    }
  };

  const toggleRowSelect = (item: any) => {
    const isSelected = selected.includes(item);
    if (isSelected) {
      onSelectionChange?.(selected.filter((i) => i !== item));
    } else {
      onSelectionChange?.([...selected, item]);
    }
  };

  // --- Effects ---
  useEffect(() => {
    if (selectAll && select) toggleSelectAll(true);
  }, []);

  return (
    <div
      ref={parentRef}
      className={cn(
        "relative h-full overflow-auto rounded-lg border shadow-sm",
        isDragging && "touch-none"
      )}
    >
      <OrbatGridHeader
        columnDefs={visibleColumnDefs}
        rowHeight={rowHeight}
        select={select}
        checkedState={checkedState}
        onToggleSelect={toggleSelectAll}
        columnWidths={columnWidths}
        onColumnWidthsChange={setColumnWidths}
        onSort={onColumnSort}
        onDragging={setIsDragging}
      />

      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const { item, type } = visibleData[virtualRow.index];
          
          if (type === "row") {
            return (
              <div
                key={virtualRow.key}
                style={{
                  height: `${rowHeight}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                }}
                className="group hover:bg-muted/50 flex divide-x divide-gray-200 border-b"
              >
                {select && (
                  <div className="flex w-10 shrink-0 items-center justify-center px-4">
                    <input
                      type="checkbox"
                      checked={selected.includes(item)}
                      onChange={() => toggleRowSelect(item)}
                      className="text-primary focus:ring-ring rounded border-gray-300"
                    />
                  </div>
                )}
                {visibleColumnDefs.map((column) => (
                  <div
                    key={column.id}
                    style={{
                      width: `${columnWidths[column.id]}px`,
                      minWidth: `${columnWidths[column.id]}px`,
                    }}
                    className="flex items-center overflow-hidden p-4"
                    tabIndex={0}
                  >
                    {column.type === "sidc" ? (
                      <MilitarySymbol sidc={getValue(item, column.objectPath)} size={20} />
                    ) : column.type === "dots" ? (
                      <DotsMenu
                        items={column.menu}
                        onAction={(action) => onAction?.(String(action), { data: item, index: virtualRow.index })}
                        className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                      />
                    ) : (
                      <span className="text-muted-foreground truncate text-sm whitespace-nowrap">
                        {getValue(item, column.objectPath)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            );
          }

          return (
            <div
              key={virtualRow.key}
              style={{
                height: `${rowHeight}px`,
                transform: `translateY(${virtualRow.start}px)`,
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
              }}
            >
              <OrbatGridGroupRow
                item={item}
                select={select}
                open={openMap.get(item) ?? true}
                onToggle={(isOpen) => {
                  const newMap = new Map(openMap);
                  newMap.set(item, isOpen);
                  setOpenMap(newMap);
                }}
                {...getGroupChecked(item)}
                onCheckedChange={(e: React.ChangeEvent<HTMLInputElement>) => toggleGroupSelect(item, e.target.checked)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}