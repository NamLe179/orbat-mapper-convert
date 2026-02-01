"use client";

import React, { useEffect, useRef } from "react";
import { ArrowSmallDownIcon, ArrowSmallUpIcon } from "@heroicons/react/20/solid";
import type {
  CheckedState,
  ColumnWidths,
  RuntimeColumnProperties,
} from "@/modules/grid/gridTypes";
import GridHeaderResizeHandle from "@/modules/grid/GridHeaderResizeHandle";

interface OrbatGridHeaderProps {
  columnDefs: RuntimeColumnProperties[];
  rowHeight?: number;
  select?: boolean;
  checkedState?: CheckedState; // 'checked' | 'indeterminate' | false
  
  // defineModel replacement
  columnWidths: ColumnWidths;
  onColumnWidthsChange: (widths: ColumnWidths) => void;

  // Emits replacements
  onToggleSelect?: (checked: boolean) => void;
  onSort?: (column: RuntimeColumnProperties) => void;
  onDragging?: (isDragging: boolean) => void;
}

export default function OrbatGridHeader({
  columnDefs,
  rowHeight, // eslint-disable-line @typescript-eslint/no-unused-vars
  select = false,
  checkedState = false,
  columnWidths,
  onColumnWidthsChange,
  onToggleSelect,
  onSort,
  onDragging,
}: OrbatGridHeaderProps) {
  
  // --- Indeterminate Checkbox Logic ---
  const checkboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = checkedState === "indeterminate";
    }
  }, [checkedState]);

  // --- Handlers ---

  function toggleSelectAll(event: React.ChangeEvent<HTMLInputElement>) {
    onToggleSelect?.(event.target.checked);
  }

  function updateWidth(columnId: string, newWidth: number) {
    // React state immutability pattern
    const newWidths = { ...columnWidths, [columnId]: newWidth };
    onColumnWidthsChange(newWidths);
  }

  function resetWidth(columnId: string) {
    const defaultWidth = columnDefs.find((c) => c.id === columnId)?.width || 300;
    const newWidths = { ...columnWidths, [columnId]: defaultWidth };
    onColumnWidthsChange(newWidths);
  }

  function onColumnClick(column: RuntimeColumnProperties) {
    if (column.sortable) {
      onSort?.(column);
    }
  }

  return (
    <header className="sticky top-0 z-10">
      <div className="flex divide-x divide-gray-200">
        {/* Selection Checkbox Column */}
        {select && (
          <div className="bg-muted text-foreground flex w-10 shrink-0 items-center justify-center overflow-hidden border-b px-4 py-3.5">
            <input
              ref={checkboxRef}
              type="checkbox"
              className="text-primary focus:ring-ring rounded border-gray-300 sm:left-6"
              onChange={toggleSelectAll}
              checked={checkedState === "checked" || checkedState === "indeterminate"}
            />
          </div>
        )}

        {/* Columns Loop */}
        {columnDefs.map((column) => (
          <div
            key={column.id}
            style={{
              width: `${columnWidths[column.id]}px`,
              minWidth: `${columnWidths[column.id]}px`,
            }}
            role="columnheader"
            className={`bg-muted text-foreground relative flex w-full flex-0 items-center justify-between overflow-hidden border-b px-4 py-3.5 text-left text-sm font-semibold ${
              column.sortable ? "cursor-pointer" : ""
            }`}
            onClick={() => onColumnClick(column)}
          >
            <span className="truncate">{column.label}</span>
            
            {/* Sort Icon */}
            {column.sortable && column.sorted && (
              <span className="text-muted-foreground group-hover:bg-accent flex-none rounded">
                {column.sorted === "asc" ? (
                  <ArrowSmallDownIcon className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <ArrowSmallUpIcon className="h-5 w-5" aria-hidden="true" />
                )}
              </span>
            )}

            {/* Resize Handle */}
            {column.resizable && (
              <GridHeaderResizeHandle
                width={columnWidths[column.id]}
                onUpdate={(val: number) => updateWidth(column.id, val)}
                onDragging={(isDragging: boolean) => onDragging?.(isDragging)}
              />
            )}
          </div>
        ))}
        
        {/* Spacer div (from original vue template) */}
        <div></div>
      </div>
    </header>
  );
}