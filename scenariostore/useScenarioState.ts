import { useEffect, useState } from "react";
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
  const [state, setState] = useState<ScenarioState | null>(() => store?.state || null);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (!store) {
      setState(null);
      return;
    }

    // Set initial state
    setState(store.state);

    // Subscribe to store changes
    // Zustand vanilla store subscribe signature: (state, prevState) => void
    const unsubscribe = store.subscribe((newState) => {
      setState(newState);
      forceUpdate(n => n + 1); // Force re-render
    });

    return () => {
      unsubscribe();
    };
  }, [store]);

  return state;
}
