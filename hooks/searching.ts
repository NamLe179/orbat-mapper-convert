import { useCallback } from "react";
import fuzzysort from "fuzzysort";

// Helper project imports
import type { NUnit } from "@/types/internalModels";
import { groupBy, htmlTagEscape } from "@/utils"; // Utils cần convert sang TS thuần
import { useActiveScenario } from "@/components/injects"; // Context hook
import type {
  ActionSearchResult,
  EventSearchResult,
  MapLayerSearchResult,
  LayerFeatureSearchResult,
  UnitSearchResult,
} from "@/components/types";
import type { ScenarioActions } from "@/types/constants";

// --- ACTION SEARCH LOGIC (Pure Function / Static Data) ---

interface ActionItem {
  action: ScenarioActions;
  label: string;
  icon?: string;
}

const actionItems: ActionItem[] = [
  { action: "browseSymbols", label: "Browse symbols" },
  { action: "save", label: "Save scenario to local storage", icon: "save" },
  { action: "loadNew", label: "Load scenario", icon: "upload" },
  { action: "createNew", label: "Create new scenario", icon: "add" },
  { action: "exportJson", label: "Download scenario", icon: "download" },
  { action: "import", label: "Import data", icon: "upload" },
  { action: "export", label: "Export scenario data", icon: "download" },
  { action: "addEquipment", label: "Add new equipment", icon: "add" },
  { action: "addPersonnel", label: "Add new personnel category", icon: "add" },
  { action: "exportToClipboard", label: "Copy scenario to clipboard" },
  { action: "addSide", label: "Add side", icon: "add" },
  { action: "addTileJSONLayer", label: "Add TileJSON map layer", icon: "add" },
  { action: "addXYZLayer", label: "Add XYZ map layer", icon: "add" },
  { action: "addImageLayer", label: "Add image layer", icon: "add" },
  { action: "startPlayback", label: "Start playback", icon: "play" },
  { action: "stopPlayback", label: "Pause playback", icon: "pause" },
  { action: "increaseSpeed", label: "Speed up playback", icon: "increaseSpeed" },
  { action: "decreaseSpeed", label: "slow down playback", icon: "decreaseSpeed" },
  { action: "shareAsUrl", label: "Share scenario as URL", icon: "share" },
  { action: "share", label: "Share scenario online", icon: "share" },
];

export function useActionSearch() {
  const searchActions = useCallback((query: string): ActionSearchResult[] => {
    const q = query.trim();
    if (!q) return [];

    const hits = fuzzysort.go(q, actionItems, { key: ["label"] });

    return hits.map(
      (u, i) =>
        ({
          ...u.obj,
          id: i,
          name: u.obj.label,
          index: i,
          highlight: fuzzysort.highlight({
            ...u,
            target: htmlTagEscape(u.target),
          }),
          score: u.score,
          category: "Actions",
        }) as ActionSearchResult,
    );
  }, []);

  const allActionItems: ActionSearchResult[] = actionItems.map(
    (a, i) => ({
      ...a,
      category: "Actions",
      index: i,
      id: i,
      name: a.label,
      highlight: "",
      score: 0,
    })
  );

  return {
    searchActions,
    actionItems: allActionItems,
  };
}


// --- SCENARIO SEARCH HOOK ---

export function useScenarioSearch(
  // Optional: Allow injecting external search actions (e.g. from UI store)
  searchActionsFn?: (query: string) => ActionSearchResult[]
) {
  const {
    unitActions,
    store: { state },
    geo,
    helpers: { getUnitById },
  } = useActiveScenario();

  const searchUnits = useCallback((query: string, limitToPosition = false): UnitSearchResult[] => {
    const q = query.trim();
    if (!q) return [];
    
    // unitActions.units.value in Vue -> unitActions.units in React context (assuming it's just array)
    // Adjust depending on how units are exposed in your store (array vs ref)
    const units = Array.isArray(unitActions.units) ? unitActions.units : []; // Safety check

    const hits = fuzzysort.go(q, units, {
      keys: ["name", "shortName"],
    });

    return hits
      .filter((h) => {
        if (limitToPosition) {
          const u = getUnitById(h.obj.id);
          return !!u?._state?.location;
        }
        return true;
      })
      .slice(0, 10)
      .map((u, i) => {
        const parentObj = u.obj._pid ? getUnitById(u.obj._pid) : undefined;
        let parent: NUnit | undefined;
        
        if (parentObj) {
           parent = { ...parentObj } as NUnit;
           // Side effect on local copy, OK
           parent.symbolOptions = unitActions.getCombinedSymbolOptions(parent);
        }

        return {
          name: u.obj.name,
          sidc: u.obj.sidc,
          id: u.obj.id,
          index: i,
          parent,
          highlight:
            u[0] &&
            fuzzysort.highlight({
              ...u[0],
              score: u.score,
              target: htmlTagEscape(u[0].target),
            }),
          score: u.score,
          category: "Units",
          symbolOptions: unitActions.getCombinedSymbolOptions(u.obj),
          _state: u.obj._state,
        } as UnitSearchResult;
      });
  }, [unitActions, getUnitById]);

  const searchLayerFeatures = useCallback((query: string): LayerFeatureSearchResult[] => {
    const q = query.trim();
    if (!q) return [];

    // geo.itemsInfo.value -> geo.itemsInfo
    const items = Array.isArray(geo.itemsInfo) ? geo.itemsInfo : [];

    const hits = fuzzysort.go(q, items, { key: ["name"] });

    return hits.slice(0, 10).map(
      (u) =>
        ({
          ...u.obj,
          highlight: fuzzysort.highlight({
            ...u,
            target: htmlTagEscape(u.target),
          }),
          score: u.score,
          category: "Features",
        }) as LayerFeatureSearchResult,
    );
  }, [geo.itemsInfo]);

  const searchImageLayers = useCallback((query: string): MapLayerSearchResult[] => {
    const q = query.trim();
    if (!q) return [];

    // geo.mapLayers.value -> geo.mapLayers
    const layers = Array.isArray(geo.mapLayers) ? geo.mapLayers : [];

    const hits = fuzzysort.go(q, layers, { key: ["name"] });

    return hits.slice(0, 10).map(
      (u, i) =>
        ({
          ...u.obj,
          index: i,
          highlight: fuzzysort.highlight({
            ...u,
            target: htmlTagEscape(u.target),
          }),
          score: u.score,
          category: "Map layers",
        }) as MapLayerSearchResult,
    );
  }, [geo.mapLayers]);

  const searchEvents = useCallback((query: string): EventSearchResult[] => {
    const q = query.trim();
    if (!q) return [];
    
    const mergedEvents = state.events.map((id) => state.eventMap[id]);

    const hits = fuzzysort.go(q, mergedEvents, { key: ["title"] });

    return hits.slice(0, 10).map(
      (u, i) =>
        ({
          ...u.obj,
          index: i,
          name: u.obj.title,
          highlight: fuzzysort.highlight({
            ...u,
            target: htmlTagEscape(u.target),
          }),
          score: u.score,
          category: "Events",
        }) as EventSearchResult,
    );
  }, [state.events, state.eventMap]);

  const combineHits = useCallback((
    hits: (
      | UnitSearchResult[]
      | LayerFeatureSearchResult[]
      | EventSearchResult[]
      | MapLayerSearchResult[]
      | ActionSearchResult[]
    )[],
  ) => {
    const combinedHits = hits.sort((a, b) => {
      const scoreA = a[0]?.score ?? -10000; // Use safer default low score
      const scoreB = b[0]?.score ?? -10000;
      return scoreB - scoreA;
    });
    
    // Flat mapping with index update
    return combinedHits.flat().map((e, index) => ({
      ...e,
      index,
    }));
  }, []);

  const search = useCallback((query: string) => {
    const unitHits = searchUnits(query);
    const featureHits = searchLayerFeatures(query);
    const imageLayerHits = searchImageLayers(query);
    const eventHits = searchEvents(query);
    const actionHits = searchActionsFn ? searchActionsFn(query) : [];

    const allHits = combineHits([
      unitHits,
      featureHits,
      eventHits,
      imageLayerHits,
      actionHits,
    ]);

    const numberOfHits =
      unitHits.length +
      featureHits.length +
      eventHits.length +
      imageLayerHits.length +
      actionHits.length;

    return { 
      numberOfHits, 
      groups: groupBy(allHits, "category") 
    };
  }, [
    searchUnits, 
    searchLayerFeatures, 
    searchImageLayers, 
    searchEvents, 
    searchActionsFn,
    combineHits
  ]);

  return { search };
}