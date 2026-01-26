import { useMemo, useEffect, useRef } from "react";
import { create } from "zustand";
import {
  DISMOUNTED_SYMBOLSET_VALUE,
  echelonValues,
  EQUIPMENT_SYMBOLSET_VALUE,
  leadershipValues,
  mobilityValues,
  SID,
  type SidValue,
  SUBSURFACE_SYMBOLSET_VALUE,
  SURFACE_SYMBOLSET_VALUE,
  towedArrayValues,
  UNIT_SYMBOLSET_VALUE,
} from "@/symbology/values";
import type { SymbolItem, SymbolValue } from "@/types/constants";
import { Sidc } from "@/symbology/sidc";
import { useActiveScenario } from "@/components/injects"; // Giả định hook thay cho inject
import { useActiveUnit } from "@/stores/dragStore"; // Giả định store này đã convert sang hook

export type SymbolPage = "land" | "sea" | "air" | "space" | "equipment";

interface ExtendedSymbolValue extends SymbolValue {
  symbolSet: string;
}

// --- Static Data ---
const landIcons: ExtendedSymbolValue[] = [
  { symbolSet: "10", code: "121100", text: "Infantry" },
  { symbolSet: "10", code: "121102", text: "Mechanized Infantry" },
  { symbolSet: "10", code: "121300", text: "Scout" },
  { symbolSet: "10", code: "130300", text: "Artillery" },
  { symbolSet: "10", code: "120500", text: "Armor" },
  { symbolSet: "10", code: "160600", text: "Combat Service Support" },
  { symbolSet: "10", code: "130100", text: "Air Defense" },
  { symbolSet: "10", code: "140700", text: "Engineer" },
];

const seaIcons: ExtendedSymbolValue[] = [
  { symbolSet: "30", code: "110000", text: "Military" },
  { symbolSet: "30", code: "120100", text: "Carrier" },
  { symbolSet: "30", code: "120204", text: "Frigate" },
  { symbolSet: "30", code: "120300", text: "Amphibious Warfare Ship" },
  { symbolSet: "30", code: "120500", text: "Patrol Boat" },
  { symbolSet: "35", code: "110100", text: "Submarine" },
  { symbolSet: "35", code: "130100", text: "Torpedo" },
];

const airIcons: ExtendedSymbolValue[] = [
  { symbolSet: "01", code: "110100", text: "Fixed Wing" },
  { symbolSet: "01", code: "110104", text: "Fighter" },
  { symbolSet: "01", code: "110103", text: "Bomber" },
  { symbolSet: "01", code: "110200", text: "Rotary Wing" },
  { symbolSet: "02", code: "110000", text: "Missile" },
];

// --- Global State Store (Zustand) ---
// Thay thế cho các biến ref() khai báo ngoài hàm trong Vue
interface ToolbarState {
  symbolPage: SymbolPage;
  currentSid: SidValue | string;
  currentEchelon: string;
  customIcon: SymbolValue;
  activeSidc: string;
  
  // Actions
  setSymbolPage: (page: SymbolPage) => void;
  setCurrentSid: (sid: SidValue | string) => void;
  setCurrentEchelon: (echelon: string) => void;
  setCustomIcon: (icon: SymbolValue) => void;
  setActiveSidc: (sidc: string) => void;
}

export const useToolbarStore = create<ToolbarState>((set) => ({
  symbolPage: "land",
  currentSid: SID.Friend,
  currentEchelon: "16",
  customIcon: { code: "10031000141211000000", text: "Infantry" },
  activeSidc: "10031000141211000000",

  setSymbolPage: (symbolPage) => set({ symbolPage }),
  setCurrentSid: (currentSid) => set({ currentSid }),
  setCurrentEchelon: (currentEchelon) => set({ currentEchelon }),
  setCustomIcon: (customIcon) => set({ customIcon }),
  setActiveSidc: (activeSidc) => set({ activeSidc }),
}));


// --- Hooks ---

export function useToolbarUnitSymbolData() {
  const {
    symbolPage,
    currentSid,
    currentEchelon,
    customIcon,
    activeSidc,
    setCurrentEchelon
  } = useToolbarStore();

  // EmtStore logic: Ref được dùng để giữ trạng thái local mutable mà không gây re-render
  // Logic này trong Vue dùng để nhớ echelon cho mỗi symbol set
  const emtStoreRef = useRef<Record<string, string>>({ [UNIT_SYMBOLSET_VALUE]: "16" });

  const symbolSetValue = useMemo(() => new Sidc(activeSidc).symbolSet, [activeSidc]);

  // Helper function
  const mapSymbolCode = (item: ExtendedSymbolValue): SymbolItem => {
    return {
      code: item.code,
      text: item.text,
      sidc: "100" + currentSid + item.symbolSet + "00" + "00" + item.code + "0000",
    };
  };

  const iconItems = useMemo(() => {
    switch (symbolPage) {
      case "land":
        return landIcons.map(mapSymbolCode);
      case "sea":
        return seaIcons.map(mapSymbolCode);
      case "air":
        return airIcons.map(mapSymbolCode);
      default:
        return [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolPage, currentSid]); // mapSymbolCode phụ thuộc currentSid

  const seaItems = useMemo(() => seaIcons.map(mapSymbolCode), [currentSid]);

  const echelonSidc = useMemo(
    () =>
      "100" +
      currentSid +
      symbolSetValue +
      "00" +
      currentEchelon +
      "0000000000",
    [currentSid, symbolSetValue, currentEchelon]
  );

  const customSidc = useMemo(() => {
    const parsedSidc = new Sidc(customIcon.code);
    parsedSidc.standardIdentity = currentSid;
    parsedSidc.emt = "00";
    parsedSidc.hqtfd = "0";
    return parsedSidc.toString();
  }, [customIcon.code, currentSid]);

  const emtItems = useMemo(() => {
    let values: SymbolValue[];
    switch (symbolSetValue) {
      case UNIT_SYMBOLSET_VALUE:
        values = echelonValues;
        break;
      case EQUIPMENT_SYMBOLSET_VALUE:
        values = mobilityValues;
        break;
      case DISMOUNTED_SYMBOLSET_VALUE:
        values = leadershipValues;
        break;
      case SURFACE_SYMBOLSET_VALUE:
      case SUBSURFACE_SYMBOLSET_VALUE:
        values = towedArrayValues;
        break;
      default:
        values = [{ code: "00", text: "Unspecified" }];
    }
    return values.map(({ code, text }): SymbolItem => {
      return {
        code,
        text,
        sidc:
          "100" + currentSid + symbolSetValue + "00" + code + "0000000000",
      };
    });
  }, [symbolSetValue, currentSid]);

  // Watcher Logic: Chuyển đổi echelon khi symbolSet thay đổi
  // Sử dụng useRef để track giá trị cũ (previous value)
  const prevSymbolSetRef = useRef(symbolSetValue);

  useEffect(() => {
    if (prevSymbolSetRef.current !== symbolSetValue) {
      const oldSet = prevSymbolSetRef.current;
      const newSet = symbolSetValue;
      
      // Lưu giá trị echelon hiện tại vào store cho set cũ
      emtStoreRef.current[oldSet] = currentEchelon;
      
      // Load giá trị echelon đã lưu cho set mới (hoặc default '00')
      const nextEchelon = emtStoreRef.current[newSet] || "00";
      setCurrentEchelon(nextEchelon);
      
      prevSymbolSetRef.current = newSet;
    }
  }, [symbolSetValue, currentEchelon, setCurrentEchelon]);

  return {
    currentSid,
    currentEchelon,
    activeSidc,
    iconItems,
    echelonSidc,
    customSidc,
    customIcon,
    emtItems,
    seaItems,
    symbolPage,
    // Expose setters nếu component cần dùng
    useToolbarStore 
  };
}

export function useActiveSidc() {
  const { unitActions } = useActiveScenario(); // Hook giả định
  const { activeParent } = useActiveUnit(); // Hook giả định
  
  // Lấy state từ store global
  const activeSidc = useToolbarStore((s) => s.activeSidc);
  const currentEchelon = useToolbarStore((s) => s.currentEchelon);
  const currentSid = useToolbarStore((s) => s.currentSid);

  const sidc = useMemo(() => {
    const sidcObj = new Sidc(activeSidc);
    sidcObj.emt = currentEchelon;
    sidcObj.standardIdentity = currentSid;
    return sidcObj.toString();
  }, [activeSidc, currentEchelon, currentSid]);

  const symbolOptions = useMemo(() =>
    activeParent
      ? {
          ...unitActions.getCombinedSymbolOptions(activeParent, true),
        }
      : {},
    [activeParent, unitActions]
  );

  return { sidc, symbolOptions };
}