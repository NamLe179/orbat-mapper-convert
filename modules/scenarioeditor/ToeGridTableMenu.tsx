"use client";

import React from "react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EllipsisVerticalIcon } from "@heroicons/react/20/solid";
import { type Table } from "@tanstack/react-table";

interface ToeGridTableMenuProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: Table<any>;
}

export default function ToeGridTableMenu({ table }: ToeGridTableMenuProps) {
  // Lấy danh sách cột
  const leafColumns = table.getAllLeafColumns();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="z-10">
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground dark:hover:text-muted-foreground focus:ring-ring rounded-full p-2 focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:outline-hidden"
          >
            <span className="sr-only">Open options</span>
            <EllipsisVerticalIcon className="size-5" aria-hidden="true" />
          </button>
        </div>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Table menu</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Columns</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {leafColumns
              .filter((col) => typeof col.columnDef.header === "string")
              .map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.id}
                  checked={col.getIsVisible()}
                  onCheckedChange={(value) => col.toggleVisibility(!!value)}
                  // Tương đương @select.prevent: Giữ menu mở khi click checkbox
                  onSelect={(e) => e.preventDefault()}
                  disabled={!col.getCanHide()}
                >
                  {col.columnDef.header as string}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        
        <DropdownMenuItem onSelect={() => table.resetColumnSizing()}>
          Reset column widths
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}