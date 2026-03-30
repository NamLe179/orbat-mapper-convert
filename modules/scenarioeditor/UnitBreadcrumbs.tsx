"use client";

import React, { useState, useMemo, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { useMediaQuery } from "usehooks-ts";

// UI Components (Shadcn)
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

// Custom Components
import UnitBreadcrumbItem from "@/modules/scenarioeditor/UnitBreadcrumbItem";
import UnitSymbol from "@/components/UnitSymbol";
import CloseButton from "@/components/CloseButton";

// Hooks & Stores
import { useActiveScenario, useActiveParent } from "@/components/injects";
import { useActiveUnit } from "@/stores/dragStore";
import { useSelectedItems } from "@/stores/selectedStore";
import { useUiStore } from "@/stores/uiStore";
import { isUnitDragItem } from "@/types/draggables";
import { cn } from "@/lib/utils";

// Types
import type { EntityId } from "@/types/base";
import type { BreadcrumbItemType } from "@/modules/scenarioeditor/types";
import type { NSide, NSideGroup, NUnit } from "@/types/internalModels";
import { getUnitRuntimeState } from "@/scenariostore/runtimeState";

export default function UnitBreadcrumbs() {
  const {
    unitActions,
    store: { state },
    helpers: { getUnitById, getSideById, getSideGroupById },
  } = useActiveScenario();

  const { activeParentId, activeUnitId, resetActiveParent, activeParent, setActiveUnit } = useActiveUnit();
  const { setActiveUnitId } = useSelectedItems();
  const activeParentContext = useActiveParent();
  const setActiveParentId = activeParentContext?.setActiveParentId;
  const uiSettings = useUiStore();
  
  // Media query thay cho useBreakpoints
  const isMobile = useMediaQuery("(max-width: 768px)");

  // --- Local State ---
  const [isDragged, setIsDragged] = useState(false);

  // --- Watchers (React useEffect) ---
  useEffect(() => {
    if (activeUnitId) {
      setActiveParentId?.(activeUnitId);
    } else {
      setActiveParentId?.(activeParent?._pid || null);
    }
  }, [activeUnitId, activeParent?._pid, setActiveParentId]);

  // --- Computed (useMemo) ---
  const sides = useMemo(() => {
    return state.sides.map((sideId) => getSideById(sideId));
  }, [state.sides, getSideById]);

  const breadcrumbItems = useMemo((): BreadcrumbItemType[] => {
    if (!activeParentId) return [];

    try {
      const { side, sideGroup, parents } = unitActions.getUnitHierarchy(activeParentId);
      const currentActiveParent = activeParent as unknown as NUnit;
      const allParents = [...parents, currentActiveParent];

      const parentsWithItems = allParents.map((uunit) => {
        const parent: NUnit | NSideGroup | NSide =
          getUnitById(uunit._pid) ??
          getSideGroupById(uunit._pid) ??
          getSideById(uunit._pid);

        if (!parent) return { name: uunit.name, items: [], id: uunit.id, sidc: uunit.sidc };
        
        return {
          name: uunit.shortName || uunit.name,
          sidc: uunit.sidc || "",
          location: Boolean(getUnitRuntimeState(uunit.id)?.location),
          id: uunit.id,
          symbolOptions: unitActions.getCombinedSymbolOptions(uunit),
          items: [
            ...parent.subUnits.map(getUnitById).map((subUnit) => ({
              ...subUnit,
              symbolOptions: unitActions.getCombinedSymbolOptions(subUnit),
              location: Boolean(getUnitRuntimeState(subUnit.id)?.location),
            })),
            ...("groups" in parent
              ? side.groups.map((group) => getSideGroupById(group))
              : []),
          ],
        };
      });

      const sideGroupsList = [
        ...side.subUnits.map((unitId) => ({
          ...getUnitById(unitId),
          symbolOptions: unitActions.getCombinedSymbolOptions(getUnitById(unitId)),
        })),
        ...side.groups.map((groupId) => getSideGroupById(groupId)),
      ];

      const res = [
        {
          name: isMobile ? side.name.slice(0, 2) : side.name,
          items: sides,
          id: side.id,
          sidc: "",
        },
        sideGroup
          ? {
              name: isMobile ? sideGroup.name.slice(0, 2) : sideGroup.name,
              items: sideGroupsList,
              id: sideGroup.id,
              sidc: "",
            }
          : null,
        ...parentsWithItems,
      ].filter((i): i is any => i !== null);

      if (activeParent?.subUnits?.length) {
        res.push({
          sidc: "",
          id: activeUnitId!,
          name: "...",
          items: activeParent.subUnits.map((unitId: EntityId) => {
            const unit = getUnitById(unitId);
            return {
              ...unit,
              symbolOptions: unitActions.getCombinedSymbolOptions(unit as any),
              location: Boolean(getUnitRuntimeState(unit.id)?.location),
            };
          }),
        });
      }
      return res;
    } catch (e) {
      resetActiveParent();
      return [];
    }
  }, [activeParentId, activeParent, sides, isMobile, unitActions, getUnitById, getSideGroupById, getSideById]);

  // --- Handlers ---
  const onItemClick = (entityId: EntityId) => {
    let unit = getUnitById(entityId);
    const { side, sideGroup } = unitActions.getUnitHierarchy(entityId);

    if (!unit) {
      let id;
      if (sideGroup) {
        id = sideGroup.subUnits[0];
      } else {
        const firstGroup = getSideGroupById(side.groups[0]);
        id = side?.subUnits[0] ?? firstGroup?.subUnits[0];
      }
      unit = getUnitById(id);
    }

    if (unit) {
      setActiveParentId?.(unit.id);
      setActiveUnitId(unit.id);
    }
  };

  // --- DnD Monitor ---
  useEffect(() => {
    return monitorForElements({
      canMonitor: ({ source }) =>
        isUnitDragItem(source.data) && source.data.source === "breadcrumbs",
      onDragStart: () => setIsDragged(true),
      onDrop: () => setIsDragged(false),
    });
  }, []);

  return (
    <ScrollArea
      className={cn(
        "relative flex border-b py-6 px-8 transition-colors h-16 shrink-0",
        isDragged ? "bg-muted" : "bg-background"
      )}
    >
      <CloseButton
        onClick={() => uiSettings.setShowOrbatBreadcrumbs(false)}
        className="absolute top-1/2 -translate-y-1/2 right-2 hidden sm:block"
      />

      

      <div className="sm:flex sm:items-center sm:justify-center">
        <Breadcrumb className="w-max">
          <BreadcrumbList>
            {breadcrumbItems.map((item, index) => (
              <React.Fragment key={item.id || index}>
                <BreadcrumbItem className="text-primary">
                  {(item.items?.length ?? 0) >= 1 ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger className="flex items-center gap-1 focus:outline-none">
                        <UnitBreadcrumbItem item={item} />
                        <ChevronDown className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {item.items?.map((subItem: any) => (
                          <DropdownMenuItem
                            key={subItem.id}
                            onSelect={() => onItemClick(subItem.id)}
                          >
                            <div className="text-primary flex items-center">
                              {subItem.sidc && (
                                <span className="mr-1.5 flex max-h-7 w-7 items-center">
                                  <UnitSymbol
                                    sidc={subItem.sidc}
                                    options={{
                                      ...subItem.symbolOptions,
                                      outlineWidth: 8,
                                    }}
                                  />
                                </span>
                              )}
                              <span className={cn(item.id === subItem.id && "font-semibold")}>
                                {subItem.name}
                              </span>
                              {subItem.location && (
                                <span className="text-red-700 ml-0.5">&deg;</span>
                              )}
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <span>{item.name}</span>
                  )}
                </BreadcrumbItem>
                {index < breadcrumbItems.length - 1 && <BreadcrumbSeparator />}
              </React.Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}