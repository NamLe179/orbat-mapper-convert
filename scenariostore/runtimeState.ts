// Plain runtime state maps outside immer store for hot-path rendering.

import type { EntityId } from "@/types/base";
import type { CurrentState } from "@/types/scenarioModels";
import type { CurrentScenarioFeatureState, FeatureId } from "@/types/scenarioGeoModels";

export const unitRuntimeState = new Map<EntityId, CurrentState | null>();
export const featureRuntimeState = new Map<FeatureId, CurrentScenarioFeatureState | null | undefined>();

export function getUnitRuntimeState(unitId: EntityId) {
  return unitRuntimeState.get(unitId) ?? null;
}

export function getFeatureRuntimeState(featureId: FeatureId) {
  return featureRuntimeState.get(featureId) ?? null;
}
