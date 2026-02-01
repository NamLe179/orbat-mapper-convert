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
import { EllipsisVertical } from "lucide-react";
import { Button } from "@/components/ui/button";

import { type SideAction, SideActions } from "@/types/constants";
import { type DropdownMenuItemType } from "@/components/types";

interface SideDropdownMenuProps {
  isLocked: boolean;
  isHidden?: boolean;
  onAction?: (action: SideAction) => void;
}

export default function SideDropdownMenu({
  isLocked,
  isHidden,
  onAction,
}: SideDropdownMenuProps) {
  // Computed logic tương đương
  const sideMenuItems = useMemo(() => {
    return [
      { label: "Edit", action: SideActions.Edit, disabled: isLocked },
      { label: "Move up", action: SideActions.MoveUp, disabled: isLocked },
      { label: "Move down", action: SideActions.MoveDown, disabled: isLocked },

      { label: "Duplicate", action: SideActions.Clone, disabled: isLocked },
      {
        label: "Duplicate (with state)",
        action: SideActions.CloneWithState,
        disabled: isLocked,
      },
      isLocked
        ? { label: "Unlock side", action: SideActions.Unlock }
        : { label: "Lock side", action: SideActions.Lock },
      isHidden
        ? { label: "Show side", action: SideActions.Show }
        : { label: "Hide side", action: SideActions.Hide },

      { separator: true },
      { label: "Add side", action: SideActions.Add, disabled: isLocked },
      { label: "Add group", action: SideActions.AddGroup, disabled: isLocked },
      {
        label: "Add root unit",
        action: SideActions.AddSubordinate,
        disabled: isLocked,
      },
      { separator: true },
      { label: "Delete side", action: SideActions.Delete, disabled: isLocked },
    ] as DropdownMenuItemType[];
  }, [isLocked, isHidden]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="mr-2 text-muted-foreground">
          <EllipsisVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="min-w-52" align="end">
        <DropdownMenuLabel>Side actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {sideMenuItems.map((item, index) => {
          // Type guard để kiểm tra item là separator hay action
          if ("separator" in item) {
            return <DropdownMenuSeparator key={`sep-${index}`} />;
          }

          return (
            <DropdownMenuItem
              key={item.action} // action thường là string unique
              disabled={item.disabled}
              onSelect={() => onAction?.(item.action)}
            >
              <span>{item.label}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}