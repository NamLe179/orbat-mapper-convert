import { createContext, useContext } from "react";
import type { EntityId } from "@/types/base";
import type { TScenario } from "@/scenariostore";
import type { UseFeatureStyles } from "@/geo/featureStyles";
import type { SidcModalPromise, TimeModalPromise } from "@/hooks/modals";
import type { FeatureId } from "@/types/scenarioGeoModels";
import type OLMap from "ol/Map";
import type Select from "ol/interaction/Select";
import type { EventSearchResult } from "@/components/types";
import type { PhotonSearchResult } from "@/hooks/geosearching";
import type { ScenarioActions } from "@/types/constants";

// Helper type to replace VueUse's EventHook in React context.
// In React, this is usually a function that accepts a callback (subscription)
// or the dispatcher function itself.
type ReactEventHook<T> = (data: T) => void;

// -----------------------------------------------------------------------------
// 1. Context Definitions
// -----------------------------------------------------------------------------

// Active Parent (Unit/Layer)
// Vue: Ref<EntityId...> -> React: Value + Setter
export interface ActiveParentContextType {
  activeParentId: EntityId | undefined | null;
  setActiveParentId: (id: EntityId | undefined | null) => void;
}
export const ActiveParentContext = createContext<ActiveParentContextType | null>(null);

// Active Layer
export interface ActiveLayerContextType {
  activeLayerId: FeatureId | undefined | null;
  setActiveLayerId: (id: FeatureId | undefined | null) => void;
}
export const ActiveLayerContext = createContext<ActiveLayerContextType | null>(null);

// Active Scenario
export const ActiveScenarioContext = createContext<TScenario | null>(null);

// Active Feature Styles
export const ActiveFeatureStylesContext = createContext<UseFeatureStyles | null>(null);

// Current Scenario Tab
export interface CurrentScenarioTabContextType {
  currentTab: number;
  setCurrentTab: (tab: number) => void;
}
export const CurrentScenarioTabContext = createContext<CurrentScenarioTabContextType | null>(null);

// Modals
export interface TimeModalContextType {
  getModalTimestamp: TimeModalPromise;
}
export const TimeModalContext = createContext<TimeModalContextType | null>(null);

export interface SidcModalContextType {
  getModalSidc: SidcModalPromise;
}
export const SidcModalContext = createContext<SidcModalContextType | null>(null);

// Search Actions
// Defines the methods available to trigger actions from search results
export interface SearchActionsContextType {
  onUnitSelect: ReactEventHook<{ unitId: EntityId; options?: { noZoom?: boolean } }>;
  onLayerSelect: ReactEventHook<{ layerId: FeatureId }>;
  onImageLayerSelect: ReactEventHook<{ layerId: FeatureId }>;
  onFeatureSelect: ReactEventHook<{ featureId: FeatureId; layerId: FeatureId }>;
  onEventSelect: ReactEventHook<EventSearchResult>;
  onPlaceSelect: ReactEventHook<PhotonSearchResult>;
  onScenarioAction: ReactEventHook<{ action: ScenarioActions }>;
}
export const SearchActionsContext = createContext<SearchActionsContextType | null>(null);

// OpenLayers Map & Interactions
// Typically these are populated once the map initializes
export const ActiveMapContext = createContext<OLMap | null>(null);
export const ActiveFeatureSelectInteractionContext = createContext<Select | null>(null);

// -----------------------------------------------------------------------------
// 2. Custom Hooks for Easy Access
// -----------------------------------------------------------------------------

export function useActiveParent() {
  return useContext(ActiveParentContext);
}

export function useActiveLayer() {
  return useContext(ActiveLayerContext);
}

export function useActiveScenario() {
  const context = useContext(ActiveScenarioContext);
  if (!context) {
    throw new Error("useActiveScenario must be used within an ActiveScenarioProvider");
  }
  return context;
}

export function useActiveFeatureStyles() {
  return useContext(ActiveFeatureStylesContext);
}

export function useCurrentScenarioTab() {
  return useContext(CurrentScenarioTabContext);
}

export function useTimeModal() {
  return useContext(TimeModalContext);
}

export function useSidcModal() {
  return useContext(SidcModalContext);
}

export function useSearchActions() {
  return useContext(SearchActionsContext);
}

export function useActiveMap() {
  return useContext(ActiveMapContext);
}

export function useActiveFeatureSelectInteraction() {
  return useContext(ActiveFeatureSelectInteractionContext);
}