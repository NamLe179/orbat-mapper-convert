"use client";

import React from "react";
import { ChevronRightIcon } from "@heroicons/react/20/solid";
import { cn } from "@/lib/utils";

// Project Imports
import type { TableColumn } from "@/modules/scenarioeditor/types";
import type { NUnit } from "@/types/internalModels";
import GridEditableCell from "@/modules/scenarioeditor/GridEditableCell"; 
import UnitSymbol from "@/components/UnitSymbol"; 
import { useActiveScenario } from "@/components/injects"; 

interface GridUnitRowProps {
  unit: NUnit;
  itemIndex: number;
  level: number;
  columns: TableColumn[];
  isActive: boolean;

  // Events/Callbacks
  onToggle?: (unit: NUnit) => void;
  onExpand?: (unit: NUnit) => void; // Vue emit 'expand' nhưng chưa thấy dùng trong template, giữ lại cho đúng interface
  onUpdateUnit?: (id: string, data: Record<string, any>) => void;
  onNextCell?: (e: any) => void;
  onActiveItem?: (key: string) => void;
  onEdit?: (unit: NUnit, key: string, value: any) => void;
}

export default function GridUnitRow({
  unit,
  itemIndex,
  level,
  columns,
  isActive,
  onToggle,
  onUpdateUnit,
  onNextCell,
  onActiveItem,
  onEdit,
}: GridUnitRowProps) {
  // Context Hook
  const { unitActions } = useActiveScenario();
  const { getCombinedSymbolOptions } = unitActions;

  // Handlers
  const handleToggleOpen = () => {
    // React: Không mutate trực tiếp unit._isOpen. 
    // Gọi callback để parent update state.
    onToggle?.(unit);
  };

  return (
    <tr
      id={`item-${unit.id}`}
      className="divide-border hover:bg-muted/50 divide-x border-b"
    >
      {/* Active Indicator Column */}
      <td className="relative p-0">
        {isActive && (
          <div className="bg-primary absolute inset-y-0 right-0 w-0.5"></div>
        )}
      </td>

      {/* Tree Control & Unit Name Column */}
      <td className="p-0">
        <div
          id={`cell-${itemIndex}-0`}
          className="border-card text-foreground focus-within:border-ring flex items-center border-2 py-3 text-sm whitespace-nowrap outline-none"
          style={{ paddingLeft: `${level + 1}rem` }}
          tabIndex={0}
          onKeyDown={(e) => {
            // @keydown.enter.exact
            if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.altKey) {
              handleToggleOpen();
            }
          }}
          onClick={(e) => {
            // @click.self
            if (e.target === e.currentTarget) {
              handleToggleOpen();
            }
          }}
        >
          {unit.subUnits && unit.subUnits.length > 0 && (
            <button 
              type="button" 
              onClick={(e) => {
                e.stopPropagation();
                handleToggleOpen();
              }}
            >
              <ChevronRightIcon
                className={cn(
                  "text-muted-foreground group-hover:text-foreground h-6 w-6 transform transition-transform",
                  unit._isOpen && "rotate-90"
                )}
              />
            </button>
          )}

          <UnitSymbol
            sidc={unit.sidc}
            className={cn(
              "ml-2 max-w-10",
              (!unit.subUnits || unit.subUnits.length === 0) && "ml-8"
            )}
            options={{
              ...getCombinedSymbolOptions(unit),
              outlineColor: "rgba(255, 255, 255, 0.8)",
              outlineWidth: 10,
            }}
          />

          <button 
            type="button"
            className="ml-2 truncate text-sm font-medium hover:underline"
            onClick={(e) => {
                // Giả định click vào tên cũng toggle hoặc hành động khác
                // Hiện tại giữ nguyên behavior click button tên
            }}
          >
            {unit.name}
          </button>
        </div>
      </td>

      {/* Dynamic Data Columns */}
      {columns.map((column, colIndex) => (
        <td key={column.value} className="p-0">
          <GridEditableCell
            // Ép kiểu any vì NUnit có thể không có index signature khớp với column.value
            value={(unit as any)[column.value]}
            rowIndex={itemIndex}
            colIndex={colIndex + 1}
            cellType={column.type}
            onUpdate={(val: any) =>
              onUpdateUnit?.(unit.id, { [column.value]: val })
            }
            onNextCell={onNextCell}
            onActive={() => onActiveItem?.(column.value)}
            onEdit={(val: any) => onEdit?.(unit, column.value, val)}
          />
        </td>
      ))}
    </tr>
  );
}