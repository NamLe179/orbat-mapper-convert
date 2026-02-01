"use client";

import React from "react";
import { ChevronRightIcon } from "@heroicons/react/20/solid";
import BaseButton from "@/components/BaseButton"; 
import GridEditableCell from "@/modules/scenarioeditor/GridEditableCell"; 
import type { TableColumn } from "@/modules/scenarioeditor/types";
import type { NSideGroup } from "@/types/internalModels";
import { cn } from "@/lib/utils"; 

interface GridSideGroupRowProps {
  sideGroup: NSideGroup;
  columns: TableColumn[];
  sgOpen: Map<NSideGroup, boolean>;
  itemIndex: number;
  isActive: boolean;
  
  // Emits replacements
  onToggle: (group: NSideGroup) => void;
  onExpand: (group: NSideGroup) => void;
  onUpdateSideGroup: (id: string, data: { name: string }) => void;
  onNextCell: (e: any) => void;
  onActiveItem: (key: string) => void;
}

export default function GridSideGroupRow({
  sideGroup,
  columns,
  sgOpen,
  itemIndex,
  isActive,
  onToggle,
  onExpand,
  onUpdateSideGroup,
  onNextCell,
  onActiveItem,
}: GridSideGroupRowProps) {
  
  // Logic toggle helper
  const handleToggle = () => {
    onToggle(sideGroup);
  };

  const isOpen = sgOpen.get(sideGroup) ?? true;

  return (
    <tr className="bg-muted/40">
      {/* Active Indicator Column */}
      <td className="relative">
        {isActive && (
          <div className="bg-primary absolute inset-y-0 right-0 w-0.5"></div>
        )}
      </td>

      {/* Toggle & Label Column */}
      <td 
        className="hover:cursor-pointer" 
        onClick={() => handleToggle()}
      >
        <div
          id={`cell-${itemIndex}-0`}
          tabIndex={0}
          className="border-card bg-card/80 text-foreground focus-within:border-ring flex h-12 items-center border-2 py-2 pr-3 text-sm font-medium whitespace-nowrap"
          onClick={(e) => {
            // @click.self equivalent
            if (e.target === e.currentTarget) {
              handleToggle();
            }
          }}
          onKeyDown={(e) => {
            // @keydown.enter.exact equivalent
            if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.altKey) {
              handleToggle();
            }
          }}
        >
          <button
            type="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation(); // @click.stop
              handleToggle();
            }}
            className="ml-0 flex items-center"
          >
            <ChevronRightIcon
              className={cn(
                "text-muted-foreground group-hover:text-foreground h-6 w-6 transform transition-transform",
                isOpen && "rotate-90"
              )}
            />
          </button>
          <button 
            type="button" 
            className="ml-2 text-sm font-semibold hover:underline"
          >
            {sideGroup.name}
          </button>
        </div>
      </td>

      {/* Editable Name Column */}
      <td className="">
        <GridEditableCell
          value={sideGroup.name}
          rowIndex={itemIndex}
          colIndex={1}
          onUpdate={(val: any) => onUpdateSideGroup(sideGroup.id, { name: val })}
          onNextCell={(e: any) => onNextCell(e)}
          onActive={() => onActiveItem("name")}
        />
      </td>

      {/* Expand/Collapse Action Column */}
      <td colSpan={columns.length - 1} className="">
        <div className="text-muted-foreground flex h-12 items-center py-2 pr-3 text-sm font-medium whitespace-nowrap">
          <BaseButton 
            small 
            className="ml-2" 
            onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                onExpand(sideGroup);
            }}
          >
            Expand/collapse
          </BaseButton>
        </div>
      </td>
    </tr>
  );
}