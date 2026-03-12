/**
 * Range Ring Manipulations
 * 
 * Cơ chế hoạt động khi ghép BE:
 * - FE CHỈ gửi request và nhận response từ BE
 * - Sau khi nhận response từ BE, cập nhật local state (Zustand store)
 * 
 * API Endpoints:
 * - POST   /api/scenarios/:scenarioId/units/:unitId/rangeRings       - Add range ring 
 * - PUT    /api/scenarios/:scenarioId/units/:unitId/rangeRings/:idx  - Update range ring
 * - DELETE /api/scenarios/:scenarioId/units/:unitId/rangeRings/:idx  - Delete range ring
 * 
 * - POST   /api/scenarios/:scenarioId/rangeRingGroups                - Create group 
 * - PUT    /api/scenarios/:scenarioId/rangeRingGroups/:id            - Update group
 * - DELETE /api/scenarios/:scenarioId/rangeRingGroups/:id            - Delete group
 */

import { klona } from "klona";
import { nanoid } from "@/utils";

// TODO: API Integration - Uncomment and configure when backend is ready
// async function apiAddRangeRing(scenarioId: string, unitId: string, rangeRing: RangeRing): Promise<void> {
//   await fetch(`/api/scenarios/${scenarioId}/units/${unitId}/rangeRings`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(rangeRing),
//   });
// }

// async function apiUpdateRangeRing(scenarioId: string, unitId: string, index: number, data: Partial<RangeRing>): Promise<void> {
//   await fetch(`/api/scenarios/${scenarioId}/units/${unitId}/rangeRings/${index}`, {
//     method: 'PUT',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(data),
//   });
// }

// async function apiDeleteRangeRing(scenarioId: string, unitId: string, index: number): Promise<void> {
//   await fetch(`/api/scenarios/${scenarioId}/units/${unitId}/rangeRings/${index}`, {
//     method: 'DELETE',
//   });
// }

// async function apiCreateRangeRingGroup(scenarioId: string, group: RangeRingGroup): Promise<string> {
//   const response = await fetch(`/api/scenarios/${scenarioId}/rangeRingGroups`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(group),
//   });
//   const data = await response.json();
//   return data.id;
// }

// async function apiUpdateRangeRingGroup(scenarioId: string, groupId: string, data: Partial<RangeRingGroup>): Promise<void> {
//   await fetch(`/api/scenarios/${scenarioId}/rangeRingGroups/${groupId}`, {
//     method: 'PUT',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(data),
//   });
// }

// async function apiDeleteRangeRingGroup(scenarioId: string, groupId: string): Promise<void> {
//   await fetch(`/api/scenarios/${scenarioId}/rangeRingGroups/${groupId}`, {
//     method: 'DELETE',
//   });
// }

// Project imports
import type { EntityId } from "@/types/base";
import type { RangeRing, RangeRingGroup } from "@/types/scenarioGeoModels";
import type { NewScenarioStore } from "@/scenariostore/newScenarioStore";

export function useRangeRingManipulations(store: NewScenarioStore) {
  const { state, update } = store;

  function addRangeRing(unitId: EntityId, rangeRing: RangeRing) {
    update((s) => {
      const unit = s.unitMap[unitId];
      if (!unit) return;
      if (!unit.rangeRings) unit.rangeRings = [];
      // does it already exist?
      const existingIndex = unit.rangeRings.findIndex((r) => r.name === rangeRing.name);
      if (existingIndex >= 0) {
        unit.rangeRings[existingIndex] = rangeRing;
      } else {
        unit.rangeRings.push(rangeRing);
      }
    });
  }

  function deleteRangeRing(unitId: EntityId, index: number) {
    update((s) => {
      const unit = s.unitMap[unitId];
      if (!unit) return;
      if (!unit.rangeRings) return;
      unit.rangeRings.splice(index, 1);
    });
  }

  function deleteRangeRingByName(unitId: EntityId, name: string) {
    const unit = state.unitMap[unitId];
    if (!unit?.rangeRings) return;
    const index = unit.rangeRings.findIndex((r) => r.name === name);
    if (index < 0) return;
    deleteRangeRing(unitId, index);
  }

  function updateRangeRing(unitId: EntityId, index: number, data: Partial<RangeRing>) {
    update((s) => {
      const unit = s.unitMap[unitId];
      if (!unit) return;
      if (!unit.rangeRings) return;
      const { style, ...rest } = data;
      Object.assign(unit.rangeRings[index], rest);

      if (style) {
        if (unit.rangeRings[index].style) {
          Object.assign(unit.rangeRings[index].style!, style);
        } else {
          unit.rangeRings[index].style = style;
        }
      }
    });
  }

  function updateRangeRingByName(
    unitId: EntityId,
    name: string,
    data: Partial<RangeRing>,
    { addIfNameDoesNotExists = false } = {},
  ) {
    const unit = state.unitMap[unitId];
    if (!unit?.rangeRings) return;
    const index = unit.rangeRings.findIndex((r) => r.name === name);
    if (index < 0) {
      if (!addIfNameDoesNotExists) return;
      addRangeRing(unitId, { name, uom: "km", range: 2, ...data } as RangeRing);
      return;
    }
    updateRangeRing(unitId, index, data);
  }

  function updateRangeRingGroup(groupId: string, data: Partial<RangeRingGroup>) {
    update((s) => {
      const group = s.rangeRingGroupMap[groupId];
      if (!group) return;
      const { style, ...rest } = data;
      Object.assign(group, rest);
      if (style) {
        if (group.style) {
          Object.assign(group.style!, style);
        } else {
          group.style = style;
        }
      }
    });
  }

  function addRangeRingGroup(data: Partial<RangeRingGroup>) {
    const newGroup = { id: nanoid(), name: "Group", ...klona(data) };
    if (newGroup.id === undefined) {
      newGroup.id = nanoid();
    }
    const newId = newGroup.id;
    update((s) => {
      s.rangeRingGroupMap[newId] = newGroup;
    });
  }

  function deleteRangeRingGroup(id: string): boolean {
    // check if range ring group is used
    const isUsed = Object.values(state.unitMap).some((unit) => {
      if (unit.rangeRings) {
        return unit.rangeRings.some((e) => e.group === id);
      }
      return false;
    });
    if (isUsed) return false;
    update((s) => {
      delete s.rangeRingGroupMap[id];
    });
    return true;
  }

  return {
    addRangeRing,
    deleteRangeRing,
    deleteRangeRingByName,
    updateRangeRing,
    updateRangeRingByName,
    updateRangeRingGroup,
    addRangeRingGroup,
    deleteRangeRingGroup,
  };
}