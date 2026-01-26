import { useCallback } from "react";
import fuzzysort from "fuzzysort";

// Helper project imports
import { groupBy, htmlTagEscape } from "@/utils"; // Giả định utils giữ nguyên
import { useSymbologyData } from "@/hooks/symbolData";

// --- Types (Giữ nguyên) ---

export interface SymbolSearchResult {
  category: "Main icon" | "Modifier 1" | "Modifier 2";
  index: number;
  sidc: string;
  code: string;
  text: string;
  name: string;
  score: number;
  highlight: string;
}

export interface MainIconSearchResult extends SymbolSearchResult {
  category: "Main icon";
}

export interface ModifierOneSearchResult extends SymbolSearchResult {
  category: "Modifier 1";
}

export interface ModifierTwoSearchResult extends SymbolSearchResult {
  category: "Modifier 2";
}

// --- Hook ---

export function useSymbologySearch(sidValue: string) {
  // Lấy dữ liệu tìm kiếm đã được memoized từ hook symbolData
  const { 
    searchSymbolRef, 
    searchModifierOneRef, 
    searchModifierTwoRef 
  } = useSymbologyData();

  const search = useCallback((query: string) => {
    // 1. Helper: Search Main Icons
    const searchMainIcons = (q: string): MainIconSearchResult[] => {
      // searchSymbolRef bây giờ là mảng trực tiếp, không cần .value
      const source = searchSymbolRef || [];
      
      const h = fuzzysort.go(q, source, {
        key: "text",
        limit: 10,
      });

      return h.map((e, i) => {
        const { obj, ...rest } = e;
        return {
          code: obj.code,
          text: obj.text,
          symbolSet: obj.symbolSet,
          name: obj.name,
          score: e.score,
          category: "Main icon",
          index: i,
          highlight: fuzzysort.highlight({ 
            ...rest, 
            target: htmlTagEscape(rest.target) 
          }) || "",
          // Sử dụng sidValue từ closure của hook
          sidc: "100" + sidValue + e.obj.symbolSet + "0000" + e.obj.code + "0000",
        };
      });
    };

    // 2. Helper: Search Modifier 1
    const searchModifierOne = (q: string): ModifierOneSearchResult[] => {
      const source = searchModifierOneRef || [];
      
      const h = fuzzysort.go(q, source, {
        key: "text",
        limit: 10,
      });

      return h.map((e, i) => {
        const { obj, ...rest } = e;
        return {
          code: obj.code,
          text: obj.text,
          symbolSet: obj.symbolSet,
          name: obj.name,
          score: e.score * 10, // Boost score
          category: "Modifier 1",
          index: i,
          highlight: fuzzysort.highlight({ 
            ...rest, 
            target: htmlTagEscape(rest.target) 
          }) || "",
          sidc:
            "100" +
            sidValue +
            e.obj.symbolSet +
            "0000" +
            "000000" +
            e.obj.code +
            "00",
        };
      });
    };

    // 3. Helper: Search Modifier 2
    const searchModifierTwo = (q: string): ModifierTwoSearchResult[] => {
      const source = searchModifierTwoRef || [];

      const h = fuzzysort.go(q, source, {
        key: "text",
        limit: 10,
      });

      return h.map((e, i) => {
        const { obj, ...rest } = e;
        return {
          code: obj.code,
          text: obj.text,
          symbolSet: obj.symbolSet,
          name: obj.name,
          score: e.score * 10,
          category: "Modifier 2",
          index: i,
          highlight: fuzzysort.highlight({ 
            ...rest, 
            target: htmlTagEscape(rest.target) 
          }) || "",
          sidc:
            "100" +
            sidValue +
            e.obj.symbolSet +
            "0000" +
            "000000" +
            "00" +
            e.obj.code,
        };
      });
    };

    // 4. Combine logic
    const combineHits = (
      hits: (
        | MainIconSearchResult[]
        | ModifierOneSearchResult[]
        | ModifierTwoSearchResult[]
      )[],
    ) => {
      const combinedHits = hits.sort((a, b) => {
        const scoreA = a[0]?.score ?? 1000;
        const scoreB = b[0]?.score ?? 1000;
        return scoreB - scoreA;
      });
      return [...combinedHits.flat()].map((e, index) => ({
        ...e,
        index,
      }));
    };

    // --- Execution ---
    const mainIconHits = searchMainIcons(query);
    const modifierOneHits = searchModifierOne(query);
    const modifierTwoHits = searchModifierTwo(query);

    const allHits = combineHits([mainIconHits, modifierOneHits, modifierTwoHits]);
    const numberOfHits =
      mainIconHits.length + modifierOneHits.length + modifierTwoHits.length;

    return { 
      numberOfHits, 
      groups: groupBy(allHits, "category") 
    };

  }, [sidValue, searchSymbolRef, searchModifierOneRef, searchModifierTwoRef]);

  return { search };
}