import { useMemo } from "react";
import { useActiveScenario } from "@/components/injects"; // Import từ Context definition
import type { SymbolItem } from "@/types/constants";

// Re-export để giữ tương thích với các component import từ file này
export { useActiveScenario };

export function useRootUnits() {
  const {
    store: { state },
    unitActions,
  } = useActiveScenario();

  const rootUnitItems = useMemo((): SymbolItem[] => {
    // Helper function scoped inside useMemo
    const getUnitItems = (map: Record<string, any>) =>
      Object.values(map)
        .flatMap((value) => value.subUnits)
        .map((id): SymbolItem | null => {
          const u = state.unitMap[id];
          if (!u) return null; // Safety check
          
          return {
            text: u.name,
            code: u.id,
            sidc: u.sidc,
            symbolOptions: unitActions.getCombinedSymbolOptions(u),
          };
        })
        .filter((item): item is SymbolItem => item !== null); // Filter out nulls

    return [...getUnitItems(state.sideMap), ...getUnitItems(state.sideGroupMap)];
  }, [state.unitMap, state.sideMap, state.sideGroupMap, unitActions]); // Re-calculate khi state thay đổi

  return { rootUnitItems };
}