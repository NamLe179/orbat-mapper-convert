"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  X as CloseIcon,
  MousePointer2 as SelectIcon,
  Move as MoveIcon,
  Magnet as SnapIcon,
  MapPin as PointIcon,
  Edit as EditIcon,
  Trash2 as DeleteIcon,
  Circle as CircleIcon,
  Activity as LineStringIcon, // Hoặc dùng icon Polyline tùy chọn
  Pentagon as PolygonIcon,
  History as HistoryIcon, // IconClockEdit
} from "lucide-react";
import Feature from "ol/Feature";

// Project Imports
import FloatingPanel from "@/components/FloatingPanel";
import MainToolbarButton from "@/components/MainToolbarButton";
import { useMainToolbarStore } from "@/stores/mainToolbarStore";
import { useMapSelectStore } from "@/stores/mapSelectStore";
import { useSelectedItems } from "@/stores/selectedStore";
import {
  useActiveMap,
  useActiveScenario,
  useActiveLayer,
  useActiveFeatureSelectInteraction,
} from "@/components/injects";
import { nanoid } from "@/utils";
import { useFeatureLayerUtils } from "@/modules/scenarioeditor/featureLayerUtils";
import { useEditingInteraction } from "@/hooks/geoEditing";
import { convertOlFeatureToScenarioFeature } from "@/modules/scenarioeditor/scenarioFeatureLayers";
import { type AnyVectorLayer } from "@/geo/types";

export default function MapEditorDrawToolbar() {
  // --- Contexts ---
  const map = useActiveMap();
  const { store: scenarioStore, geo } = useActiveScenario();
  const { activeLayerId } = useActiveLayer();
  const featureSelectInteraction = useActiveFeatureSelectInteraction();

  // --- Stores ---
  const toolbarStore = useMainToolbarStore();
  const selectStore = useMapSelectStore();
  const { selectedFeatureIds, setActiveFeatureId } = useSelectedItems();

  // --- Local State (Replacements for useToggle) ---
  const [snap, setSnap] = useState(true);
  const [translate, setTranslate] = useState(false);
  const [modifyHistory, setModifyHistory] = useState(false);
  
  // Helpers to toggle
  const toggleSnap = () => setSnap((prev) => !prev);
  const toggleTranslate = () => setTranslate((prev) => !prev);
  const toggleModifyHistory = () => setModifyHistory((prev) => !prev);

  // --- Layer Logic ---
  // useFeatureLayerUtils giả định đã convert thành hook nhận map instance
  const { getOlLayerById } = useFeatureLayerUtils(map!);

  // Computed Layer (thay thế watch activeLayerIdRef)
  const layer = useMemo(() => {
    if (!map) return null;
    if (activeLayerId) {
      return getOlLayerById(activeLayerId);
    } else if (geo.layers.length > 0) {
      // Lưu ý: geo.layers trong React có thể là state, cần access đúng cách
      return getOlLayerById(geo.layers[0].id);
    }
    return null;
  }, [map, activeLayerId, geo.layers, getOlLayerById]);

  // --- Helper Functions ---

  const updateFeatureGeometryFromOlFeature = useCallback((
    olFeature: Feature,
    updateState = false
  ) => {
    const t = convertOlFeatureToScenarioFeature(olFeature);
    const id = olFeature.getId();
    if (!id) return;
    
    // geo.getFeatureById giả định trả về object { feature, layer }
    const res = geo.getFeatureById(id as string);
    if (!res) return;
    const { feature } = res;
    
    if (!feature) return;

    const dataUpdate = {
      meta: { ...feature.meta, ...t.meta },
      properties: { ...feature.properties, ...t.properties },
      geometry: t.geometry,
    };

    if (updateState) {
      geo.addFeatureStateGeometry(id as string, t.geometry);
    } else {
      geo.updateFeature(id as string, dataUpdate, { noEmit: true });
    }
  }, [geo]);

  const addOlFeature = useCallback((olFeature: Feature, olLayer: AnyVectorLayer) => {
    if (!olFeature.getId()) olFeature.setId(nanoid());

    const scenarioFeature = convertOlFeatureToScenarioFeature(olFeature);
    // getLayerById trả về NScenarioLayer
    const scenarioLayer = geo.getLayerById(olLayer.get("id"));
    if (!scenarioLayer) return scenarioFeature;

    const lastFeatureId = scenarioLayer.features[scenarioLayer.features.length - 1];
    const { feature: lastFeatureInLayer } = geo.getFeatureById(lastFeatureId) || {};

    const _zIndex = Math.max(
      scenarioLayer.features.length,
      (lastFeatureInLayer?.meta._zIndex || 0) + 1
    );

    scenarioFeature.meta.name = `${scenarioFeature.meta.type} ${_zIndex + 1}`;
    scenarioFeature.meta._zIndex = _zIndex;
    scenarioFeature.style = toolbarStore.currentDrawStyle ?? {};

    olFeature.set("_zIndex", _zIndex);
    geo.addFeature(scenarioFeature, scenarioLayer.id);
    
    return scenarioFeature;
  }, [geo, toolbarStore.currentDrawStyle]);

  // --- Interaction Hook ---
  
  // Hook useEditingInteraction cần được convert sao cho nhận tham số reactive
  const {
    startDrawing,
    currentDrawType,
    startModify,
    isModifying,
    cancel,
    isDrawing,
  } = useEditingInteraction(map, layer, {
    addMultiple: toolbarStore.addMultiple,
    select: featureSelectInteraction ?? undefined,
    addHandler: (olFeature, olLayer) => {
      const newFeature = addOlFeature(olFeature, olLayer);
      setActiveFeatureId(newFeature.id);
    },
    modifyHandler: (olFeatures) => {
      olFeatures.forEach((f) =>
        updateFeatureGeometryFromOlFeature(f, modifyHistory)
      );
    },
    snap,
    translate,
  });

  // --- Effects (Watchers) ---

  // Watch isDrawing
  useEffect(() => {
    if (isDrawing) {
      setTranslate(false);
      selectStore.setUnitSelectEnabled(false);
      selectStore.setFeatureSelectEnabled(false);
    } else {
      selectStore.setUnitSelectEnabled(true);
      selectStore.setFeatureSelectEnabled(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDrawing]);

  // Watch isModifying
  useEffect(() => {
    if (isModifying) {
      setTranslate(false);
    }
  }, [isModifying]);

  // Watch translate
  useEffect(() => {
    if (translate) {
      cancel();
    }
  }, [translate, cancel]); // Lưu ý: cancel cần được wrap useCallback trong hook gốc

  // Key Stroke (Escape)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        cancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cancel]);

  // --- Action Handlers ---

  const onFeatureDelete = () => {
    scenarioStore.groupUpdate(
      () => {
        // selectedFeatureIds is a Set
        Array.from(selectedFeatureIds).forEach((featureId) =>
          geo.deleteFeature(featureId)
        );
      },
      { label: "batchLayer", value: "dummy" }
    );
  };

  return (
    <FloatingPanel className="pointer-events-auto flex items-center space-x-0 rounded-md p-1">
      <p className="text-muted-foreground hidden px-2 text-sm font-medium sm:block">
        Draw
      </p>
      <div className="border-border mr-2 h-5 border-l" />
      
      <MainToolbarButton 
        title="Select" 
        active={!currentDrawType} 
        onClick={() => cancel()}
      >
        <SelectIcon className="size-5" />
      </MainToolbarButton>

      <MainToolbarButton
        title="Point"
        onClick={() => startDrawing("Point")}
        active={currentDrawType === "Point"}
      >
        <PointIcon className="size-5" />
      </MainToolbarButton>

      <MainToolbarButton
        title="Line"
        onClick={() => startDrawing("LineString")}
        active={currentDrawType === "LineString"}
      >
        <LineStringIcon className="size-5" />
      </MainToolbarButton>

      <MainToolbarButton
        title="Polygon"
        onClick={() => startDrawing("Polygon")}
        active={currentDrawType === "Polygon"}
      >
        <PolygonIcon className="size-5" />
      </MainToolbarButton>

      <MainToolbarButton
        title="Circle"
        onClick={() => startDrawing("Circle")}
        active={currentDrawType === "Circle"}
      >
        <CircleIcon className="size-5" />
      </MainToolbarButton>

      <div className="mx-2 h-5 border-l border-gray-300" />

      <div className="flex items-center">
        <MainToolbarButton 
          title="Snap to grid" 
          onClick={toggleSnap} 
          active={snap}
        >
          <SnapIcon className="size-5" />
        </MainToolbarButton>

        <MainToolbarButton 
          title="Edit" 
          onClick={() => startModify()} 
          active={isModifying}
        >
          <EditIcon className="size-5" />
        </MainToolbarButton>

        <MainToolbarButton
          title="Modify feature history"
          onClick={toggleModifyHistory}
          active={modifyHistory}
        >
          <HistoryIcon className="size-5" />
        </MainToolbarButton>

        <MainToolbarButton 
          title="Translate" 
          onClick={toggleTranslate} 
          active={translate}
        >
          <MoveIcon className="size-5" />
        </MainToolbarButton>

        <MainToolbarButton
          title="Delete"
          disabled={selectedFeatureIds.size === 0}
          onClick={onFeatureDelete}
        >
          <DeleteIcon className="size-5" />
        </MainToolbarButton>
      </div>

      <MainToolbarButton 
        title="Toggle toolbar" 
        onClick={() => toolbarStore.clearToolbar()}
      >
        <CloseIcon className="size-5" />
      </MainToolbarButton>
    </FloatingPanel>
  );
}