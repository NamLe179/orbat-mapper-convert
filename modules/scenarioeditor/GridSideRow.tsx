"use client";

import React from "react";
import { ChevronRightIcon } from "@heroicons/react/20/solid";
import { cn } from "@/lib/utils";

import type { TableColumn } from "@/modules/scenarioeditor/types";
import type { NSide } from "@/types/internalModels";
import GridEditableCell from "@/modules/scenarioeditor/GridEditableCell";

interface GridSideRowProps {
  side: NSide;
  columns: TableColumn[];
  sideOpen: Map<NSide, boolean>; // Lưu ý: React không tự động track thay đổi sâu trong Map, cần đảm bảo cha render lại
  itemIndex: number;
  isActive: boolean;

  // Events
  onToggle?: (side: NSide) => void;
  onExpand?: () => void; // Defined in emits but not used in template?
  onUpdateSide?: (id: string | number, data: { name: string | number }) => void;
  onNextCell?: (el: HTMLElement | null) => void;
  onActiveItem?: (field: string) => void;
}

export default function GridSideRow({
  side,
  columns,
  sideOpen,
  itemIndex,
  isActive,
  onToggle,
  onUpdateSide,
  onNextCell,
  onActiveItem,
}: GridSideRowProps) {
  
  // Logic lấy trạng thái mở/đóng
  const isOpen = sideOpen.get(side) ?? true;

  const handleToggle = () => {
    onToggle?.(side);
  };

  const handleRowKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleToggle();
    }
  };

  return (
    <tr className="divide-border bg-muted/50 divide-x">
      {/* Indicator Column */}
      <td className="relative">
        {isActive && (
          <div className="bg-primary absolute inset-y-0 right-0 w-0.5" />
        )}
      </td>

      {/* Toggle / Side Name Column */}
      <td>
        <div
          id={`cell-${itemIndex}-0`}
          onClick={handleToggle}
          onKeyDown={handleRowKeyDown}
          tabIndex={0}
          className="border-card text-foreground focus-within:border-ring flex h-12 items-center border-2 px-4 py-2 pr-3 text-left font-semibold whitespace-nowrap hover:cursor-pointer sm:px-0 outline-none"
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggle();
            }}
            className="ml-0 focus:outline-none"
            type="button"
          >
            <ChevronRightIcon
              className={cn(
                "text-muted-foreground group-hover:text-foreground h-6 w-6 transform transition-transform",
                isOpen && "rotate-90"
              )}
            />
          </button>

          <button 
            className="ml-2 text-sm font-semibold hover:underline focus:outline-none"
            type="button"
            onClick={(e) => {
                // Prevent bubbling to parent div click
                e.stopPropagation();
                handleToggle();
            }}
          >
            {side.name}
          </button>
        </div>
      </td>

      {/* Editable Name Cell */}
      <td className="">
        <GridEditableCell
          value={side.name}
          colIndex={1}
          rowIndex={itemIndex}
          onUpdate={(val) => onUpdateSide?.(side.id, { name: val })}
          onNextCell={onNextCell}
          onActive={() => onActiveItem?.("name")}
        />
      </td>

      {/* Spacer for remaining columns */}
      <td colSpan={columns.length > 1 ? columns.length - 1 : 1}></td>
    </tr>
  );
}