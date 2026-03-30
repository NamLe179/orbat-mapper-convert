import { useSyncExternalStore } from "react";
import type { NewScenarioStore, ScenarioState } from "./newScenarioStore";

/**
 * Hook to subscribe to scenario store state changes.
 * This ensures components re-render when the store state changes.
 * 
 * Usage:
 * ```tsx
 * const { store } = useActiveScenario();
 * const state = useScenarioState(store); // Re-renders on state change
 * ```
 */
export function useScenarioState(store: NewScenarioStore | null): ScenarioState | null {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (!store) return () => {};

      // Zustand vanilla store subscribe signature: (state, prevState) => void
      return store.subscribe(() => {
        onStoreChange();
      });
    },
    () => (store ? store.state : null),
    () => null,
  );
}
