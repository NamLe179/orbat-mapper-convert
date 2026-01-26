import { create } from "zustand";
import NProgress from "nprogress";
import type { ReinforcedStatus, UnitSymbolOptions } from "@/types/scenarioModels";

// --- Types (Giữ nguyên từ file cũ) ---

export interface ModalTimestampOptions {
  timeZone: string;
  title: string;
}

export interface ModalSidcOptions {
  title: string;
  hideModifiers: boolean;
  hideSymbolColor: boolean;
  hideCustomSymbols: boolean;
  symbolOptions: UnitSymbolOptions;
  inheritedSymbolOptions: UnitSymbolOptions;
  initialTab: number;
  reinforcedStatus: ReinforcedStatus;
}

export interface ModalSidcReturn {
  sidc: string;
  symbolOptions: UnitSymbolOptions;
  reinforcedStatus?: ReinforcedStatus;
}

// --- Date Modal Store & Logic ---

interface DateModalState {
  isOpen: boolean;
  initialValue: number;
  timeZone: string;
  title: string;
  // Hàm resolve Promise để trả kết quả về cho người gọi
  resolveRef: (value: number | undefined) => void;
  
  // Actions
  getModalTimestamp: (initialValue: number, options?: Partial<ModalTimestampOptions>) => Promise<number | undefined>;
  confirm: (data: number) => void;
  cancel: () => void;
  setIsOpen: (isOpen: boolean) => void; // Để hỗ trợ v-model like behavior
}

const useDateStore = create<DateModalState>((set, get) => ({
  isOpen: false,
  initialValue: 0,
  timeZone: "UTC",
  title: "Set scenario time",
  resolveRef: () => {},

  getModalTimestamp: (initialValue, options = {}) => {
    return new Promise((resolve) => {
      set({
        isOpen: true,
        initialValue,
        timeZone: options.timeZone || "UTC",
        title: options.title || "Set scenario time",
        resolveRef: resolve,
      });
    });
  },

  confirm: (data) => {
    const { resolveRef } = get();
    set({ isOpen: false });
    resolveRef(data);
  },

  cancel: () => {
    const { resolveRef } = get();
    set({ isOpen: false });
    resolveRef(undefined);
  },

  setIsOpen: (isOpen) => set({ isOpen }),
}));

/**
 * Hook cho Date Modal
 * Tương thích API với Vue composable cũ
 */
export function useDateModal() {
  const store = useDateStore();

  return {
    isRevealed: store.isOpen,
    showDateModal: store.isOpen, // React state value
    revealDateModal: store.getModalTimestamp,
    getModalTimestamp: store.getModalTimestamp,
    confirmDateModal: store.confirm,
    cancelDateModal: store.cancel,
    // State values exposed for UI
    initialDateModalValue: store.initialValue,
    dateModalTimeZone: store.timeZone,
    dateModalTitle: store.title,
    // Setter nếu cần bind 2 chiều thủ công
    setShowDateModal: store.setIsOpen 
  };
}

// --- SIDC Modal Store & Logic ---

interface SidcModalState {
  isOpen: boolean;
  initialValue: string;
  title: string;
  hideModifiers: boolean;
  hideSymbolColor: boolean;
  hideCustomSymbols: boolean;
  symbolOptions: UnitSymbolOptions;
  inheritedSymbolOptions: UnitSymbolOptions;
  initialTab: number;
  reinforcedStatus?: ReinforcedStatus;
  
  resolveRef: (value: ModalSidcReturn | undefined) => void;

  getModalSidc: (initialValue: string, options?: Partial<ModalSidcOptions>) => Promise<ModalSidcReturn | undefined>;
  confirm: (data: ModalSidcReturn) => void;
  cancel: () => void;
  setIsOpen: (isOpen: boolean) => void;
}

const useSidcStore = create<SidcModalState>((set, get) => ({
  isOpen: false,
  initialValue: "10031000001211000000",
  title: "Select symbol",
  hideModifiers: false,
  hideSymbolColor: false,
  hideCustomSymbols: false,
  symbolOptions: {},
  inheritedSymbolOptions: {},
  initialTab: 0,
  reinforcedStatus: undefined,
  resolveRef: () => {},

  getModalSidc: (initialValue, options = {}) => {
    NProgress.start();
    return new Promise((resolve) => {
      set({
        isOpen: true,
        initialValue,
        title: options.title || "Symbol picker",
        hideModifiers: options.hideModifiers || false,
        hideSymbolColor: options.hideSymbolColor || false,
        hideCustomSymbols: options.hideCustomSymbols || false,
        symbolOptions: options.symbolOptions || {},
        inheritedSymbolOptions: options.inheritedSymbolOptions || {},
        initialTab: options.initialTab ?? 0,
        reinforcedStatus: options.reinforcedStatus,
        resolveRef: resolve,
      });
    });
  },

  confirm: (data) => {
    const { resolveRef } = get();
    set({ isOpen: false });
    resolveRef(data);
    NProgress.done();
  },

  cancel: () => {
    const { resolveRef } = get();
    set({ isOpen: false });
    resolveRef(undefined);
    NProgress.done();
  },

  setIsOpen: (isOpen) => set({ isOpen }),
}));

/**
 * Hook cho SIDC Modal
 * Tương thích API với Vue composable cũ
 */
export function useSidcModal() {
  const store = useSidcStore();

  return {
    isRevealed: store.isOpen,
    showSidcModal: store.isOpen,
    revealSidcModal: store.getModalSidc,
    getModalSidc: store.getModalSidc,
    confirmSidcModal: store.confirm,
    cancelSidcModal: store.cancel,
    // State values exposed for UI
    initialSidcModalValue: store.initialValue,
    sidcModalTitle: store.title,
    hideModifiers: store.hideModifiers,
    hideSymbolColor: store.hideSymbolColor,
    hideCustomSymbols: store.hideCustomSymbols,
    symbolOptions: store.symbolOptions,
    inheritedSymbolOptions: store.inheritedSymbolOptions,
    initialTab: store.initialTab,
    initialReinforcedReduced: store.reinforcedStatus,
    setShowSidcModal: store.setIsOpen
  };
}

export type TimeModalPromise = ReturnType<typeof useDateModal>["getModalTimestamp"];
export type SidcModalPromise = ReturnType<typeof useSidcModal>["getModalSidc"];