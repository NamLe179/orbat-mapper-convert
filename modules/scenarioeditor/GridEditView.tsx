"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { klona } from "klona";

// Stores & Logic
import { useUiStore } from "@/stores/uiStore";
import { useActiveScenario, useSidcModal } from "@/components/injects";
import { filterUnits, type NOrbatItemData } from "@/hooks/filtering";
import { useSearchActions } from "@/hooks/searchActions";
import { useNotifications } from "@/hooks/notifications";

// Types
import type { NSide, NSideGroup, NUnit } from "@/types/internalModels";
import type { ColumnField, TableColumn, TableItem } from "@/modules/scenarioeditor/types";
import { EntityId } from "@/types/base";

// Components
import FilterQueryInput from "@/components/FilterQueryInput";
import GridHeader from "@/modules/scenarioeditor/GridHeader";
import GridSideGroupRow from "@/modules/scenarioeditor/GridSideGroupRow";
import GridSideRow from "@/modules/scenarioeditor/GridSideRow";
import GridUnitRow from "@/modules/scenarioeditor/GridUnitRow";
import BaseButton from "@/components/BaseButton";
import CheckboxDropdown from "@/components/CheckboxDropdown";
import { inputEventFilter } from "@/components/helpers";

// Constants
const AVAILABLE_COLUMNS: TableColumn[] = [
  { value: "name", label: "Name", type: "text" },
  { value: "shortName", label: "Short name", type: "text" },
  { value: "sidc", label: "Symbol code", type: "sidc" },
  { value: "externalUrl", label: "URL", type: "text", hidden: true },
  { value: "description", label: "Description", type: "markdown", hidden: true },
  { value: "id", label: "Id", type: "text", hidden: true },
];

export default function GridEditView() {
  // --- Hooks & Context ---
  const { store, unitActions } = useActiveScenario();
  const sidcModal = useSidcModal();
  const { onUnitSelect } = useSearchActions();
  const { send } = useNotifications();
  const state = store.state;

  // --- Local State ---
  const [filterQuery, setFilterQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState(false);
  const [activeItem, setActiveItem] = useState<TableItem | null>(null);
  const [activeColumn, setActiveColumn] = useState<ColumnField>();
  const [sgOpen, setSgOpen] = useState<Map<string, boolean>>(new Map());
  const [sideOpen, setSideOpen] = useState<Map<string, boolean>>(new Map());
  const [unitOpen, setUnitOpen] = useState<Map<string, boolean>>(new Map());
  const [sidesToggled, setSidesToggled] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const expandMap = useRef(new Set<string>());

  // Debounce filter query
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(filterQuery), 250);
    return () => clearTimeout(handler);
  }, [filterQuery]);

  // Load columns from localStorage (Hydration safe)
  useEffect(() => {
    const saved = localStorage.getItem("grid-columns-1");
    if (saved) {
      setSelectedColumns(JSON.parse(saved));
    } else {
      setSelectedColumns(AVAILABLE_COLUMNS.filter(c => !c.hidden).map(c => c.value));
    }
  }, []);

  // --- Computed (useMemo) ---
  const columns = useMemo(() => 
    AVAILABLE_COLUMNS.filter(c => selectedColumns.includes(c.value))
  , [selectedColumns]);

  const filteredOrbat = useMemo(() => {
    const sideList: any[] = [];
    state.sides
      .map(id => state.sideMap[id])
      .forEach(side => {
        const sideGroupList: any[] = [];
        const dummyGroups = [...side.groups];
        if (side.subUnits) dummyGroups.push(side.id);

        dummyGroups.forEach(id => {
          const sideGroup = state.sideGroupMap[id] || {
            id: side.id,
            name: "(Root units)",
            shortName: "",
            _pid: side.id,
            subUnits: side.subUnits || [],
          };

          const filteredUnits = filterUnits(
            sideGroup.subUnits,
            state.unitMap,
            debouncedQuery,
            false,
            true
          );

          if (filteredUnits.length) {
            sideGroupList.push({ sideGroup, children: filteredUnits });
          }
        });

        if (sideGroupList.length) {
          sideList.push({ side, children: sideGroupList });
        }
      });
    return sideList;
  }, [state.sides, state.sideMap, state.sideGroupMap, state.unitMap, debouncedQuery]);

  const items = useMemo(() => {
    const _items: TableItem[] = [];
    filteredOrbat.forEach(({ side, children: sideGroups }) => {
      _items.push({ type: "side", side, id: side.id });
      if (sideOpen.get(side.id) === false) return;

      sideGroups.forEach((sg: any) => {
        const { sideGroup } = sg;
        _items.push({ type: "sidegroup", sideGroup, id: sideGroup.id });
        if (sgOpen.get(sideGroup.id) === false) return;

        const walk = (nodes: NOrbatItemData[], level: number) => {
          nodes.forEach(({ unit, children }) => {
            _items.push({ type: "unit", unit, id: unit.id, level });
            // Check local state first, fallback to unit._isOpen
            const isOpen = unitOpen.has(unit.id) ? unitOpen.get(unit.id) : (unit._isOpen ?? true);
            if (unit.subUnits.length && isOpen !== false) {
              walk(children, level + 1);
            }
          });
        };
        walk(sg.children, 0);
      });
    });
    return _items;
  }, [filteredOrbat, sideOpen, sgOpen, unitOpen, state.unitMap]);

  // --- Handlers ---
  const updateActiveItemValue = useCallback((txt: string) => {
    if (!activeItem || !activeColumn) return;
    const { id, type } = activeItem;
    if (type === "unit") unitActions.updateUnit(id, { [activeColumn]: txt });
    if (type === "side") unitActions.updateSide(id, { [activeColumn]: txt });
    if (type === "sidegroup") unitActions.updateSideGroup(id, { [activeColumn]: txt });
  }, [activeItem, activeColumn, unitActions]);

  const doArrows = useCallback((direction: string, e: any) => {
    const target = e.target as HTMLElement;
    if (!target.id?.startsWith("cell-")) return;
    e.preventDefault?.();

    const [_, y, x] = target.id.split("-");
    let nextY = +y, nextX = +x;
    if (direction === "up") nextY--;
    if (direction === "down") nextY++;
    if (direction === "left") nextX--;
    if (direction === "right") nextX++;

    const nextId = `cell-${nextY}-${nextX}`;
    const nextElement = document.getElementById(nextId);
    if (nextElement) {
      setActiveItem(items[nextY]);
      nextElement.focus();
    }
  }, [items]);

  // --- Effects for Events ---
  useEffect(() => {
    const onCopy = (e: ClipboardEvent) => {
      if (!inputEventFilter(e)) return;
      const target = document.activeElement as HTMLElement;
      if (!target?.classList.contains("editable-cell")) return;
      e.clipboardData?.setData("text/plain", target.textContent?.trim() || "");
      e.preventDefault();
    };

    const onPaste = (e: ClipboardEvent) => {
      if (!inputEventFilter(e)) return;
      const target = document.activeElement as HTMLElement;
      if (!target?.classList.contains("editable-cell")) return;
      e.preventDefault();
      const txt = e.clipboardData?.getData("text/plain").trim();
      if (txt) updateActiveItemValue(txt);
    };

    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    return () => {
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
    };
  }, [updateActiveItemValue]);

  // --- Keyboard Shortcuts ---
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") doArrows("down", e);
    if (e.key === "ArrowUp") doArrows("up", e);
    if (e.key === "ArrowLeft") doArrows("left", e);
    if (e.key === "ArrowRight") doArrows("right", e);
    if (e.key === "Delete") {
      const target = e.target as HTMLElement;
      if (target.classList.contains("editable-cell")) {
        e.preventDefault();
        updateActiveItemValue("");
      }
    }
  };

  return (
    <div className="flex flex-col h-full w-full" onKeyDown={handleKeyDown}>
      <div className="border-border bg-card text-foreground flex flex-col h-full overflow-hidden border shadow-sm sm:rounded-lg">
        <header className="border-border bg-muted/60 flex shrink-0 items-center justify-between border-b px-4 py-3 sm:px-6">
          <div className="flex w-full items-center space-x-2 overflow-x-auto sm:w-auto">
            <FilterQueryInput 
              value={filterQuery} 
              onValueChange={setFilterQuery}
              locationFilter={locationFilter}
              onLocationFilterChange={setLocationFilter}
            />
            <BaseButton small onClick={() => setSidesToggled(!sidesToggled)}>Toggle sides</BaseButton>
            <BaseButton small onClick={() => activeItem?.type === 'unit' && unitActions.createSubordinateUnit(activeItem.id)}>
              Create subordinate
            </BaseButton>
            <BaseButton small onClick={() => activeItem?.type === 'unit' && unitActions.cloneUnit(activeItem.id)}>
              Duplicate unit
            </BaseButton>
          </div>
          <CheckboxDropdown 
            options={AVAILABLE_COLUMNS} 
            value={selectedColumns} 
            onChange={(val: (string | number)[]) => setSelectedColumns(val.map(String))}
          >
            Columns
          </CheckboxDropdown>
        </header>

        

        <div className="flex-1 overflow-auto">
          <table className="text-foreground w-full table-fixed text-sm border-collapse">
            <GridHeader columns={columns} />
            <tbody className="divide-border bg-card divide-y">
              {items.map((item, index) => {
                if (item.type === "unit") return (
                  <GridUnitRow
                    key={item.id}
                    unit={item.unit}
                    columns={columns}
                    level={item.level}
                    itemIndex={index}
                    isActive={activeItem?.id === item.id}
                    onActiveItem={(col) => { setActiveItem(item); setActiveColumn(col as ColumnField); }}
                    onToggle={() => {
                      const currentIsOpen = unitOpen.get(item.id) ?? (item.unit._isOpen ?? true);
                      const newIsOpen = !currentIsOpen;
                      console.log('[GridEditView] Toggle unit:', item.id, 'from:', currentIsOpen, 'to:', newIsOpen);
                      
                      // Update local state
                      const newMap = new Map(unitOpen);
                      newMap.set(item.id, newIsOpen);
                      setUnitOpen(newMap);
                    }}
                  />
                );
                if (item.type === "side") return (
                  <GridSideRow
                    key={item.id}
                    side={item.side}
                    columns={columns}
                    sideOpen={sideOpen as any}
                    onToggle={() => {
                      const newMap = new Map(sideOpen);
                      newMap.set(item.id, !(sideOpen.get(item.id) ?? true));
                      setSideOpen(newMap);
                    }}
                    itemIndex={index}
                    isActive={activeItem?.id === item.id}
                  />
                );
                if (item.type === "sidegroup") return (
                  <GridSideGroupRow
                    key={item.id}
                    sideGroup={item.sideGroup}
                    columns={columns}
                    sgOpen={sgOpen as any}
                    onToggle={() => {
                      const newMap = new Map(sgOpen);
                      newMap.set(item.id, !(sgOpen.get(item.id) ?? true));
                      setSgOpen(newMap);
                    }}
                    onExpand={() => {}}
                    onUpdateSideGroup={() => {}}
                    onNextCell={() => {}}
                    onActiveItem={(col) => { setActiveItem(item); setActiveColumn(col as ColumnField); }}
                    itemIndex={index}
                    isActive={activeItem?.id === item.id}
                  />
                );
                return null;
              })}
            </tbody>
          </table>
        </div>
        <footer className="border-border bg-muted/60 h-12 shrink-0 border-t"></footer>
      </div>
    </div>
  );
}