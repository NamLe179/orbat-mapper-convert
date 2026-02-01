"use client";

import React, { useState, useMemo } from "react";
import { klona } from "klona";

// Types
import type { NUnit } from "@/types/internalModels";
import type { RangeRing, RangeRingStyle } from "@/types/scenarioGeoModels";
import { type RangeRingAction, RangeRingActions } from "@/types/constants";
import { type VisibilityStyleSpec } from "@/geo/simplestyle";

// Hooks & Stores
import { useActiveScenario } from "@/components/injects";
import { useToeActions } from "@/hooks/scenarioActions";
import { useSelectedItems } from "@/stores/selectedStore";
import { useMapViewStore } from "@/stores/mapViewStore";
import { nanoid } from "@/utils";
import { cn } from "@/lib/utils";

// Components
import InputGroup from "@/components/InputGroup";
import InputGroupTemplate from "@/components/InputGroupTemplate";
import DotsMenu from "@/components/DotsMenu";
import RingStylePopover from "@/modules/scenarioeditor/RingStylePopover";
import SimpleSelect from "@/components/SimpleSelect";
import PanelHeading from "@/components/PanelHeading";
import ToggleField from "@/components/ToggleField";
import ZoomSelector from "@/components/ZoomSelector";
import PanelDataGrid from "@/components/PanelDataGrid";
import { Button } from "@/components/ui/button";

interface Props {
  unit: NUnit;
  isLocked?: boolean;
  isMultiMode?: boolean;
}

export default function UnitDetailsMapDisplay({ unit, isLocked = false, isMultiMode = false }: Props) {
  const { unitActions, store, helpers } = useActiveScenario();
  const toeActions = useToeActions();
  const { selectedUnitIds } = useSelectedItems();

  // --- Local State ---
  const [editedIndex, setEditedIndex] = useState(-1);
  const [originalRangeRing, setOriginalRangeRing] = useState<RangeRing | null>(null);
  const [editedRangeRing, setEditedRangeRing] = useState<RangeRing>({
    name: "",
    range: 0,
    uom: "km",
    group: null,
  });

  // --- Computed (useMemo) ---
  const marker = useMemo((): Partial<VisibilityStyleSpec> => {
    const style = unit.style || {};
    return {
      limitVisibility: style["limitVisibility"] ?? false,
      minZoom: style["minZoom"] ?? 0,
      maxZoom: style["maxZoom"] ?? 24,
    };
  }, [unit.style]);

  const rangeRings = useMemo(() => {
    if (isMultiMode && selectedUnitIds.size > 1) {
      const multiRangeRings: any[] = [];
      const usedNames = new Set<string>();
      const usedNameCounter = new Map<string, number>();

      for (const unitId of Array.from(selectedUnitIds)) {
        const u = helpers.getUnitById(unitId);
        if (!u?.rangeRings) continue;
        u.rangeRings.forEach((ring) => {
          usedNameCounter.set(ring.name, (usedNameCounter.get(ring.name) ?? 0) + 1);
          if (!usedNames.has(ring.name)) {
            usedNames.add(ring.name);
            multiRangeRings.push({ ...ring });
          }
        });
      }
      return multiRangeRings.map((ring) => ({
        ...ring,
        _counter: usedNameCounter.get(ring.name),
      }));
    }
    return unit.rangeRings ?? [];
  }, [unit.rangeRings, isMultiMode, selectedUnitIds, helpers]);

  const groupItems = useMemo(() => 
    Object.values(store.state.rangeRingGroupMap).map((g) => ({
      label: g.name,
      value: g.id,
    })), [store.state.rangeRingGroupMap]);

  // --- Handlers ---
  const updateVisibilityStyle = (style: Partial<VisibilityStyleSpec>) => {
    if (isMultiMode && selectedUnitIds.size > 1) {
      unitActions.batchUpdateUnitStyle(Array.from(selectedUnitIds), style);
    } else {
      const newStyle = { ...(unit.style || {}), ...style };
      unitActions.updateUnit(unit.id, { style: newStyle });
    }
  };

  const addRangeRing = () => {
    const defaultRing: RangeRing = {
      name: "New range ring " + nanoid(3),
      range: 20,
      uom: "km",
      group: null,
    };
    if (isMultiMode && selectedUnitIds.size > 1) {
      store.groupUpdate(() => {
        selectedUnitIds.forEach((id) => unitActions.addRangeRing(id, { ...defaultRing }));
      });
    } else {
      unitActions.addRangeRing(unit.id, { ...defaultRing });
    }
    // Kích hoạt chế độ edit cho ring vừa tạo
    setTimeout(() => {
      const newIndex = rangeRings.length;
      setEditedRangeRing(klona(defaultRing));
      setOriginalRangeRing(klona(defaultRing));
      setEditedIndex(newIndex);
    }, 0);
  };

  const updateRing = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (editedIndex < 0) return;

    const data = {
      name: editedRangeRing.name,
      range: Number(editedRangeRing.range),
      uom: editedRangeRing.uom,
      group: editedRangeRing.group,
    };

    if (isMultiMode && selectedUnitIds.size > 1) {
      store.groupUpdate(() => {
        selectedUnitIds.forEach((id) => 
          unitActions.updateRangeRingByName(id, originalRangeRing?.name || data.name, data, { addIfNameDoesNotExists: true })
        );
      });
    } else {
      unitActions.updateRangeRing(unit.id, editedIndex, data);
    }

    setEditedIndex(-1);
    setOriginalRangeRing(null);
  };

  const updateRangeRingOrRings = (index: number, name: string, updates: Partial<RangeRing>) => {
    if (isMultiMode && selectedUnitIds.size > 1) {
      store.groupUpdate(() => {
        selectedUnitIds.forEach((id) => 
          unitActions.updateRangeRingByName(id, name, updates, { addIfNameDoesNotExists: false })
        );
      });
    } else {
      unitActions.updateRangeRing(unit.id, index, updates);
    }
  };

  return (
    <div className="space-y-6">
      {/* Visibility Section */}
      <PanelDataGrid className="mt-4">
        <div className="col-span-2 mt-2 font-semibold">Visibility</div>
        <div className="self-center">Limit Zoom</div>
        <ToggleField 
          checked={!!marker.limitVisibility} 
          onCheckedChange={(v: boolean) => updateVisibilityStyle({ limitVisibility: v })} 
        />
        {marker.limitVisibility && (
          <>
            <div className="self-center">Zoom levels</div>
            <div className="mt-2">
              <ZoomSelector 
                value={[marker.minZoom ?? 0, marker.maxZoom ?? 24]} 
                onValueChange={(v: [number, number]) => updateVisibilityStyle({ minZoom: v[0], maxZoom: v[1] })}
              />
            </div>
          </>
        )}
      </PanelDataGrid>

      {/* Range Rings Section */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <PanelHeading>Range rings</PanelHeading>
          <Button onClick={addRangeRing} disabled={isLocked} size="sm">
            + Add
          </Button>
        </div>

        

        <table className="w-full divide-y divide-border">
          <thead>
            <tr className="text-muted-foreground text-xs uppercase tracking-wider">
              <th className="py-3 pl-4 text-left font-semibold sm:pl-0">Name</th>
              <th className="px-2 py-3 text-left font-semibold">Range</th>
              <th className="w-20 px-2 py-3 text-center font-semibold">Visible</th>
              <th className="px-2 py-3 text-left font-semibold">Group</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rangeRings.map((ring: any, index: number) => (
              <tr 
                key={ring.name + index} 
                className="group hover:bg-muted/30 transition-colors"
                onDoubleClick={() => !isLocked && setEditedIndex(index)}
              >
                {index === editedIndex ? (
                  <td colSpan={5} className="py-4">
                    <form onSubmit={updateRing} className="bg-muted/50 grid grid-cols-2 gap-4 rounded-lg border p-4">
                      <InputGroup
                        className="col-span-2"
                        label="Name"
                        value={editedRangeRing.name}
                        onChange={(e) => setEditedRangeRing(p => ({ ...p, name: e.target.value }))}
                        autoFocus
                      />
                      <InputGroupTemplate label="Range" className="col-span-1">
                        <div className="flex shadow-sm rounded-md ring-1 ring-inset ring-input focus-within:ring-2 focus-within:ring-ring">
                          <input
                            type="number"
                            className="block flex-1 border-0 bg-transparent py-1.5 pl-3 text-foreground placeholder:text-muted-foreground focus:ring-0 sm:text-sm"
                            value={editedRangeRing.range}
                            onChange={(e) => setEditedRangeRing(p => ({ ...p, range: Number(e.target.value) }))}
                          />
                          <select
                            className="h-full rounded-md border-0 bg-transparent py-0 pl-2 pr-7 text-muted-foreground focus:ring-0 sm:text-sm"
                            value={editedRangeRing.uom}
                            onChange={(e) => setEditedRangeRing(p => ({ ...p, uom: e.target.value as RangeRing['uom'] }))}
                          >
                            <option value="m">m</option>
                            <option value="km">km</option>
                            <option value="mi">mi</option>
                            <option value="nmi">nmi</option>
                          </select>
                        </div>
                      </InputGroupTemplate>
                      <SimpleSelect
                        className="col-span-1"
                        label="Group"
                        items={groupItems}
                        value={editedRangeRing.group || ""}
                        onValueChange={(v: string | number | null) => setEditedRangeRing(p => ({ ...p, group: (v || null) as string | null }))}
                        addNone
                      />
                      <div className="col-span-2 flex justify-between items-center mt-2">
                        <Button variant="link" size="sm" onClick={() => toeActions.goToAddGroup()}>
                          + New group
                        </Button>
                        <div className="space-x-2">
                          <Button type="submit" variant="secondary" size="sm">Update</Button>
                          <Button variant="outline" size="sm" onClick={() => setEditedIndex(-1)}>Cancel</Button>
                        </div>
                      </div>
                    </form>
                  </td>
                ) : (
                  <>
                    <td className="py-3 pl-4 text-sm sm:pl-0 font-medium">
                      {ring.name} {ring._counter && <span className="text-muted-foreground ml-1">({ring._counter})</span>}
                    </td>
                    <td className="px-2 py-3 text-sm">
                      {ring.range} <span className="text-muted-foreground">{ring.uom || "km"}</span>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <input
                        type="checkbox"
                        className="rounded border-input text-primary focus:ring-ring"
                        checked={!ring.hidden}
                        onChange={() => {
                          const hidden = !(ring.hidden ?? false);
                          updateRangeRingOrRings(index, ring.name, { hidden });
                        }}
                        disabled={isLocked}
                      />
                    </td>
                    <td className="px-2 py-3 text-sm text-muted-foreground">
                      {ring.group ? store.state.rangeRingGroupMap[ring.group]?.name : "None"}
                    </td>
                    <td className="px-2 py-3 flex items-center gap-1">
                      <RingStylePopover
                        ringStyle={ring.group ? store.state.rangeRingGroupMap[ring.group]?.style : ring.style || {}}
                        onUpdate={(style) => {
                          if (ring.group) unitActions.updateRangeRingGroup(ring.group, { style });
                          updateRangeRingOrRings(index, ring.name, { style });
                        }}
                        disabled={isLocked}
                      />
                      <DotsMenu
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        items={[
                          { label: "Edit", action: RangeRingActions.Edit, disabled: isLocked },
                          { label: "Delete", action: RangeRingActions.Delete, disabled: isLocked }
                        ]}
                        onAction={(action) => {
                          if (action === RangeRingActions.Edit) {
                            setEditedRangeRing(klona(ring));
                            setOriginalRangeRing(klona(ring));
                            setEditedIndex(index);
                          } else if (action === RangeRingActions.Delete) {
                            if (isMultiMode && selectedUnitIds.size > 1) {
                              store.groupUpdate(() => selectedUnitIds.forEach(id => unitActions.deleteRangeRingByName(id, ring.name)));
                            } else {
                              unitActions.deleteRangeRing(unit.id, index);
                            }
                          }
                        }}
                      />
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}