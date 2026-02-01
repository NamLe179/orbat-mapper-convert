"use client";

import React, { useMemo } from "react";
import DotsMenu from "@/components/DotsMenu";
import type { MenuItemData } from "@/components/types";
import type { ScenarioEventAction } from "@/types/constants";

interface ScenarioEventDropdownMenuProps {
  hideEdit?: boolean;
  onAction?: (action: ScenarioEventAction) => void;
}

export default function ScenarioEventDropdownMenu({
  hideEdit = false,
  onAction,
}: ScenarioEventDropdownMenuProps) {
  // --- Computed (useMemo) ---
  const items = useMemo<MenuItemData<ScenarioEventAction | (() => void)>[]>(() => {
    const base: MenuItemData<ScenarioEventAction | (() => void)>[] = [
      { label: "Modify time", action: "changeTime" as ScenarioEventAction },
    ];

    if (!hideEdit) {
      base.push({ label: "Edit", action: "editMeta" as ScenarioEventAction });
      base.push({ label: "Edit media", action: "editMedia" as ScenarioEventAction });
    }

    base.push({ label: "Delete", action: "delete" as ScenarioEventAction });
    
    return base;
  }, [hideEdit]);

  // --- Handlers ---
  const handleAction = (value: ScenarioEventAction | (() => void)) => {
    if (typeof value === "function") {
      value();
    } else {
      onAction?.(value as ScenarioEventAction);
    }
  };

  return <DotsMenu items={items} onAction={handleAction} />;
}