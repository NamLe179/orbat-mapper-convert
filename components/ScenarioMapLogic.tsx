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
    olMap.addLayer(dayNightLayer);
    olMap.addLayer(rangeLayer);
    olMap.addLayer(unitLayerGroup); // Sẽ add historyLayer sau thông qua hook useUnitHistory
    
    // Track layers for cleanup
    layersRef.current.push(dayNightLayer, rangeLayer, unitLayerGroup);

    // 5. Initialize Managers
    const { initializeFromStore: loadMapLayers } = useScenarioMapLayers(olMap);
    const { initializeFeatureLayersFromStore } = useScenarioFeatureLayers(olMap);
    
    // 6. History & Interactions
    const { 
        historyLayer, drawHistory, historyModify, waypointSelect, ctrlClickInteraction 
    } = useUnitHistory(olMap, {
        showHistory: unitSettingsStore.showHistory,
        editHistory: unitSettingsStore.editHistory,
        showWaypointTimestamps: unitSettingsStore.showWaypointTimestamps,
    });
    olMap.addLayer(historyLayer);
    layersRef.current.push(historyLayer);

    // 7. Hover Logic
    // Lưu ý: useMapHover thường attach event listener, cần đảm bảo nó có cơ chế cleanup
    useMapHover(olMap, { enable: hoverEnabled });

    // 8. Select Interactions
    const {
      unitSelectInteraction,
      boxSelectInteraction,
      redraw: redrawSelectedUnits,
    } = useUnitSelectInteraction([unitLayer], olMap, {
      enable: unitSelectEnabled,
    });

    const { selectInteraction: featureSelectInteraction } = useScenarioFeatureSelect(olMap, {
      enable: featureSelectEnabled,
    });

    // Add interactions (Order matters!)
    olMap.addInteraction(unitSelectInteraction);
    olMap.addInteraction(boxSelectInteraction);
    olMap.addInteraction(waypointSelect);
    olMap.addInteraction(historyModify);
    olMap.addInteraction(ctrlClickInteraction);
    
    // 9. Move Interaction
    const { moveInteraction: moveUnitInteraction } = useMoveInteraction(
      olMap,
      unitLayer,
      unitSettingsStore.moveUnitEnabled,
    );
    olMap.addInteraction(moveUnitInteraction);

    // Logic toggle move interaction khi visibility thay đổi
    const toggleMoveUnitInteraction = (event: ObjectEvent) => {
        const isUnitLayerVisible = !(event as any).oldValue; // Type casting as needed
        moveUnitInteraction.setActive(isUnitLayerVisible && unitSettingsStore.moveUnitEnabled);
    };
    unitLayerGroup.on("change:visible", toggleMoveUnitInteraction);

    // 10. Initial Draws & Loads
    drawRangeRings();
    drawUnits();
    drawHistory();
    loadMapLayers();
    initializeFeatureLayersFromStore();

    // 11. Fit View
    const extent = unitLayer.getSource()?.getExtent();
    if (extent && !unitLayer.getSource()?.isEmpty()) {
      olMap.getView().fit(extent, { padding: [100, 100, 150, 100], maxZoom: 16 });
    }

    // 12. Emit Ready
    if (featureSelectInteraction) {
      onMapReady?.({ 
        olMap, 
        featureSelectInteraction, 
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
    // Hàm redraw tổng hợp
    const redrawUnits = () => {
        drawUnits();
        // Cần truy cập lại các hàm draw/redraw từ scope initialization
        // Cách tốt nhất là move các hàm draw ra ngoài hoặc dùng ref để lưu,
        // hoặc gọi lại hook nếu hook đó stateless.
        // Giả định drawHistory và drawRangeRings có thể import/gọi lại được.
        // Ở đây tôi gọi lại từ kết quả hook ở trên:
        const { drawHistory } = useUnitHistory(olMap, { /* params */ }); 
        const { redraw: redrawSelected } = useUnitSelectInteraction([unitLayer], olMap, { /* params */ });
        const { drawRangeRings } = useRangeRingsLayer(olMap);

        drawHistory();
        redrawSelected();
        drawRangeRings();
    };

    redrawUnits();
  }, [geo.everyVisibleUnit]); // Deep dependency check phụ thuộc vào implementation của Context

  // Watch: Settings Change -> Clear Cache & Redraw
  useEffect(() => {
    clearUnitStyleCache();
    drawUnits();
  }, [settingsStore, symbolSettings, mapSettingsStore]);

  // Watch: Time / Filter -> Reload Features
  useEffect(() => {
    const doNotFilterLayers = uiStore.layersPanelActive;
    const { initializeFeatureLayersFromStore } = useScenarioFeatureLayers(olMap);

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
  }, [store.state.currentTime, uiStore.layersPanelActive, store.state.featureStateCounter]);

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