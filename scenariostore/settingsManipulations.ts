/**
 * Scenario Settings Manipulations
 * 
 * Cơ chế hoạt động khi ghép BE:
 * - FE CHỈ gửi request và nhận response từ BE
 * - Sau khi nhận response từ BE, cập nhật local state (Zustand store)
 * 
 * API Endpoints:
 * - POST   /api/scenarios/:scenarioId/customSymbols      - Create custom symbol 
 * - PUT    /api/scenarios/:scenarioId/customSymbols/:id  - Update custom symbol
 * - DELETE /api/scenarios/:scenarioId/customSymbols/:id  - Delete custom symbol
 * 
 * - POST   /api/scenarios/:scenarioId/symbolFillColors   - Create fill color
 * - PUT    /api/scenarios/:scenarioId/symbolFillColors/:id - Update fill color
 * - DELETE /api/scenarios/:scenarioId/symbolFillColors/:id - Delete fill color
 */

import { nanoid } from "@/utils";
import { klona } from "klona";

// TODO: API Integration - Uncomment and configure when backend is ready
// async function apiCreateCustomSymbol(scenarioId: string, symbol: CustomSymbol): Promise<string> {
//   const response = await fetch(`/api/scenarios/${scenarioId}/customSymbols`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(symbol),
//   });
//   const data = await response.json();
//   return data.id;
// }

// async function apiUpdateCustomSymbol(scenarioId: string, id: string, data: Partial<CustomSymbol>): Promise<void> {
//   await fetch(`/api/scenarios/${scenarioId}/customSymbols/${id}`, {
//     method: 'PUT',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(data),
//   });
// }

// async function apiDeleteCustomSymbol(scenarioId: string, id: string): Promise<void> {
//   await fetch(`/api/scenarios/${scenarioId}/customSymbols/${id}`, {
//     method: 'DELETE',
//   });
// }

// async function apiCreateSymbolFillColor(scenarioId: string, color: NSymbolFillColor): Promise<string> {
//   const response = await fetch(`/api/scenarios/${scenarioId}/symbolFillColors`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(color),
//   });
//   const data = await response.json();
//   return data.id;
// }

// async function apiUpdateSymbolFillColor(scenarioId: string, id: string, data: SymbolFillColorUpdate): Promise<void> {
//   await fetch(`/api/scenarios/${scenarioId}/symbolFillColors/${id}`, {
//     method: 'PUT',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(data),
//   });
// }

// async function apiDeleteSymbolFillColor(scenarioId: string, id: string): Promise<void> {
//   await fetch(`/api/scenarios/${scenarioId}/symbolFillColors/${id}`, {
//     method: 'DELETE',
//   });
// }

// Config & Types
import { SYMBOL_FILL_COLORS } from "@/config/colors"; // Removed .ts extension
import { CUSTOM_SYMBOL_PREFIX } from "@/config/constants"; // Removed .ts extension
import type { EntityId } from "@/types/base";
import type { CustomSymbol } from "@/types/scenarioModels"; // Removed .ts extension
import type { NewScenarioStore } from "@/scenariostore/newScenarioStore";
import type {
  NSymbolFillColor,
  SymbolFillColorUpdate,
} from "@/types/internalModels";

// Removed unused imports (NSupplyCategory, etc.) to clean up code

export function useScenarioSettings(store: NewScenarioStore) {
  const { state, update } = store;

  function addColorIfAbsent(code: string) {
    const existing = [
      ...SYMBOL_FILL_COLORS,
      ...Object.values(state.symbolFillColorMap),
    ].find((color) => color.code.toLowerCase() === code.toLowerCase());
    if (!existing) {
      addSymbolFillColor({ code, text: `Custom color (${code})` });
    }
  }

  function addSymbolFillColor(
    data: Partial<NSymbolFillColor>,
    { noUndo = false, s = state } = {},
  ) {
    const newSymbolFillColor: NSymbolFillColor = {
      id: nanoid(),
      text: `Custom color (${data.code ?? ""})`,
      code: "#FF0000",
      ...klona(data),
    };
    if (newSymbolFillColor.id === undefined) {
      newSymbolFillColor.id = nanoid();
    }
    const newId = newSymbolFillColor.id;
    
    if (noUndo) {
      // Direct mutation for noUndo (usually during initialization)
      s.symbolFillColorMap[newId] = newSymbolFillColor;
    } else {
      update((draft) => {
        draft.symbolFillColorMap[newId] = newSymbolFillColor;
      });
    }
    return newId;
  }

  function updateSymbolFillColor(id: string, data: SymbolFillColorUpdate) {
    update((s) => {
      const symbolFillColor = s.symbolFillColorMap[id];
      if (!symbolFillColor) return;
      Object.assign(symbolFillColor, data);
      // Reactivity fix: Update counter INSIDE the draft to trigger store listeners
      s.settingsStateCounter++;
    });
  }

  function deleteSymbolFillColor(id: string) {
    update((s) => {
      delete s.symbolFillColorMap[id];
    });
  }

  function deleteCustomSymbol(id: string): boolean {
    const isUsed = Object.values(state.unitMap).some((unit) => {
      const customId = `:${id}`;
      return !!(
        (unit.sidc.startsWith(CUSTOM_SYMBOL_PREFIX) && unit.sidc.endsWith(customId)) ||
        unit.state?.some(
          (st) => st.sidc?.startsWith(CUSTOM_SYMBOL_PREFIX) && st.sidc.endsWith(customId),
        )
      );
    });
    if (isUsed) return false;
    update((s) => {
      delete s.customSymbolMap[id];
    });
    return true;
  }

  function updateCustomSymbol(id: string, data: Partial<Omit<CustomSymbol, "id">>) {
    update((s) => {
      const customSymbol = s.customSymbolMap[id];
      if (!customSymbol) return;
      Object.assign(customSymbol, data);
      // Reactivity fix: Update counter INSIDE the draft
      s.settingsStateCounter++;
    });
  }

  function addCustomSymbol(
    data: Partial<CustomSymbol>,
    { noUndo = false, s = state } = {},
  ) {
    const newCustomSymbol: CustomSymbol = {
      id: nanoid(),
      name: "Custom Symbol",
      src: "custom1:xxxxxx",
      sidc: "10031000001100000000",
      ...klona(data),
    };

    if (newCustomSymbol.id === undefined) {
      newCustomSymbol.id = nanoid();
    }
    const newId = newCustomSymbol.id;
    
    if (noUndo) {
       // Direct mutation for noUndo
      s.customSymbolMap[newId] = newCustomSymbol;
    } else {
      update((s) => {
        s.customSymbolMap[newId] = newCustomSymbol;
      });
    }
    return newCustomSymbol;
  }

  return {
    addSymbolFillColor,
    updateSymbolFillColor,
    deleteSymbolFillColor,
    addColorIfAbsent,
    deleteCustomSymbol,
    updateCustomSymbol,
    addCustomSymbol,
  };
}