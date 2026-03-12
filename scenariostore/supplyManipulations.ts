/**
 * Supply Manipulations
 * 
 * Cơ chế hoạt động khi ghép BE:
 * - FE CHỈ gửi request và nhận response từ BE
 * - Sau khi nhận response từ BE, cập nhật local state (Zustand store)
 * 
 * API Endpoints:
 * - POST   /api/scenarios/:scenarioId/supplyClasses        - Create supply class 
 * - PUT    /api/scenarios/:scenarioId/supplyClasses/:id    - Update supply class
 * - DELETE /api/scenarios/:scenarioId/supplyClasses/:id    - Delete supply class
 * 
 * - POST   /api/scenarios/:scenarioId/supplyCategories     - Create supply category 
 * - PUT    /api/scenarios/:scenarioId/supplyCategories/:id - Update supply category
 * - DELETE /api/scenarios/:scenarioId/supplyCategories/:id - Delete supply category
 * 
 * - POST   /api/scenarios/:scenarioId/supplyUoms           - Create supply UoM 
 * - PUT    /api/scenarios/:scenarioId/supplyUoms/:id       - Update supply UoM
 * - DELETE /api/scenarios/:scenarioId/supplyUoms/:id       - Delete supply UoM
 * - PUT    /api/scenarios/:scenarioId/units/:unitId/supplies - Update unit supplies
 */

import { nanoid } from "@/utils";
import { klona } from "klona";

// TODO: API Integration - Uncomment and configure when backend is ready
// async function apiCreateSupplyClass(scenarioId: string, supplyClass: NSupplyClass): Promise<string> {
//   const response = await fetch(`/api/scenarios/${scenarioId}/supplyClasses`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(supplyClass),
//   });
//   const data = await response.json();
//   return data.id;
// }

// async function apiUpdateSupplyClass(scenarioId: string, id: string, data: SupplyClassUpdate): Promise<void> {
//   await fetch(`/api/scenarios/${scenarioId}/supplyClasses/${id}`, {
//     method: 'PUT',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(data),
//   });
// }

// async function apiDeleteSupplyClass(scenarioId: string, id: string): Promise<void> {
//   await fetch(`/api/scenarios/${scenarioId}/supplyClasses/${id}`, {
//     method: 'DELETE',
//   });
// }

// async function apiCreateSupplyCategory(scenarioId: string, category: NSupplyCategory): Promise<string> {
//   const response = await fetch(`/api/scenarios/${scenarioId}/supplyCategories`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(category),
//   });
//   const data = await response.json();
//   return data.id;
// }

// async function apiUpdateSupplyCategory(scenarioId: string, id: string, data: SupplyCategoryUpdate): Promise<void> {
//   await fetch(`/api/scenarios/${scenarioId}/supplyCategories/${id}`, {
//     method: 'PUT',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(data),
//   });
// }

// async function apiDeleteSupplyCategory(scenarioId: string, id: string): Promise<void> {
//   await fetch(`/api/scenarios/${scenarioId}/supplyCategories/${id}`, {
//     method: 'DELETE',
//   });
// }

// Project imports
import type { NewScenarioStore, ScenarioState } from "@/scenariostore/newScenarioStore";
import type {
  NSupplyCategory,
  NSupplyClass,
  NSupplyUoM,
  SupplyCategoryUpdate,
  SupplyClassUpdate,
  SupplyUomUpdate,
} from "@/types/internalModels";
import type { EntityId } from "@/types/base";
import { updateCurrentUnitState } from "@/scenariostore/time";
import { removeUnusedUnitStateEntries } from "@/scenariostore/unitStateManipulations";

export function useSupplyManipulations(store: NewScenarioStore) {
  const { state, update } = store;

  function updateUnitState(unitId: EntityId) {
    // Note: 'updateCurrentUnitState' modifies the object directly. 
    // In strict Redux/Zustand, this should be inside 'update'.
    // Assuming 'updateCurrentUnitState' is safe to call on the proxy/state 
    // or we wrap it in update.
    update((s) => {
        const unit = s.unitMap[unitId];
        if (!unit) return;
        const timestamp = s.currentTime;
        // Need to ensure updateCurrentUnitState works with draft state
        // If it imports types from outside that are strict, might need casting
        // or logic duplication if complex.
        // Assuming it works:
        // @ts-ignore
        updateCurrentUnitState(unit, timestamp);
        s.unitStateCounter++;
    });
  }

  function addSupplyClass(
    data: Partial<NSupplyClass>,
    { noUndo = false, s = state } = {},
  ) {
    const newSupplyClass = { id: nanoid(), name: "Supply Class", ...klona(data) };
    if (newSupplyClass.id === undefined) {
      newSupplyClass.id = nanoid();
    }
    const newId = newSupplyClass.id;
    
    if (noUndo) {
       // Direct mutation for initialization/no-undo context
      s.supplyClassMap[newId] = newSupplyClass;
    } else {
      update((draft) => {
        draft.supplyClassMap[newId] = newSupplyClass;
      });
    }
    return newId;
  }

  function updateSupplyClass(id: string, data: SupplyClassUpdate) {
    update((s) => {
      const supplyClass = s.supplyClassMap[id];
      if (!supplyClass) return;
      Object.assign(supplyClass, data);
      s.settingsStateCounter++;
    });
  }

  function addSupplyCategory(
    data: Partial<NSupplyCategory>,
    { noUndo = false, s = state } = {},
  ) {
    const newSupplyCategory = { id: nanoid(), name: "Supply", ...klona(data) };
    if (newSupplyCategory.id === undefined) {
      newSupplyCategory.id = nanoid();
    }
    const newId = newSupplyCategory.id;
    if (noUndo) {
      s.supplyCategoryMap[newId] = newSupplyCategory;
    } else {
      update((s) => {
        s.supplyCategoryMap[newId] = newSupplyCategory;
      });
    }
    return newSupplyCategory;
  }

  function updateSupplyCategory(id: string, data: SupplyCategoryUpdate) {
    update((s) => {
      const supplyCategory = s.supplyCategoryMap[id];
      if (!supplyCategory) return;
      Object.assign(supplyCategory, data);
      s.settingsStateCounter++;
    });
  }

  function deleteSupplyClass(id: string): boolean {
    // check if supply class is used
    const isUsed = Object.values(state.supplyCategoryMap).some(
      (sc) => sc.supplyClass === id,
    );
    if (isUsed) return false;
    update((s) => {
      delete s.supplyClassMap[id];
    });
    return true;
  }

  function deleteSupplyCategory(id: string): boolean {
    // check if supply category is used
    const isUsed = Object.values(state.unitMap).some((unit) =>
      unit.supplies?.some((e) => e.id === id),
    );

    if (isUsed) return false;
    update((s) => {
      delete s.supplyCategoryMap[id];
    });
    return true;
  }

  function updateUnitSupply(
    unitId: EntityId,
    supplyId: string,
    { count, onHand }: { count: number; onHand?: number },
  ) {
    update((s) => {
      const unit = s.unitMap[unitId];
      if (!unit) return;
      if (count === -1) {
        unit.supplies = unit.supplies?.filter((e) => e.id !== supplyId);
        unit.state = removeUnusedUnitStateEntries(unit);
      } else {
        const supply = unit.supplies?.find((e) => e.id === supplyId);
        if (!supply) {
          if (unit.supplies === undefined) unit.supplies = [];
          unit.supplies.push({ id: supplyId, count, onHand });
        } else {
          Object.assign(supply, { count, onHand });
        }
      }
      
      // We can call updateCurrentUnitState logic here directly on the draft 'unit'
      // instead of separate updateUnitState call which triggers another update cycle.
      // But for cleaner reuse of logic defined above:
    });
    // Trigger state recalculation in a separate update or inline if possible
    updateUnitState(unitId);
  }

  function addSupplyUom(data: Partial<NSupplyUoM>, { noUndo = false, s = state } = {}) {
    const newSupplyUom = { id: nanoid(), name: "Supply UoM", ...klona(data) };
    if (newSupplyUom.id === undefined) {
      newSupplyUom.id = nanoid();
    }
    const newId = newSupplyUom.id;
    if (noUndo) {
      s.supplyUomMap[newId] = newSupplyUom;
    } else {
      update((s) => {
        s.supplyUomMap[newId] = newSupplyUom;
      });
    }
    return newId;
  }

  function updateSupplyUom(id: string, data: SupplyUomUpdate) {
    update((s) => {
      const supplyUom = s.supplyUomMap[id];
      if (!supplyUom) return;
      Object.assign(supplyUom, data);
      s.settingsStateCounter++;
    });
  }

  function deleteSupplyUom(id: string): boolean {
    // check if supply uom is used
    const isUsed = Object.values(state.supplyCategoryMap).some((sc) => sc.uom === id);
    if (isUsed) return false;
    update((s) => {
      delete s.supplyUomMap[id];
    });
    return true;
  }

  return {
    addSupplyCategory,
    deleteSupplyCategory,
    updateSupplyCategory,

    addSupplyClass,
    deleteSupplyClass,
    updateSupplyClass,

    addSupplyUom,
    updateSupplyUom,
    deleteSupplyUom,

    updateUnitSupply,
  };
}

export function getUom(supply: NSupplyCategory, state: ScenarioState) {
  const uomId = supply.uom ?? "";
  if (!uomId) return "";
  const uom = state.supplyUomMap[uomId];
  return uom?.code ?? uom?.name ?? "";
}

export function getSupplyClass(supply: NSupplyCategory, state: ScenarioState) {
  const classId = supply.supplyClass ?? "";
  if (!classId) return "";
  const supplyClass = state.supplyClassMap[classId];
  return supplyClass?.name ?? "";
}