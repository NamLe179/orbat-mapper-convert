import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import OLMap from "ol/Map";
import View from "ol/View";
import VectorLayer from "ol/layer/Vector";
import { fromLonLat, toLonLat } from "ol/proj";
import { Point } from "ol/geom";
import { DragBox, Modify, Select } from "ol/interaction";
import { ModifyEvent } from "ol/interaction/Modify";
import { SelectEvent } from "ol/interaction/Select";
import { Feature } from "ol";
import type { FeatureLike } from "ol/Feature";
import type { Coordinate } from "ol/coordinate";
import type { Position } from "geojson";
import BaseEvent from "ol/events/Event";
import {
  altKeyOnly,
  click as clickCondition,
  platformModifierKeyOnly,
} from "ol/events/condition";
import { unByKey } from "ol/Observable";

// Utils & Helpers
import { createUnitFeatureAt, createUnitLayer } from "@/geo/layers";
import {
  clearUnitStyleCache,
  createUnitLabelData,
  createUnitStyle,
  labelStyleCache,
  selectedUnitStyleCache,
  unitStyleCache,
} from "@/geo/unitStyles";
import { nanoid } from "@/utils/ids";
import { getCoordinateFormatFunction } from "@/utils/geoConvert";
import { LayerTypes } from "@/modules/scenarioeditor/featureLayerUtils";
import { isScenarioFeatureDragItem, isUnitDragItem } from "@/types/draggables";
import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";

// Styles
import Text from "ol/style/Text";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import Style from "ol/style/Style";

// Turf
import { coordEach } from "@turf/meta";
import { centroid } from "@turf/centroid";
import { klona } from "klona";

// Stores / Contexts (Assumed Hooks)
import { useActiveScenario } from "@/components/injects";
import { useMapSettingsStore } from "@/stores/mapSettingsStore";
import { useSymbolSettingsStore } from "@/stores/settingsStore";
import { useSelectedItems } from "@/stores/selectedStore";
import type { EntityId } from "@/types/base";
import type { TScenario } from "@/scenariostore";

// --- Static Helpers ---

let zoomResolutions: number[] = [];
export function calculateZoomToResolution(view: View) {
  zoomResolutions = [];
  for (let i = 0; i <= 24; i++) {
    zoomResolutions.push(view.getResolutionForZoom(i) || 0);
  }
}
// Init once
calculateZoomToResolution(new View());

// Separate map to track cache keys for units (avoids mutating frozen objects)
const unitCacheKeyMap = new Map<string, string>();

const unitLabelStyle = new Style({
  text: new Text({
    textAlign: "center",
    font: '12px "Inter Variable"',
    fill: new Fill({ color: "black" }),
    stroke: new Stroke({ color: "rgba(255,255,255,0.9)", width: 4 }),
    textBaseline: "top",
  }),
});

const selectedUnitLabelStyle = new Style({
  text: new Text({
    textAlign: "center",
    font: '12px "Inter Variable"',
    fill: new Fill({ color: "black" }),
    stroke: new Stroke({ color: "rgb(232,230,7)", width: 3 }),
    textBaseline: "top",
  }),
});

// --- HOOK 1: Manage Unit Layer & Labels ---

export function useUnitLayer(olMap: OLMap | null) {
  const scenario = useActiveScenario(); // Hook thay cho inject
  const {
    store: { state, onUndoRedo },
    geo,
    unitActions: { getCombinedSymbolOptions },
    helpers: { getUnitById },
  } = scenario;

  const mapSettings = useMapSettingsStore();
  const symbolSettings = useSymbolSettingsStore();

  // 1. Create Layers (Memoized)
  const { unitLayer, labelLayer } = useMemo(() => {
    const uLayer = createUnitLayer();
    const lLayer = new VectorLayer({
      declutter: true,
      source: uLayer.getSource()!,
      updateWhileInteracting: true,
      updateWhileAnimating: true,
      properties: {
        id: nanoid(),
        title: "Unit labels",
        layerType: LayerTypes.labels,
      },
      visible: false, // Default
    });
    return { unitLayer: uLayer, labelLayer: lLayer };
  }, []);

  // 2. Style Functions (Closure to access latest state/props)
  // UseRef để giữ các hàm này stable mà vẫn truy cập được state mới nhất nếu cần
  // Tuy nhiên, vì các dependency (scenario, settings) thay đổi, ta cần cập nhật ref.
  
  const ctxRef = useRef({ scenario, mapSettings, symbolSettings });
  useEffect(() => {
    ctxRef.current = { scenario, mapSettings, symbolSettings };
  }, [scenario, mapSettings, symbolSettings]);

  const unitStyleFunction = useCallback((feature: FeatureLike, resolution: number) => {
    const { scenario, mapSettings, symbolSettings } = ctxRef.current;
    const unitId = feature.getId() as string;
    const unit = scenario.helpers.getUnitById(unitId);

    if (!unit) return;
    const { limitVisibility, minZoom = 0, maxZoom = 24 } = unit.style ?? {};

    if (
      limitVisibility &&
      (resolution > zoomResolutions[minZoom] || resolution < zoomResolutions[maxZoom])
    ) {
      return;
    }

    // Use separate cache key map to avoid mutating frozen unit object
    const cacheKey = unitCacheKeyMap.get(unitId);
    let unitStyle = cacheKey ? unitStyleCache.get(cacheKey) : undefined;
    if (!unitStyle) {
      const symbolOptions = scenario.unitActions.getCombinedSymbolOptions(unit);
      const { style, cacheKey: newCacheKey } = createUnitStyle(unit, symbolOptions, scenario, mapSettings, symbolSettings);
      unitStyle = style;
      // Store cache key in separate map instead of mutating unit
      unitCacheKeyMap.set(unitId, newCacheKey);
      unitStyleCache.set(newCacheKey, unitStyle);
    }
    return unitStyle;
  }, []); // Empty dep, relies on ctxRef

  const labelStyleFunction = useCallback((feature: FeatureLike, resolution: number) => {
    const { scenario, mapSettings, symbolSettings } = ctxRef.current;
    const unitId = feature.getId() as string;
    const unit = scenario.helpers.getUnitById(unitId);
    
    if (!unit) return;

    const { limitVisibility, minZoom = 0, maxZoom = 24 } = unit.style ?? {};
    if (
      limitVisibility &&
      (resolution > zoomResolutions[minZoom] || resolution < zoomResolutions[maxZoom])
    ) {
      return;
    }

    let labelData = labelStyleCache.get(unitId);
    if (!labelData) {
      const unitStyle = unitStyleCache.get(unit._ikey ?? unitId);
      labelData = createUnitLabelData(unit, unitStyle, {
        wrapLabels: mapSettings.mapWrapUnitLabels,
        wrapWidth: mapSettings.mapWrapLabelWidth,
      });

      if (unitStyle) {
        labelStyleCache.set(unitId, labelData);
      }
    }

    if (labelData) {
      const textStyle = unitLabelStyle.getText()!;
      textStyle.setText(labelData.text);
      textStyle.setOffsetY(labelData.yOffset);
      return unitLabelStyle;
    }
  }, []);

  // 3. Effects for Layer Settings

  useEffect(() => {
    unitLayer.setStyle(unitStyleFunction);
  }, [unitLayer, unitStyleFunction]);

  useEffect(() => {
    const visible = mapSettings.mapUnitLabelBelow;
    labelLayer.setVisible(visible);
    labelLayer.setStyle(visible ? labelStyleFunction : undefined);
  }, [mapSettings.mapUnitLabelBelow, labelLayer, labelStyleFunction]);

  useEffect(() => {
    const size = mapSettings.mapLabelSize;
    unitLabelStyle.getText()?.setFont(`${size}px "Inter Variable"`);
    selectedUnitLabelStyle.getText()?.setFont(`${size}px "Inter Variable"`);
  }, [mapSettings.mapLabelSize]);

  // 4. Undo/Redo Handler (External Subscription)
  // Giả định onUndoRedo trả về unsubscribe function
  useEffect(() => {
    const unsub = onUndoRedo(() => {
      clearUnitStyleCache();
      // Force redraw logic if needed
      unitLayer.changed();
    });
    return () => unsub?.();
  }, [onUndoRedo, unitLayer]);

  // 5. Draw Logic
  const drawUnits = useCallback(() => {
    const source = unitLayer.getSource();
    if (!source) return;

    const seen = new Set<string>();

    for (const unit of geo.everyVisibleUnit) {
      if (!unit._state?.location) continue;

      const unitId = unit.id;
      seen.add(unitId);

      const existing = source.getFeatureById(unitId);
      if (existing) {
        const geom = existing.getGeometry();
        if (geom instanceof Point) {
          geom.setCoordinates(fromLonLat(unit._state.location));
        }
      } else {
        source.addFeature(createUnitFeatureAt(unit._state.location, unit));
      }
    }

    // Remove units that are no longer visible at this timestamp.
    source.getFeatures().forEach((feature) => {
      const id = feature.getId();
      if (typeof id === "string" && !seen.has(id)) {
        source.removeFeature(feature);
      }
    });
  }, [unitLayer, geo.everyVisibleUnit]);

  // Initial Draw & Add to Map
  useEffect(() => {
    if (!olMap) return;
    olMap.addLayer(unitLayer);
    olMap.addLayer(labelLayer);
    
    return () => {
      olMap.removeLayer(unitLayer);
      olMap.removeLayer(labelLayer);
    };
  }, [olMap, unitLayer, labelLayer]);

  // Re-draw when units change
  useEffect(() => {
    drawUnits();
  }, [drawUnits]);

  return { unitLayer, labelLayer, drawUnits };
}

// --- HOOK 2: Drag & Drop on Map ---

export function useMapDrop(
  olMap: OLMap | null,
  unitLayer: VectorLayer<any>
) {
  const {
    geo,
    store: { groupUpdate },
    helpers: { getUnitById },
  } = useActiveScenario();
  
  const mStore = useMapSettingsStore();
  const { selectedUnitIds } = useSelectedItems();
  
  const [isDragging, setIsDragging] = useState(false);
  const [dropPosition, setDropPosition] = useState<Position>([0, 0]);

  const formattedPosition = useMemo(() =>
    isDragging
      ? getCoordinateFormatFunction(mStore.coordinateFormat)(dropPosition)
      : "",
  [isDragging, dropPosition, mStore.coordinateFormat]);

  useEffect(() => {
    if (!olMap) return;
    
    const element = olMap.getTargetElement();
    if (!element) return;
    
    const cleanup = dropTargetForElements({
      element: element,
      canDrop: ({ source }) =>
        isUnitDragItem(source.data) || isScenarioFeatureDragItem(source.data),
      getData: ({ input }) => {
        return { position: toLonLat(olMap.getEventCoordinate(input as MouseEvent)) };
      },
      onDragEnter: () => setIsDragging(true),
      onDragLeave: () => setIsDragging(false),
      onDrag: ({ self }) => {
        setDropPosition(self.data.position as Coordinate);
      },
      onDrop: ({ source, self }) => {
        const dragData = source.data;
        setIsDragging(false);

        const pos = self.data.position as Coordinate;
        
        if (isUnitDragItem(dragData)) {
          groupUpdate(() => {
            // Logic xử lý drop unit
            // Note: selectedUnitIds.value in Vue -> selectedUnitIds Set/Array in React
            const selUnits = new Set([...selectedUnitIds, dragData.unit.id]);
            
            for (const unitId of selUnits) {
              const unitSource = unitLayer.getSource();
              const existingUnitFeature = unitSource?.getFeatureById(unitId);

              geo.addUnitPosition(unitId, pos);

              if (existingUnitFeature) {
                existingUnitFeature.setGeometry(new Point(fromLonLat(pos)));
              } else {
                const unit = getUnitById(unitId);
                if (unit) unitSource?.addFeature(createUnitFeatureAt(pos, unit));
              }
            }
          });
        } else if (isScenarioFeatureDragItem(dragData)) {
          const geometryCenter = centroid(dragData.feature).geometry.coordinates;
          const diff = [pos[0] - geometryCenter[0], pos[1] - geometryCenter[1]];
          const geometryCopy = klona(dragData.feature.geometry);
          coordEach(geometryCopy, (coord) => {
            coord[0] += diff[0];
            coord[1] += diff[1];
          });

          geo.updateFeature(dragData.feature.id, { geometry: geometryCopy });
        }
      },
    });

    return () => cleanup();
  }, [olMap, unitLayer, geo, groupUpdate, getUnitById, selectedUnitIds]);

  return { isDragging, dropPosition, formattedPosition };
}

// --- HOOK 3: Move Interaction ---

export function useMoveInteraction(
  olMap: OLMap | null,
  unitLayer: VectorLayer<any>,
  enabled: boolean = true
) {
  const {
    geo,
    unitActions: { isUnitLocked },
  } = useActiveScenario();

  const modifyInteraction = useMemo(() => {
    return new Modify({
      hitDetection: unitLayer,
      source: unitLayer.getSource()!,
    });
  }, [unitLayer]);

  // Event Handlers Setup
  useEffect(() => {
    if (!olMap) return;

    const handleModifyStart = (evt: BaseEvent) => {
      const e = evt as ModifyEvent;
      const target = olMap.getTargetElement();
      if (target) target.style.cursor = "grabbing";

      e.features.forEach((f) => {
        const unitId = f.getId() as string;
        if (isUnitLocked(unitId)) {
          f.set("_geometry", f.getGeometry()?.clone(), true);
        }
      });
    };

    const handleModifyEnd = (evt: BaseEvent) => {
      const e = evt as ModifyEvent;
      const target = olMap.getTargetElement();
      if (target) target.style.cursor = "pointer";

      const unitFeature = e.features.pop() as Feature<Point>;
      if (unitFeature) {
        const movedUnitId = unitFeature.getId() as string;
        if (!movedUnitId) return;

        const oldGeometry = unitFeature.get("_geometry");
        if (oldGeometry) {
          unitFeature.setGeometry(oldGeometry);
          unitFeature.set("_geometry", undefined, true);
          return;
        }
        
        const newCoordinate = unitFeature.getGeometry()?.getCoordinates();
        if (newCoordinate) geo.addUnitPosition(movedUnitId, toLonLat(newCoordinate));
      }
    };

    const startKey = modifyInteraction.on("modifystart", handleModifyStart);
    const endKey = modifyInteraction.on("modifyend", handleModifyEnd);

    // Overlay events (cursor)
    const overlaySource = modifyInteraction.getOverlay().getSource();
    const handleAddRemove = (evt: BaseEvent) => {
        const target = olMap.getTargetElement();
        if(target) target.style.cursor = evt.type === "addfeature" ? "pointer" : "";
    };
    const addKey = overlaySource?.on("addfeature", handleAddRemove);
    const removeKey = overlaySource?.on("removefeature", handleAddRemove);

    return () => {
      unByKey(startKey);
      unByKey(endKey);
      if (addKey) unByKey(addKey);
      if (removeKey) unByKey(removeKey);
    };
  }, [modifyInteraction, olMap, geo, isUnitLocked]);

  // Toggle Active
  useEffect(() => {
    modifyInteraction.setActive(enabled);
  }, [modifyInteraction, enabled]);

  // Add/Remove from Map
  useEffect(() => {
    if (!olMap) return;
    olMap.addInteraction(modifyInteraction);
    return () => {
      olMap.removeInteraction(modifyInteraction);
    };
  }, [olMap, modifyInteraction]);

  return { moveInteraction: modifyInteraction };
}

// --- HOOK 4: Unit Select Interaction ---

export function useUnitSelectInteraction(
  layers: VectorLayer<any>[],
  olMap: OLMap | null,
  options: {
    enable?: boolean;
    enableBoxSelect?: boolean;
  } = {}
) {
  const { enable = true, enableBoxSelect = true } = options;
  const mapSettings = useMapSettingsStore();
  const symbolSettings = useSymbolSettingsStore();
  
  // Context refs
  const { selectedUnitIds, clear: clearSelectedItems, addSelectedUnitId: addSelectedId, deleteSelectedUnitId: deleteSelectedId } = useSelectedItems(); // Assuming methods exist
  const scenario = useActiveScenario();
  const { geo, unitActions, helpers } = scenario;
  
  const isInternalRef = useRef(false);
  const selectedUnitIdsRef = useRef(selectedUnitIds);
  useEffect(() => { selectedUnitIdsRef.current = selectedUnitIds; }, [selectedUnitIds]);

  // 1. Create Interactions (Memoized)
  const { unitSelectInteraction, boxSelectInteraction } = useMemo(() => {
    // Style Function (defined inline to capture closure or ref if needed)
    const selectedUnitStyleFunction = (feature: FeatureLike, resolution: number) => {
      const unitId = feature.getId() as string;
      const unit = helpers.getUnitById(unitId);
      if (!unit) return;

      const { limitVisibility, minZoom = 0, maxZoom = 24 } = unit.style ?? {};
      if (limitVisibility && (resolution > zoomResolutions[minZoom] || resolution < zoomResolutions[maxZoom])) {
        return;
      }
      
      let unitStyle = selectedUnitStyleCache.get(unit._ikey ?? unitId);
      if (!unitStyle) {
        const symbolOptions = unitActions.getCombinedSymbolOptions(unit);
        const { style } = createUnitStyle(
          unit,
          {
            ...symbolOptions,
            infoOutlineColor: "yellow",
            infoOutlineWidth: 8,
            outlineColor: "yellow",
            outlineWidth: 21,
          },
          scenario,
          mapSettings,
          symbolSettings,
          "yellow",
        )!;
        unitStyle = style;
        selectedUnitStyleCache.set(unit._ikey ?? unitId, unitStyle);
      }

      if (!mapSettings.mapUnitLabelBelow) return unitStyle;

      const labelData = labelStyleCache.get(unitId) ?? createUnitLabelData(unit, unitStyle, {
        wrapLabels: mapSettings.mapWrapUnitLabels,
        wrapWidth: mapSettings.mapWrapLabelWidth,
      });

      if (labelData) {
        const textStyle = selectedUnitLabelStyle.getText()!;
        textStyle.setText(labelData.text);
        textStyle.setOffsetY(labelData.yOffset);
        return [unitStyle, selectedUnitLabelStyle];
      }
      return unitStyle;
    };

    const selectInt = new Select({
      layers,
      style: selectedUnitStyleFunction as any, // TS Cast
      condition: clickCondition,
      removeCondition: altKeyOnly,
    });

    const boxInt = new DragBox({ condition: platformModifierKeyOnly });

    return { unitSelectInteraction: selectInt, boxSelectInteraction: boxInt };
  }, [layers, mapSettings, helpers, unitActions, scenario]);

  const selectedUnitFeatures = unitSelectInteraction.getFeatures();

  // 2. Event Handlers
  useEffect(() => {
    if (!olMap) return;

    // Unit Select Handler
    const handleSelect = (event: SelectEvent) => {
      isInternalRef.current = true;
      const currentSelected = selectedUnitIdsRef.current;
      
      if (currentSelected.size && !event.mapBrowserEvent.originalEvent.shiftKey) {
        clearSelectedItems();
      }
      if (selectedUnitFeatures.getLength() === 0 && !event.mapBrowserEvent.originalEvent.shiftKey) {
        clearSelectedItems();
        return;
      }

      event.selected.forEach((f) => addSelectedId(f.getId() as string));
      event.deselected.forEach((f) => deleteSelectedId(f.getId() as string));
    };

    // Box Select Handler
    const handleBoxEnd = () => {
      const extent = boxSelectInteraction.getGeometry().getExtent();
      const boxFeatures = layers
        .map((layer) =>
          layer.getSource()?.getFeaturesInExtent(extent)
            .filter((feature: Feature) => feature.getGeometry()!.intersectsExtent(extent))
        )
        .flat();

      const rotation = olMap.getView().getRotation();
      const oblique = rotation % (Math.PI / 2) !== 0;

      if (oblique) {
        const anchor = [0, 0];
        const geometry = boxSelectInteraction.getGeometry().clone();
        geometry.rotate(-rotation, anchor);
        const extent = geometry.getExtent();
        
        boxFeatures.forEach(function (feature) {
          const geometry = feature.getGeometry()?.clone();
          geometry?.rotate(-rotation, anchor);
          if (geometry?.intersectsExtent(extent)) {
            addSelectedId(feature.getId() as string);
          }
        });
      } else {
        boxFeatures.forEach((f) => addSelectedId(f.getId() as string));
      }
    };

    const handleBoxStart = () => {
      clearSelectedItems();
    };

    // Attach Listeners
    const selectKey = unitSelectInteraction.on("select", handleSelect);
    const boxEndKey = boxSelectInteraction.on("boxend", handleBoxEnd);
    const boxStartKey = boxSelectInteraction.on("boxstart", handleBoxStart);

    return () => {
      unitSelectInteraction.un("select", selectKey.listener);
      boxSelectInteraction.un("boxend", boxEndKey.listener);
      boxSelectInteraction.un("boxstart", boxStartKey.listener);
    };
  }, [unitSelectInteraction, boxSelectInteraction, olMap, layers, addSelectedId, deleteSelectedId, clearSelectedItems]);

  // 3. Sync Logic: Store -> Layer (Redraw selection visual)
  const redrawSelectedLayer = useCallback((ids: Set<string> | string[]) => {
    if (!isInternalRef.current) {
      selectedUnitFeatures.clear();
      ids.forEach((fid) => {
        // Find feature in any provided layer
        for (const layer of layers) {
          const feature = layer.getSource()?.getFeatureById(fid);
          if (feature) {
            selectedUnitFeatures.push(feature);
            break;
          }
        }
      });
    }
    isInternalRef.current = false;
  }, [layers, selectedUnitFeatures]);

  // Watch selectedIds changes
  useEffect(() => {
    redrawSelectedLayer(selectedUnitIds);
  }, [selectedUnitIds, redrawSelectedLayer]);

  // Watch Visible Units change (geo updates)
  useEffect(() => {
    isInternalRef.current = false;
    redrawSelectedLayer(selectedUnitIds);
  }, [geo.everyVisibleUnit, selectedUnitIds, redrawSelectedLayer]);

  // 4. Toggle Active & Add to Map
  useEffect(() => {
    unitSelectInteraction.setActive(enable);
    if (!enable) selectedUnitFeatures.clear();
  }, [enable, unitSelectInteraction, selectedUnitFeatures]);

  useEffect(() => {
    boxSelectInteraction.setActive(enableBoxSelect);
    if(enableBoxSelect) selectedUnitFeatures.clear(); // Clear on toggle? logic maintained from original
  }, [enableBoxSelect, boxSelectInteraction, selectedUnitFeatures]);

  useEffect(() => {
    if(!olMap) return;
    olMap.addInteraction(unitSelectInteraction);
    olMap.addInteraction(boxSelectInteraction);
    return () => {
      olMap.removeInteraction(unitSelectInteraction);
      olMap.removeInteraction(boxSelectInteraction);
    };
  }, [olMap, unitSelectInteraction, boxSelectInteraction]);

  return { 
    unitSelectInteraction, 
    boxSelectInteraction, 
    redraw: () => redrawSelectedLayer(selectedUnitIds) 
  };
}