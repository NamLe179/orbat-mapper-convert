"use client";

import React, { useMemo } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { EllipsisVertical } from "lucide-react";

import { type SideAction, SideActions } from "@/types/constants";
import { type MenuItemData } from "@/components/types";

interface SideGroupDropdownMenuProps {
  isLocked: boolean;
  isSideLocked: boolean;
  isSideHidden: boolean;
  isSideGroupLocked: boolean;
  isSideGroupHidden: boolean;
  onAction?: (value: SideAction) => void;
}

export default function SideGroupDropdownMenu({
  isLocked,
  isSideLocked,
  isSideHidden,
  isSideGroupLocked,
  isSideGroupHidden,
  onAction,
}: SideGroupDropdownMenuProps) {
  
  // Logic Computed chuyển thành useMemo
  const sideGroupMenuItems = useMemo((): MenuItemData<SideAction>[] => {
    return [
      {
        label: "Add root unit",
        action: SideActions.AddSubordinate,
        disabled: isLocked,
      },
      { label: "Edit group", action: SideActions.Edit, disabled: isLocked },
      { label: "Delete group", action: SideActions.Delete, disabled: isLocked },
      { label: "Move up", action: SideActions.MoveUp, disabled: isLocked },
      { label: "Move down", action: SideActions.MoveDown, disabled: isLocked },
      { label: "Duplicate", action: SideActions.Clone, disabled: isLocked },
      {
        label: "Duplicate (with state)",
        action: SideActions.CloneWithState,
        disabled: isLocked,
      },
      isSideGroupLocked
        ? {
            label: "Unlock group",
            action: SideActions.Unlock,
            disabled: isSideLocked,
          }
        : {
            label: "Lock group",
            action: SideActions.Lock,
            disabled: isSideLocked,
          },
      isSideGroupHidden
        ? {
            label: "Show group",
            action: SideActions.Show,
            disabled: isSideHidden,
          }
        : {
            label: "Hide group",
            action: SideActions.Hide,
            disabled: isSideHidden,
          },
    ];
  }, [
    isLocked,
    isSideLocked,
    isSideHidden,
    isSideGroupLocked,
    isSideGroupHidden,
  ]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="mr-2 text-muted-foreground">
          <EllipsisVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="min-w-52" align="end">
        <DropdownMenuLabel>Group actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {sideGroupMenuItems.map((item) => (
          <DropdownMenuItem
            key={item.action}
            disabled={item.disabled}
            onSelect={() => onAction?.(item.action)}
          >
            <span>{item.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}