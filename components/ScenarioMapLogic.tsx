"use client";

import React, { useEffect, useRef } from "react";
import Map from "ol/Map";
import { Layer } from "ol/layer";
import LayerGroup from "ol/layer/Group";
import Select from "ol/interaction/Select";
import BaseLayer from "ol/layer/Base";
import { ObjectEvent } from "ol/Object";

// Giả định các imports store và utils đã convert
import { useActiveScenario } from "@/components/injects";
import { useUiStore } from "@/stores/uiStore";
import {
  useGeoStore,
  useMeasurementsStore,
  useUnitSettingsStore,
} from "@/stores/geoStore";
import { useSettingsStore, useSymbolSettingsStore } from "@/stores/settingsStore";
import { useMapSelectStore } from "@/stores/mapSelectStore";
import { useMapSettingsStore } from "@/stores/mapSettingsStore";
import { useSelectedItems } from "@/stores/selectedStore";

// Giả định các hooks/helpers đã convert
import {
  calculateZoomToResolution,
  useMapDrop,
  useMoveInteraction,
  useUnitLayer,
  useUnitSelectInteraction,
} from "@/hooks/geoUnitLayers";
import { useScenarioMapLayers } from "@/modules/scenarioeditor/scenarioMapLayers";
import { useScenarioFeatureSelect } from "@/modules/scenarioeditor/featureLayerUtils";
import { useMapHover } from "@/hooks/geoHover";
import { saveMapAsPng } from "@/hooks/openlayersHelpers";
import { useShowLocationControl } from "@/hooks/geoShowLocation";
import { useShowScaleLine } from "@/hooks/geoScaleLine";
import { clearUnitStyleCache } from "@/geo/unitStyles";
import { useRangeRingsLayer } from "@/hooks/geoRangeRings";
import { useUnitHistory } from "@/hooks/geoUnitHistory";
import { useDayNightLayer } from "@/hooks/geoDayNight";
import { useScenarioEvents } from "@/modules/scenarioeditor/scenarioEvents";
import { useSearchActions } from "@/hooks/searchActions";
import { useScenarioFeatureLayers } from "@/modules/scenarioeditor/scenarioFeatureLayers";

interface ScenarioMapLogicProps {
  olMap: Map;
  onMapReady?: (data: {
    olMap: Map;
    featureSelectInteraction: Select;
    unitSelectInteraction: Select;
  }) => void;
}

export default function ScenarioMapLogic({ olMap, onMapReady }: ScenarioMapLogicProps) {
  // --- Context & Stores ---
  const { geo, store } = useActiveScenario();
  const uiStore = useUiStore();
  const unitSettingsStore = useUnitSettingsStore();
  const mapSettingsStore = useMapSettingsStore();
  const geoStore = useGeoStore();
  const settingsStore = useSettingsStore();
  const symbolSettings = useSymbolSettingsStore();
  const { measurementUnit } = useMeasurementsStore();
  const { 
    unitSelectEnabled, 
    featureSelectEnabled, 
    hoverEnabled 
  } = useMapSelectStore();
  const { selectedFeatureIds } = useSelectedItems();
  const { onScenarioAction } = useSearchActions(); // Giả định hook này đăng ký action global

  // --- Refs ---
  // Dùng ref để giữ reference cho các layer/interaction nhằm cleanup khi unmount
  const layersRef = useRef<BaseLayer[]>([]);
  
  // --- hooks Setup ---
  // Lưu ý: Trong React, các hook này nên chạy ở top level. 
  // Nếu chúng trả về object tĩnh (không state), code sẽ hoạt động tốt.
  // Nếu chúng dùng state nội bộ, chúng sẽ trigger re-render component này (điều này ok).

  const { unitLayer, drawUnits, labelLayer } = useUnitLayer(olMap);
  const { isDragging, formattedPosition } = useMapDrop(olMap, unitLayer);
  const { rangeLayer, drawRangeRings } = useRangeRingsLayer(olMap);
  const dayNightLayer = useDayNightLayer();

  // Map layers and feature layers hooks
  const { initializeFromStore: loadMapLayers } = useScenarioMapLayers(olMap);
  const { initializeFeatureLayersFromStore } = useScenarioFeatureLayers(olMap);
  
  // History & Interactions
  const { 
    historyLayer, drawHistory, historyModify, waypointSelect, ctrlClickInteraction 
  } = useUnitHistory(olMap, {
    showHistory: unitSettingsStore.showHistory,
    editHistory: unitSettingsStore.editHistory,
    showWaypointTimestamps: unitSettingsStore.showWaypointTimestamps,
  });

  // Hover, select, and other interactions
  const { redraw: redrawSelectedUnits, unitSelectInteraction, boxSelectInteraction } = useUnitSelectInteraction([unitLayer], olMap, {
    enable: unitSelectEnabled,
  });
  
  const { selectInteraction: featureSelectInteractionHook } = useScenarioFeatureSelect(olMap, {
    enable: featureSelectEnabled,
  });

  const { moveInteraction: moveUnitInteraction } = useMoveInteraction(
    olMap,
    unitLayer,
    unitSettingsStore.moveUnitEnabled,
  );

  useMapHover(olMap, { enable: hoverEnabled });

  // --- Main Initialization Effect ---
  useEffect(() => {
    if (!olMap) return;

    // 1. Setup global store ref
    geoStore.olMap = olMap;

    // 2. Zoom Calc
    calculateZoomToResolution(olMap.getView());

    // 3. Layer Groups
    const unitLayerGroup = new LayerGroup({
      layers: [labelLayer, unitLayer],
    });
    unitLayerGroup.set("title", "Units");

    // 4. Add Layers
    // Check if layers already exist to prevent duplicates (React Strict Mode issue)
    const existingLayers = olMap.getLayers().getArray();
    if (!existingLayers.includes(dayNightLayer)) {
      olMap.addLayer(dayNightLayer);
    }
    if (!existingLayers.includes(rangeLayer)) {
      olMap.addLayer(rangeLayer);
    }
    if (!existingLayers.includes(unitLayerGroup)) {
      olMap.addLayer(unitLayerGroup); // Sẽ add historyLayer sau thông qua hook useUnitHistory
    }
    
    // Track layers for cleanup
    layersRef.current.push(dayNightLayer, rangeLayer, unitLayerGroup);

    // 5. Add history layer
    if (!existingLayers.includes(historyLayer)) {
      olMap.addLayer(historyLayer);
    }
    layersRef.current.push(historyLayer);

    // 6. Initialize Managers (call the initialize functions from hooks)
    loadMapLayers();
    initializeFeatureLayersFromStore();

    // 7. Add interactions (Order matters!)
    olMap.addInteraction(unitSelectInteraction);
    olMap.addInteraction(boxSelectInteraction);
    olMap.addInteraction(waypointSelect);
    olMap.addInteraction(historyModify);
    olMap.addInteraction(ctrlClickInteraction);
    olMap.addInteraction(moveUnitInteraction);

    // Logic toggle move interaction khi visibility thay đổi
    const toggleMoveUnitInteraction = (event: ObjectEvent) => {
        const isUnitLayerVisible = !(event as any).oldValue; // Type casting as needed
        moveUnitInteraction.setActive(isUnitLayerVisible && unitSettingsStore.moveUnitEnabled);
    };
    unitLayerGroup.on("change:visible", toggleMoveUnitInteraction);

    // 8. Initial Draws
    drawRangeRings();
    drawUnits();
    drawHistory();

    // 9. Fit View
    const extent = unitLayer.getSource()?.getExtent();
    if (extent && !unitLayer.getSource()?.isEmpty()) {
      olMap.getView().fit(extent, { padding: [100, 100, 150, 100], maxZoom: 16 });
    }

    // 10. Emit Ready
    if (featureSelectInteractionHook) {
      onMapReady?.({ 
        olMap, 
        featureSelectInteraction: featureSelectInteractionHook, 
        unitSelectInteraction 
      });
    }

    // --- Cleanup Function ---
    return () => {
      geoStore.olMap = null;
      clearUnitStyleCache();
      
      // Remove Layers
      layersRef.current.forEach(layer => olMap.removeLayer(layer));
      
      // Remove Interactions
      olMap.removeInteraction(unitSelectInteraction);
      olMap.removeInteraction(boxSelectInteraction);
      olMap.removeInteraction(waypointSelect);
      olMap.removeInteraction(historyModify);
      olMap.removeInteraction(ctrlClickInteraction);
      olMap.removeInteraction(moveUnitInteraction);
      
      // Unbind events if needed
      unitLayerGroup.un("change:visible", toggleMoveUnitInteraction);
    };
  }, [olMap]); // Chỉ chạy 1 lần khi olMap thay đổi (thường là mount)


  // --- Reactive Effects (Thay thế cho Watchers) ---

  // Watch: Show Location Control
  useShowLocationControl(olMap, {
    coordinateFormat: mapSettingsStore.coordinateFormat,
    enable: mapSettingsStore.showLocation,
  });

  // Watch: Show Scale Line
  useShowScaleLine(olMap, {
    enabled: mapSettingsStore.showScaleLine,
    measurementUnits: measurementUnit,
  });

  // Watch: Redraw Units (geo.everyVisibleUnit)
  useEffect(() => {
    // Use the functions already returned from hooks at top level
    drawUnits();
    drawHistory();
    redrawSelectedUnits();
    drawRangeRings();
  }, [geo.everyVisibleUnit, drawUnits, drawHistory, redrawSelectedUnits, drawRangeRings]);

  // Watch: Settings Change -> Clear Cache & Redraw
  useEffect(() => {
    clearUnitStyleCache();
    drawUnits();
  }, [settingsStore, symbolSettings, mapSettingsStore]);

  // Watch: Time / Filter -> Reload Features
  useEffect(() => {
    const doNotFilterLayers = uiStore.layersPanelActive;

    initializeFeatureLayersFromStore({
      doClearCache: false,
      filterVisible: !doNotFilterLayers,
    });

    // Trigger redraw of selected features
    if (selectedFeatureIds.size > 0) {
      // Logic force update set để trigger reactivity nếu cần
      const ids = Array.from(selectedFeatureIds);
      selectedFeatureIds.clear();
      ids.forEach(id => selectedFeatureIds.add(id));
    }
  }, [store.state.currentTime, uiStore.layersPanelActive, store.state.featureStateCounter, initializeFeatureLayersFromStore, selectedFeatureIds]);

  // Handle Export Action
  useEffect(() => {
    // onScenarioAction trả về hàm cleanup (unsubscribe)
    const cleanup = onScenarioAction(async (e) => {
      if (e.action === "exportToImage") {
        await saveMapAsPng(olMap);
      }
    });
    return cleanup;
  }, [olMap, onScenarioAction]);

  // --- Render (Overlay) ---
  if (!isDragging) return null;

  return (
    <div className="pointer-events-none absolute inset-0 border-4 border-dashed border-blue-700 z-[1000]">
      <p className="text-foreground bg-background absolute bottom-1 left-2 rounded px-1 text-base tracking-tighter tabular-nums shadow-md">
        {formattedPosition}
      </p>
    </div>
  );
}