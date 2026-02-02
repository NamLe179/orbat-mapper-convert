import { createContext, useContext, useMemo, useState } from "react";
import { create } from "zustand";

// Project imports
import type { NewScenarioStore } from "./newScenarioStore";
import { useUnitManipulations } from "./unitManipulations";
import { useScenarioIO } from "./io";
import { useScenarioTime } from "./time";
import { useGeo } from "@/scenariostore/geo";
import { useStateHelpers } from "@/scenariostore/helpers";
import { useScenarioSettings } from "@/scenariostore/settingsManipulations";

// --- Global Loading State (Zustand) ---
// Replaces: export const isLoading = ref(false);

interface LoadingState {
  isLoading: boolean;
  setLoading: (v: boolean) => void;
}


export const useLoadingStore = create<LoadingState>((set) => ({
  isLoading: false,
  setLoading: (isLoading) => set({ isLoading }),
}));

// Helper to access isLoading outside of components if needed, or just standard hook
export const useIsLoading = () => useLoadingStore((state) => state.isLoading);
export const useSetLoading = () => useLoadingStore((state) => state.setLoading);

export interface ScenarioStoreWithHistory extends NewScenarioStore {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

// --- Scenario Context ---
// Replaces: const globalStoreRef = shallowRef<NewScenarioStore>({} as any);

interface ScenarioContextType {
  store: NewScenarioStore | null;
  setStore: (store: NewScenarioStore) => void;
}

export const ScenarioContext = createContext<ScenarioContextType | null>(null);

/**
 * Main Hook to access the scenario logic.
 * Computes all sub-modules (geo, time, io, etc.) based on the current store in Context.
 */
export function useScenario() {
  const context = useContext(ScenarioContext);
  
  if (!context) {
    throw new Error("useScenario must be used within a ScenarioProvider");
  }

  const { store, setStore } = context;
  const isLoading = useIsLoading();

  // We conditionally execute logic or pass a dummy store if null, 
  // but Hooks rules say we must run them unconditionally.
  // Assuming sub-hooks (useGeo, etc.) handle null store gracefully 
  // or we only render the consumer when store is ready.
  // Ideally, the components using this should check `isReady`.

  // For type safety in sub-hooks, we might cast `store!` if we guard with `isReady`.
  // Here we pass the store. If store is null, sub-hooks might throw or return empty.
  // Let's assume the safe pattern is to check `isReady` before accessing `scenario.geo`, etc.

  // Initialize sub-modules
  // Note: These hooks must be converted to React Hooks or pure functions in their respective files.
  // Based on previous conversions (e.g. geo.ts), they are React Hooks.
  
  // Pass store directly (can be null), sub-hooks should handle null gracefully
  const unitActions = useUnitManipulations(store || ({} as NewScenarioStore));
  const timeActions = useScenarioTime(store || ({} as NewScenarioStore));
  
  // IO likely needs access to setStore to load a new scenario
  // Passing a ref-like object { value: store } or the setter
  const io = useScenarioIO({ store, setStore }); 
  
  const geo = useGeo(store);
  const helpers = useStateHelpers(store || ({} as NewScenarioStore));
  const settings = useScenarioSettings(store || ({} as NewScenarioStore));

  const scenario = useMemo(() => {
    if (!store) return null;

    // Don't spread store - it will lose methods and getters
    // Instead, create a proxy or wrapper that adds undo/redo
    const storeWithHistory = store as ScenarioStoreWithHistory;
    
    const timeWithState = {
      ...timeActions,
      timeZone: store.state?.info?.timeZone || "UTC", // Lấy từ store state gốc
    };
    return {
      store: storeWithHistory,
      unitActions,
      time: timeWithState,
      io,
      geo,
      helpers,
      settings,
    };
  }, [store, unitActions, timeActions, io, geo, helpers, settings]);

  return {
    scenario, // Can be null if not initialized
    isLoading,
    isReady: !!store && !!store.state,
    setStore, // Exposed for initialization logic
    store: store, // Return original store
    // Expose helpers cho MainMenu
    undo: store?.undo,
    redo: store?.redo,
    get canUndo() { return store?.canUndo || false; },
    get canRedo() { return store?.canRedo || false; },
  };
}

// --- Types ---
// In React, ReturnType of a hook includes the wrapper object. 
// We extract the internal 'scenario' type.
export type TScenarioHook = ReturnType<typeof useScenario>;
type InferredScenario = NonNullable<TScenarioHook["scenario"]>;

// Final exported type with explict timeZone definition override
export type TScenario = Omit<InferredScenario, "time"> & {
  time: InferredScenario["time"] & {
    timeZone: string;
  };
};
export type TGeo = ReturnType<typeof useGeo>;

// Re-export useful utilities
export { useScenarioState } from "./useScenarioState";
export { useNewScenarioStore, type NewScenarioStore, type ScenarioState } from "./newScenarioStore";