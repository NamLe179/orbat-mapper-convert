/**
 * Unit State Manipulations
 * 
 * Cơ chế hoạt động khi ghép BE:
 * - FE CHỈ gửi request và nhận response từ BE
 * - Sau khi nhận response từ BE, cập nhật local state (Zustand store)
 * 
 * API Endpoints:
 * - POST   /api/scenarios/:scenarioId/units/:unitId/state          - Add state entry 
 * - PUT    /api/scenarios/:scenarioId/units/:unitId/state/:stateId - Update state entry
 * - DELETE /api/scenarios/:scenarioId/units/:unitId/state/:stateId - Delete state entry
 * 
 * - PUT    /api/scenarios/:scenarioId/units/:unitId/state/clear    - Clear all state
 * - POST   /api/scenarios/:scenarioId/units/:unitId/positions      - Add position at time
 * - PUT    /api/scenarios/:scenarioId/units/:unitId/positions/:t   - Update position at time
 * - DELETE /api/scenarios/:scenarioId/units/:unitId/positions/:t   - Delete position at time
 */

import { nanoid, mergeArray } from "@/utils";
import { klona } from "klona";

// TODO: API Integration - Uncomment and configure when backend is ready
// async function apiAddUnitState(scenarioId: string, unitId: string, state: NState): Promise<string> {
//   const response = await fetch(`/api/scenarios/${scenarioId}/units/${unitId}/state`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(state),
//   });
//   const data = await response.json();
//   return data.id;
// }

// async function apiUpdateUnitState(scenarioId: string, unitId: string, stateId: string, data: Partial<NState>): Promise<void> {
//   await fetch(`/api/scenarios/${scenarioId}/units/${unitId}/state/${stateId}`, {
//     method: 'PUT',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(data),
//   });
// }

// async function apiDeleteUnitState(scenarioId: string, unitId: string, stateId: string): Promise<void> {
//   await fetch(`/api/scenarios/${scenarioId}/units/${unitId}/state/${stateId}`, {
//     method: 'DELETE',
//   });
// }

// async function apiClearUnitState(scenarioId: string, unitId: string): Promise<void> {
//   await fetch(`/api/scenarios/${scenarioId}/units/${unitId}/state/clear`, {
//     method: 'PUT',
//   });
// }

// async function apiAddUnitPosition(scenarioId: string, unitId: string, position: Position, atTime: number): Promise<void> {
//   await fetch(`/api/scenarios/${scenarioId}/units/${unitId}/positions`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ position, atTime }),
//   });
// }

// Project imports
import type { NewScenarioStore } from "@/scenariostore/newScenarioStore";
import type { NState, NUnit } from "@/types/internalModels";
import type { EntityId, HistoryAction } from "@/types/base";
import { createInitialState, updateCurrentUnitState } from "@/scenariostore/time";
import { unitRuntimeState } from "@/scenariostore/runtimeState";
import type { State, StateAdd } from "@/types/scenarioModels";
import type { Position } from "@/types/scenarioGeoModels";

// --- Pure Helper Functions ---

export function removeUnusedUnitStateEntries(unit: NUnit) {
  if (!unit || !unit.state) return;
  const usedEquipmentIds = new Set(unit.equipment?.map((e) => e.id) ?? []);
  const usedPersonnelIds = new Set(unit.personnel?.map((e) => e.id) ?? []);
  const usedSupplyIds = new Set(unit.supplies?.map((e) => e.id) ?? []);

  const filteredState = unit.state.map((state) => {
    const update = state.update;
    const diff = state.diff;
    if (update) {
      update.equipment = update.equipment?.filter((e) => usedEquipmentIds.has(e.id));
      if (update.equipment?.length === 0) delete update.equipment;
      update.personnel = update.personnel?.filter((e) => usedPersonnelIds.has(e.id));
      if (update.personnel?.length === 0) delete update.personnel;
      update.supplies = update.supplies?.filter((e) => usedSupplyIds.has(e.id));
      if (update.supplies?.length === 0) delete update.supplies;
      if (!update.equipment && !update.personnel && !update.supplies) {
        delete state.update;
      }
    }

    if (diff) {
      diff.equipment = diff.equipment?.filter((e) => usedEquipmentIds.has(e.id));
      if (diff.equipment?.length === 0) delete diff.equipment;
      diff.personnel = diff.personnel?.filter((e) => usedPersonnelIds.has(e.id));
      if (diff.personnel?.length === 0) delete diff.personnel;
      diff.supplies = diff.supplies?.filter((e) => usedSupplyIds.has(e.id));
      if (diff.supplies?.length === 0) delete diff.supplies;
      if (!diff.equipment && !diff.personnel && !diff.supplies) {
        delete state.diff;
      }
    }
    return state;
  });

  return filteredState.filter(isNotEmptyState);
}

function isNotEmptyState(state: NState) {
  return (
    state.update ||
    state.diff ||
    state.location ||
    state.sidc ||
    state.symbolOptions ||
    state.textAmplifiers ||
    state.status ||
    state.reinforcedStatus
  );
}

// --- Manipulation Logic ---

export function useUnitStateManipulations(store: NewScenarioStore) {
  const { update } = store;

  function updateUnitState(unitId: EntityId) {
    const unit = store.state.unitMap[unitId];
    if (unit) {
      updateCurrentUnitState(unit, store.state.currentTime);
    }

    update((s) => {
      s.unitStateCounter++;
    });
  }

  function clearUnitState(unitId: EntityId) {
    update(
      (s) => {
        const _unit = s.unitMap[unitId];
        if (!_unit) return;
        _unit.state = [];
        unitRuntimeState.set(_unit.id, createInitialState(_unit));
      },
      { label: "clearUnitState", value: unitId },
    );
    updateUnitState(unitId);
  }

  function deleteUnitStateEntryByStateId(unitId: EntityId, stateId: EntityId) {
    update((s) => {
      const _unit = s.unitMap[unitId];
      if (!_unit) return;
      const index = _unit.state?.findIndex((s) => s.id === stateId) ?? -1;
      if (index >= 0) _unit.state?.splice(index, 1);
    });

    updateUnitState(unitId);
  }

  function addUnitStateEntry(unitId: EntityId, state: StateAdd, merge = false) {
    update(
      (s) => {
        const u = s.unitMap[unitId];

        const newState = klona(state);
        newState.id = nanoid();
        if (!u.state) u.state = [];
        const t = state.t;
        for (let i = 0, len = u.state.length; i < len; i++) {
          if (t <= u.state[i].t) {
            if (merge && u.state[i].t === t) {
              const { id, t, update, diff, ...rest } = newState;
              Object.assign(u.state[i], rest);
              if (update) {
                const source = u.state[i]?.update || {};
                const dest = {
                  equipment:
                    source.equipment || update.equipment
                      ? mergeArray(source.equipment ?? [], update.equipment ?? [], "id")
                      : undefined,
                  personnel:
                    source.personnel || update.personnel
                      ? mergeArray(source.personnel ?? [], update.personnel ?? [], "id")
                      : undefined,
                  supplies:
                    source.supplies || update.supplies
                      ? mergeArray(source.supplies ?? [], update.supplies ?? [], "id")
                      : undefined,
                };
                Object.assign(u.state[i], { update: dest });
              }
              if (diff) {
                const source = u.state[i]?.diff || {};
                const dest = {
                  equipment:
                    source.equipment || diff.equipment
                      ? mergeArray(source.equipment ?? [], diff.equipment ?? [], "id")
                      : undefined,
                  personnel:
                    source.personnel || diff.personnel
                      ? mergeArray(source.personnel ?? [], diff.personnel ?? [], "id")
                      : undefined,
                  supplies:
                    source.supplies || diff.supplies
                      ? mergeArray(source.supplies ?? [], diff.supplies ?? [], "id")
                      : undefined,
                };
                Object.assign(u.state[i], { diff: dest });
              }
            } else {
              u.state.splice(i, 0, newState as NState);
            }

            return;
          }
        }
        u.state.push(newState as NState);
      },
      { label: "addUnitPosition", value: unitId },
    );
    updateUnitState(unitId);
  }

  function deleteUnitStateEntry(unitId: EntityId, index: number) {
    update((s) => {
      const _unit = s.unitMap[unitId];
      if (!_unit) return;
      _unit.state?.splice(index, 1);
    });

    updateUnitState(unitId);
  }

  function updateUnitStateEntry(unitId: EntityId, index: number, data: Partial<State>) {
    update((s) => {
      const unit = s.unitMap[unitId];
      if (!unit?.state) return;
      Object.assign(unit.state[index], data);
      unit.state.sort(({ t: a }, { t: b }) => (a < b ? -1 : a > b ? 1 : 0));
      s.unitStateCounter++;
    });

    updateUnitState(unitId);
  }

  function setUnitState(unitId: EntityId, state: NState[]) {
    update((s) => {
      const unit = s.unitMap[unitId];
      if (!unit) return;
      unit.state = state;
    });
    updateUnitState(unitId);
  }

  function updateUnitStateVia(
    unitId: EntityId,
    action: HistoryAction,
    stateIndex: number,
    elementIndex: number,
    data: Position,
  ) {
    update(
      (s) => {
        const unit = s.unitMap[unitId];
        if (!unit || !unit.state) return;
        const stateElement = unit.state[stateIndex];
        if (!stateElement) return;
        if (!stateElement.via) stateElement.via = [];
        if (action === "add") {
          stateElement.via.splice(elementIndex, 0, data);
        } else if (action === "modify") {
          stateElement.via[elementIndex] = data;
        } else if (action === "remove") {
          stateElement.via.splice(elementIndex, 1);
        }
      },
      { label: "addUnitPosition", value: unitId },
    );
  }

  return {
    clearUnitState,
    updateUnitState,
    deleteUnitStateEntryByStateId,
    addUnitStateEntry,
    deleteUnitStateEntry,
    updateUnitStateEntry,
    setUnitState,
    updateUnitStateVia,
  };
}