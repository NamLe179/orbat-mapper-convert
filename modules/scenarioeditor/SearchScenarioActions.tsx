"use client";

import { useEffect, useCallback } from "react";
import { useUiStore } from "@/stores/uiStore";
import { useSelectedItems } from "@/stores/selectedStore";
import { usePlaybackStore } from "@/stores/playbackStore";
import { 
  useActiveMap, 
  useActiveScenarioOptional, 
  useActiveLayerOptional, 
  useSearchActions 
} from "@/components/injects";
import { useToeActions, useUnitActions } from "@/hooks/scenarioActions"; // Giả định đã convert sang hooks
import { useFeatureLayerUtils } from "@/modules/scenarioeditor/featureLayerUtils";
import { addMapLayer } from "@/modules/scenarioeditor/scenarioMapLayers";
import { fixExtent } from "@/utils/geoConvert";
import { TAB_EVENTS, TAB_LAYERS, TAB_ORBAT, UnitActions } from "@/types/constants";

// OpenLayers Imports
import { getTransform } from "ol/proj";
import { applyTransform } from "ol/extent";
import { fromExtent as polygonFromExtent } from "ol/geom/Polygon";
import OlPoint from "ol/geom/Point";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import OlFeature from "ol/Feature";
import { Circle as CircleStyle, Stroke, Style } from "ol/style";

// Giả định Event Bus cho Image Layer
import { imageLayerAction } from "@/components/eventKeys";
// Helper để emit custom event nếu chưa có library global event bus
const emitImageLayerAction = (detail: any) => {
  window.dispatchEvent(new CustomEvent(imageLayerAction as string, { detail }));
};

export default function SearchScenarioActions() {
  // --- Stores & Contexts ---
  const activeMap = useActiveMap();
  const scenarioContext = useActiveScenarioOptional();
  const activeLayerContext = useActiveLayerOptional();
  const ui = useUiStore();
  const playback = usePlaybackStore();
  
  const {
    selectedUnitIds,
    selectedFeatureIds,
    activeUnitId,
    setActiveUnitId,
    activeScenarioEventId,
    setActiveScenarioEventId,
    activeMapLayerId,
    setActiveMapLayerId,
    setSelectedUnitIds, // Giả định có setter
    clearSelectedUnitIds,
    setSelectedFeatureIds,
    clearSelectedFeatureIds,
  } = useSelectedItems();

  const { onUnitAction } = useUnitActions();
  const toeActions = useToeActions();
  const searchActions = useSearchActions(); // Object chứa các event hook
  
  // Utils
  // Trong React, FeatureLayerUtils có thể là hook hoặc class. 
  // Nếu là hook thì gọi ở đây. Nếu là class/function thì gọi trực tiếp.
  // Giả định là hook hoặc function nhận map instance.
  const layerUtils = useFeatureLayerUtils(activeMap);

  // Extract from contexts (will be undefined if null)
  const store = scenarioContext?.store;
  const scenarioUnitActions = scenarioContext?.unitActions;
  const geo = scenarioContext?.geo;
  const time = scenarioContext?.time;
  const setActiveLayerId = activeLayerContext?.setActiveLayerId;

  // --- Handlers ---

  const handleUnitSelect = useCallback(({ unitId, options }: { unitId: string, options?: { noZoom?: boolean } }) => {
    if (!scenarioUnitActions) return;
    
    const doZoom = !(options?.noZoom === true);
    
    // 1. Update UI & Store
    if (ui.setActiveTabIndex) ui.setActiveTabIndex(TAB_ORBAT);
    setActiveUnitId(unitId);
    
    // Update selection (Zustand Set logic)
    clearSelectedUnitIds();
    // addSelectedUnitId(unitId); // Hoặc:
    // setSelectedUnitIds(new Set([unitId])); 

    // 2. Expand Tree
    const unit = scenarioUnitActions.getUnitById(unitId);
    if (unit) {
      const { parents } = scenarioUnitActions.getUnitHierarchy(unitId);
      parents.forEach((p) => {
        // Lưu ý: Mutating state trực tiếp (p._isOpen = true) chỉ hoạt động nếu store dùng Immer 
        // hoặc object là reactive proxy. Trong React thuần cần dispatch action.
        // Giả định object 'unit' là reference từ store có thể mutate hoặc dùng method riêng.
        if ('_isOpen' in p) (p as any)._isOpen = true; 
      });
      
      // 3. Scroll & Zoom (Next Tick Logic)
      requestAnimationFrame(() => {
        const el = document.getElementById(`ou-${unitId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        if (doZoom) {
          onUnitAction(unit, UnitActions.Zoom);
        }
      });
    }
  }, [ui, setActiveUnitId, clearSelectedUnitIds, scenarioUnitActions, onUnitAction]);

  const handleLayerSelect = useCallback(({ layerId }: { layerId: string }) => {
    if (!activeMap || !setActiveLayerId) return;
    
    if (ui.setActiveTabIndex) ui.setActiveTabIndex(TAB_LAYERS);
    
    requestAnimationFrame(() => {
      const layer = layerUtils.getLayerById(layerId);
      if (layer) {
        if ('_isOpen' in layer) (layer as any)._isOpen = true;
        
        requestAnimationFrame(() => layerUtils.zoomToLayer(layerId));
      }
      setActiveLayerId(layerId);
    });
  }, [activeMap, ui, layerUtils, setActiveLayerId]);

  const handleImageLayerSelect = useCallback(({ layerId }: { layerId: string }) => {
    if (!activeMap) return;
    
    if (ui.setActiveTabIndex) ui.setActiveTabIndex(TAB_LAYERS);
    
    requestAnimationFrame(() => {
      // Emit event bus
      emitImageLayerAction({ action: "zoom", id: layerId });
      setActiveMapLayerId(layerId);
    });
  }, [activeMap, ui, setActiveMapLayerId]);

  const handleScenarioAction = useCallback(({ action }: { action: string }) => {
    if (!activeMap || !geo) return;

    if (
      action === "addTileJSONLayer" ||
      action === "addXYZLayer" ||
      action === "addImageLayer"
    ) {
      const layerType =
        action === "addXYZLayer"
          ? "XYZLayer"
          : action === "addImageLayer"
            ? "ImageLayer"
            : "TileJSONLayer";
      
      if (ui.setActiveTabIndex) ui.setActiveTabIndex(TAB_LAYERS);
      
      const newLayer = addMapLayer(layerType, geo); // geo from useActiveScenario
      
      if (ui.setMapLayersPanelOpen) ui.setMapLayersPanelOpen(true);
      
      requestAnimationFrame(() => {
        setActiveMapLayerId(newLayer.id);
      });

    } else if (action === "addEquipment") {
      toeActions.goToAddEquipment();
    } else if (action === "addPersonnel") {
      toeActions.goToAddPersonnel();
    } else if (action === "startPlayback") {
      playback.togglePlayback(true);
    } else if (action === "stopPlayback") {
      playback.togglePlayback(false);
    } else if (action === "increaseSpeed") {
      playback.increaseSpeed();
    } else if (action === "decreaseSpeed") {
      playback.decreaseSpeed();
    }
  }, [activeMap, ui, geo, setActiveMapLayerId, toeActions, playback]);

  const handleFeatureSelect = useCallback(({ featureId }: { featureId: string }) => {
    if (!geo) return;
    
    if (ui.setActiveTabIndex) ui.setActiveTabIndex(TAB_LAYERS);
    
    const result = geo.getFeatureById(featureId);
    const feature = result?.feature;
    const layer = result?.layer;
    
    requestAnimationFrame(() => {
      if (layer && '_isOpen' in layer) {
        (layer as any)._isOpen = true;
      }
      
      if (feature) {
        clearSelectedUnitIds();
        clearSelectedFeatureIds();
        // addSelectedFeatureId(featureId); // Use store method
        
        requestAnimationFrame(() => layerUtils.zoomToFeature(featureId));
      }
    });
  }, [ui, geo, clearSelectedUnitIds, clearSelectedFeatureIds, layerUtils]);

  const handleEventSelect = useCallback((e: { id: string }) => {
    if (!time) return;
    
    time.goToScenarioEvent(e.id);
    setActiveScenarioEventId(e.id);
    if (ui.setActiveTabIndex) ui.setActiveTabIndex(TAB_EVENTS);
  }, [time, setActiveScenarioEventId, ui]);

  const handlePlaceSelect = useCallback((item: any) => {
    if (!activeMap) return;
    
    const map = activeMap;
    const view = map.getView();
    const projection = view.getProjection();
    const transform = getTransform("EPSG:4326", projection);
    
    const extent = fixExtent(item.properties.extent);
    const polygon = extent && polygonFromExtent(applyTransform(extent, transform));
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = (new OlPoint(item.geometry.coordinates) as any).transform(
      "EPSG:4326",
      projection
    );

    // Create Temporary Layer
    const vectorSource = new VectorSource({
      features: [new OlFeature({ geometry: polygon || p })],
    });

    const layer = new VectorLayer({
      source: vectorSource,
      style: new Style({
        stroke: new Stroke({
          color: "#f00",
          width: 2,
        }),
        image: new CircleStyle({
          radius: 12,
          stroke: new Stroke({
            color: "#f00",
            width: 4,
          }),
        }),
      }),
    });

    layer.setMap(map);
    setTimeout(() => layer.setMap(null), 2000);

    view.fit(polygon || p, { maxZoom: 15, duration: 1000 });
  }, [activeMap]);

  // --- Effect: Subscribing to Events ---
  // Giả định useSearchActions (Context) trả về object chứa các "hooks" (subscribable objects)
  // hoặc chúng ta cần attach listener theo cách mà SearchActionsContextType định nghĩa.
  
  // Note: Nếu SearchActionsContextType trong injects.ts định nghĩa là (data) => void,
  // thì component này thực tế không thể "lắng nghe" nếu context đó không implement pattern Event Emitter.
  // Code dưới đây giả định searchActions.* là các Event Emitter (như VueUse EventHook).
  
  useEffect(() => {
    if (!searchActions) return;

    // Giả định cú pháp subscribe: hook.on(handler) hoặc hook.subscribe(handler)
    // Tôi dùng cú pháp giả định phổ biến, bạn cần điều chỉnh theo implementation thực tế của searchActions
    
    // Helper để bind an toàn
    const bind = (hook: any, handler: any) => {
      // Nếu hook là function (dispatcher), ta không thể subscribe ở đây trừ khi architecture hỗ trợ.
      // Nếu hook là object có .on hoặc .subscribe (Event Emitter)
      if (hook && typeof hook.on === 'function') return hook.on(handler);
      if (hook && typeof hook.subscribe === 'function') return hook.subscribe(handler);
      return { off: () => {} }; // No-op cleanup
    };

    const subs = [
      bind(searchActions.onUnitSelect, handleUnitSelect),
      bind(searchActions.onLayerSelect, handleLayerSelect),
      bind(searchActions.onImageLayerSelect, handleImageLayerSelect),
      bind(searchActions.onScenarioAction, handleScenarioAction),
      bind(searchActions.onFeatureSelect, handleFeatureSelect),
      bind(searchActions.onEventSelect, handleEventSelect),
      bind(searchActions.onPlaceSelect, handlePlaceSelect),
    ];

    return () => {
      subs.forEach(sub => sub && sub.off && sub.off());
    };
  }, [
    searchActions,
    handleUnitSelect,
    handleLayerSelect,
    handleImageLayerSelect,
    handleScenarioAction,
    handleFeatureSelect,
    handleEventSelect,
    handlePlaceSelect
  ]);

  // Headless component
  return null;
}