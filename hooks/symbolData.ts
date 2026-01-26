import { useState, useEffect, useMemo, useCallback } from "react";
import { create } from "zustand";

// Project imports
import type { SymbolItem, SymbolValue } from "@/types/constants";
import {
  CONTROL_MEASURE_SYMBOLSET_VALUE,
  DISMOUNTED_SYMBOLSET_VALUE,
  echelonValues,
  EQUIPMENT_SYMBOLSET_VALUE,
  HQTFDummyValues,
  leadershipValues,
  mobilityValues,
  statusValues,
  SUBSURFACE_SYMBOLSET_VALUE,
  SURFACE_SYMBOLSET_VALUE,
  towedArrayValues,
  UNIT_SYMBOLSET_VALUE,
} from "@/symbology/values";
import { Sidc } from "@/symbology/sidc";
import type { SymbolSetMap } from "@/symbology/types";
import {
  mapReinforcedStatus2Field,
  type ReinforcedStatus,
  type SymbologyStandard,
} from "@/types/scenarioModels";

// Assumed hooks
import { useSymbolSettingsStore } from "@/stores/settingsStore"; // Giả định store này đã convert

// --- 1. GLOBAL STORE (Symbology Data) ---
// Thay thế cho các biến global refs trong Vue

interface SymbologyStore {
  symbology: SymbolSetMap | undefined;
  isLoaded: boolean;
  currentSymbologyStandard: SymbologyStandard | undefined;
  
  loadData: (standard: SymbologyStandard) => Promise<void>;
}

export const useSymbologyStore = create<SymbologyStore>((set, get) => ({
  symbology: undefined,
  isLoaded: false,
  currentSymbologyStandard: undefined,

  loadData: async (standard: SymbologyStandard) => {
    const { currentSymbologyStandard, symbology } = get();
    
    // Nếu đã load đúng standard rồi thì không load lại
    if (symbology && currentSymbologyStandard === standard) {
      return;
    }

    set({ isLoaded: false });

    try {
      let data: SymbolSetMap;
      if (standard === "app6") {
        const { app6d } = await import("@/symbology/standards/app6d");
        data = app6d;
      } else {
        const { ms2525d } = await import("@/symbology/standards/milstd2525");
        data = ms2525d;
      }
      
      set({ 
        symbology: data, 
        currentSymbologyStandard: standard, 
        isLoaded: true 
      });
    } catch (e) {
      console.error("Failed to load symbology standard", e);
      set({ isLoaded: false });
    }
  },
}));

// --- 2. HOOK: useSymbologyData ---
// Cung cấp data và các list search đã được memoized

export function useSymbologyData() {
  const store = useSymbologyStore();
  const settingsStore = useSymbolSettingsStore(); // Hook lấy settings

  // Auto load data khi component mount hoặc standard thay đổi
  useEffect(() => {
    store.loadData(settingsStore.symbologyStandard);
  }, [settingsStore.symbologyStandard, store]);

  // Derived Search Lists (Memoized)
  const searchSymbolRef = useMemo(() => {
    if (!store.symbology) return undefined;
    
    return Object.values(store.symbology)
      .flatMap((ss) => 
        ss.mainIcon.map((e) => ({
          symbolSet: ss.symbolSet,
          name: ss.name,
          ...e,
        }))
      )
      .filter((e) =>
        e.symbolSet === CONTROL_MEASURE_SYMBOLSET_VALUE ? e.geometry === "Point" : true,
      )
      .map((e) => {
        const { entity, entityType, entitySubtype } = e;
        const text = [entity, entityType, entitySubtype].filter(Boolean).join(" - ");
        return {
          ...e,
          text: text.replaceAll("/", " / "),
        };
      });
  }, [store.symbology]);

  const searchModifierOneRef = useMemo(() => {
    if (!store.symbology) return undefined;
    return Object.values(store.symbology)
      .flatMap((ss) => 
        ss.modifierOne.map((e) => ({
          symbolSet: ss.symbolSet,
          name: ss.name,
          ...e,
        }))
      )
      .map((e) => ({
        ...e,
        text: e.modifier,
      }));
  }, [store.symbology]);

  const searchModifierTwoRef = useMemo(() => {
    if (!store.symbology) return undefined;
    return Object.values(store.symbology)
      .flatMap((ss) => 
        ss.modifierTwo.map((e) => ({
          symbolSet: ss.symbolSet,
          name: ss.name,
          ...e,
        }))
      )
      .map((e) => ({
        ...e,
        text: e.modifier,
      }));
  }, [store.symbology]);

  return {
    isLoaded: store.isLoaded,
    symbology: store.symbology,
    loadData: store.loadData,
    searchSymbolRef,
    searchModifierOneRef,
    searchModifierTwoRef,
  };
}

// --- 3. HELPER HOOK: useSymbolValues ---
// Parse và quản lý state của từng phần SIDC

function useSymbolValues(
  initialSidc: string, 
  initialReinforced?: ReinforcedStatus,
  onChange?: (newSidc: string) => void
) {
  // State for components
  const [sidValue, setSidValue] = useState("");
  const [symbolSetValue, setSymbolSetValue] = useState("");
  const [statusValue, setStatusValue] = useState("");
  const [hqtfdValue, setHqtfdValue] = useState("");
  const [iconValue, setIconValue] = useState("");
  const [emtValue, setEmtValue] = useState("");
  const [mod1Value, setMod1Value] = useState("");
  const [mod2Value, setMod2Value] = useState("");
  const [reinforcedReducedValue, setReinforcedReducedValue] = useState<ReinforcedStatus>(
    initialReinforced ?? "None"
  );

  // Sync state when prop changes
  useEffect(() => {
    const sidcObj = new Sidc(initialSidc);
    setSidValue(sidcObj.standardIdentity);
    setSymbolSetValue(sidcObj.symbolSet);
    setStatusValue(sidcObj.status);
    setHqtfdValue(sidcObj.hqtfd);
    setIconValue(sidcObj.entity + sidcObj.entityType + sidcObj.entitySubType);
    setEmtValue(sidcObj.emt);
    setMod1Value(sidcObj.modifierOne);
    setMod2Value(sidcObj.modifierTwo);
  }, [initialSidc]);

  // Compute full SIDC
  const csidc = useMemo(() => {
    return (
      "100" +
      sidValue +
      symbolSetValue +
      statusValue +
      hqtfdValue +
      emtValue +
      iconValue +
      mod1Value +
      mod2Value
    );
  }, [
    sidValue, symbolSetValue, statusValue, hqtfdValue, 
    emtValue, iconValue, mod1Value, mod2Value
  ]);

  // Helper to update values and notify parent
  const updateValues = useCallback((updater: (current: string) => string) => {
     // Logic này hơi phức tạp trong React vì state update async.
     // Cách tốt nhất là component cha dùng setSidc, hook này chỉ parse thôi.
     // Tuy nhiên để tương thích với logic cũ, ta có thể expose setters.
  }, []);

  return {
    sidValue, setSidValue,
    symbolSetValue, setSymbolSetValue,
    statusValue, setStatusValue,
    hqtfdValue, setHqtfdValue,
    iconValue, setIconValue,
    emtValue, setEmtValue,
    mod1Value, setMod1Value,
    mod2Value, setMod2Value,
    reinforcedReducedValue, setReinforcedReducedValue,
    csidc
  };
}

// --- 4. MAIN HOOK: useSymbolItems ---

export function useSymbolItems(
  sidc: string, 
  reinforcedReduced?: ReinforcedStatus,
  // Callback tùy chọn nếu muốn hook này control việc update SIDC
  onSidcChange?: (newSidc: string) => void
) {
  const values = useSymbolValues(sidc, reinforcedReduced);
  const {
    sidValue, symbolSetValue, statusValue, hqtfdValue, iconValue,
    emtValue, mod1Value, mod2Value, reinforcedReducedValue, csidc
  } = values;

  const {
    symbology,
    isLoaded,
    loadData,
    searchSymbolRef,
    searchModifierOneRef,
    searchModifierTwoRef,
  } = useSymbologyData();

  // Computed Lists
  const symbolSets = useMemo(() => {
    const symbSets = Object.entries(symbology || {}).map(([k, v]) => {
      const iVal = k === CONTROL_MEASURE_SYMBOLSET_VALUE ? "00001602050000" : "00000000000000";
      return {
        code: k,
        text: v.name,
        sidc: "100" + sidValue + k + iVal,
      } as SymbolItem;
    });
    symbSets.sort((a, b) => +a.code - +b.code);
    return symbSets;
  }, [symbology, sidValue]);

  const statusItems = useMemo((): SymbolItem[] => {
    return statusValues.map(({ code, text }) => ({
      code,
      text,
      sidc: "100" + sidValue + symbolSetValue + code + "000000000000",
    }));
  }, [sidValue, symbolSetValue]);

  const reinforcedReducedItems = useMemo((): SymbolItem[] => {
    return [
      { code: "None", text: "Not Applicable", symbolOptions: {} },
      { code: "Reinforced", text: "Reinforced", symbolOptions: { reinforcedReduced: mapReinforcedStatus2Field("Reinforced") } },
      { code: "Reduced", text: "Reduced", symbolOptions: { reinforcedReduced: mapReinforcedStatus2Field("Reduced") } },
      { code: "ReinforcedReduced", text: "Reinforced and reduced", symbolOptions: { reinforcedReduced: mapReinforcedStatus2Field("ReinforcedReduced") } },
    ].map(({ code, text, symbolOptions }) => ({
      code,
      text,
      symbolOptions,
      sidc: "100" + sidValue + symbolSetValue + "000000000000000",
    }));
  }, [sidValue, symbolSetValue]);

  const hqtfdItems = useMemo((): SymbolItem[] => {
    return HQTFDummyValues.map(({ code, text }) => ({
      code,
      text,
      sidc: "100" + sidValue + symbolSetValue + "0" + code + "000000000000",
    }));
  }, [sidValue, symbolSetValue]);

  const icons = useMemo(() => {
    if (!isLoaded || !symbology) return [];
    const symbolSetCode = symbolSetValue || "01";
    let mis = (symbology[symbolSetCode] || {}).mainIcon || [];
    
    if (symbolSetCode === CONTROL_MEASURE_SYMBOLSET_VALUE)
      mis = mis.filter((v) => v.geometry === "Point");
      
    return mis.map((mi) => {
      let text = mi.entity;
      if (mi.entityType) text += " - " + mi.entityType;
      if (mi.entitySubtype) text += " - " + mi.entitySubtype;
      return {
        code: mi.code,
        text,
        sidc: "100" + sidValue + symbolSetCode + "0000" + mi.code + "0000",
        entity: mi.entity,
        entityType: mi.entityType,
        entitySubtype: mi.entitySubtype,
      };
    });
  }, [isLoaded, symbology, symbolSetValue, sidValue]);

  const emtItems = useMemo(() => {
    let vals: SymbolValue[];
    switch (symbolSetValue) {
      case UNIT_SYMBOLSET_VALUE: vals = echelonValues; break;
      case EQUIPMENT_SYMBOLSET_VALUE: vals = mobilityValues; break;
      case DISMOUNTED_SYMBOLSET_VALUE: vals = leadershipValues; break;
      case SURFACE_SYMBOLSET_VALUE:
      case SUBSURFACE_SYMBOLSET_VALUE: vals = towedArrayValues; break;
      default: vals = [{ code: "00", text: "Unspecified" }];
    }
    return vals.map(({ code, text }): SymbolItem => ({
      code,
      text,
      sidc: "100" + sidValue + symbolSetValue + "00" + code + "0000000000",
    }));
  }, [symbolSetValue, sidValue]);

  const mod1Items = useMemo(() => {
    if (!symbology) return [];
    return (
      symbology[symbolSetValue]?.modifierOne.map(
        ({ code, modifier }): SymbolItem => ({
          code,
          text: modifier,
          sidc: "100" + sidValue + symbolSetValue + "0000000000" + code + "00",
        })
      ) || []
    );
  }, [symbology, symbolSetValue, sidValue]);

  const mod2Items = useMemo(() => {
    if (!symbology) return [];
    return (
      symbology[symbolSetValue]?.modifierTwo.map(
        ({ code, modifier }): SymbolItem => ({
          code,
          text: modifier,
          sidc: "100" + sidValue + symbolSetValue + "0000000000" + "00" + code,
        })
      ) || []
    );
  }, [symbology, symbolSetValue, sidValue]);

  // Expose Setters để cập nhật từng phần SIDC
  // Khi UI gọi setter, nó sẽ trigger tính toán lại csidc
  // Nếu có onSidcChange callback, ta gọi nó với giá trị mới dự kiến
  const updateSidcPart = (part: string, value: string) => {
    // Reconstruct SIDC manually here to get "next" state
    let nextSidc = csidc;
    const parts = {
        sid: sidValue,
        set: symbolSetValue,
        status: statusValue,
        hqtfd: hqtfdValue,
        emt: emtValue,
        icon: iconValue,
        mod1: mod1Value,
        mod2: mod2Value
    };
    
    // Update local map
    if(part === 'sid') parts.sid = value;
    if(part === 'symbolSet') parts.set = value;
    if(part === 'status') parts.status = value;
    if(part === 'hqtfd') parts.hqtfd = value;
    if(part === 'emt') parts.emt = value;
    if(part === 'icon') parts.icon = value;
    if(part === 'mod1') parts.mod1 = value;
    if(part === 'mod2') parts.mod2 = value;

    const newStr = "100" + parts.sid + parts.set + parts.status + parts.hqtfd + parts.emt + parts.icon + parts.mod1 + parts.mod2;
    
    // Gọi callback prop để báo cho Parent Component cập nhật state gốc
    if (onSidcChange) {
        onSidcChange(newStr);
    }
  };

  return {
    // Derived Lists
    symbolSets,
    icons,
    statusItems,
    hqtfdItems,
    emtItems,
    mod1Items,
    mod2Items,
    reinforcedReducedItems,
    
    // Current Values
    sidValue,
    symbolSetValue,
    iconValue,
    statusValue,
    hqtfdValue,
    emtValue,
    mod1Value,
    mod2Value,
    reinforcedReducedValue,
    csidc, // Computed SIDC
    
    // Meta/Actions
    isLoaded,
    loadData,
    searchSymbolRef,
    searchModifierOneRef,
    searchModifierTwoRef,
    
    // Setters (Wrappers)
    setSidValue: (v: string) => updateSidcPart('sid', v),
    setSymbolSetValue: (v: string) => updateSidcPart('symbolSet', v),
    setStatusValue: (v: string) => updateSidcPart('status', v),
    setHqtfdValue: (v: string) => updateSidcPart('hqtfd', v),
    setEmtValue: (v: string) => updateSidcPart('emt', v),
    setIconValue: (v: string) => updateSidcPart('icon', v),
    setMod1Value: (v: string) => updateSidcPart('mod1', v),
    setMod2Value: (v: string) => updateSidcPart('mod2', v),
    setReinforcedReducedValue: values.setReinforcedReducedValue // Local state only
  };
}