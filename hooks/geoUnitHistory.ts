/**
 * Chức năng: Hiển thị và chỉnh sửa lịch sử di chuyển của units
 * - Hỗ trợ chỉnh sửa các waypoints trên timeline 
 */

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import OLMap from "ol/Map";
import { Feature, MapBrowserEvent } from "ol";
import { LineString, Point } from "ol/geom";
import { toLonLat } from "ol/proj";
import { getDistance } from "ol/sphere";
import Select, { SelectEvent } from "ol/interaction/Select";
import Modify, { ModifyEvent } from "ol/interaction/Modify";
import { altKeyOnly, click, singleClick } from "ol/events/condition";
import type { Coordinate } from "ol/coordinate";
import type { FeatureLike } from "ol/Feature";

// Project imports
import type { EntityId, HistoryAction } from "@/types/base";
import {
  createUnitHistoryLayers,
  createUnitPathFeatures,
  labelStyle,
  selectedWaypointStyle,
  VIA_TIME,
} from "@/geo/history";
import { MapCtrlClick } from "@/geo/olInteractions";
import { convertSpeedToMetric } from "@/utils/convert";

import { useSelectedItems } from "@/stores/selectedStore";
import { useSelectedWaypoints } from "@/stores/selectedWaypoints";
import { useTimeFormatStore } from "@/stores/timeFormatStore";
import { useActiveScenario } from "@/components/injects"; 

// --- Pure Helper Functions ---

function squaredDistance(a: number[], b: number[]) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return dx * dx + dy * dy;
}

function deleteCondition(mapBrowserEvent: any) {
  return altKeyOnly(mapBrowserEvent) && singleClick(mapBrowserEvent);
}

// Logic phân tích thay đổi Geometry phức tạp được tách ra
function analyzeLineStringChange(
  f: Feature<LineString>, 
  evt: ModifyEvent, 
  preGeometry: LineString | undefined
) {
  const postGeometry = f.getGeometry();
  let action: HistoryAction = "modify";
  const preLength = preGeometry?.getCoordinates().length || 0;
  const postLength = postGeometry?.getCoordinates().length || 0;
  const preCoords = preGeometry?.getCoordinates() || [];
  const postCoords = postGeometry?.getCoordinates() || [];
  let elementIndex = -1;
  let isVia = false;

  if (preLength === postLength) {
    action = "modify";
    postCoords.every((v, i) => {
      const b = preCoords[i];
      const isEq = v[0] === b[0] && v[1] === b[1] && v[2] === b[2];
      if (!isEq) {
        elementIndex = i;
        if (v[2] === VIA_TIME) isVia = true;
      }
      return isEq;
    });
  } else if (preLength < postLength) {
    action = "add";
    elementIndex = postCoords.findIndex((e) => e[2] === 0);
    isVia = true;
  } else {
    action = "remove";
    preCoords.every((v, i) => {
      const b = postCoords[i];
      const isEq = b && v[0] === b[0] && v[1] === b[1] && v[2] === b[2];
      if (!isEq) {
        elementIndex = i;
        if (v[2] === VIA_TIME) isVia = true;
      }
      return isEq;
    });
  }

  if (elementIndex === -1 && postLength === 2) {
    action = "remove";
    const coordinate = evt.mapBrowserEvent.coordinate;
    const dista = squaredDistance(coordinate, postCoords[0]);
    const distb = squaredDistance(coordinate, postCoords[1]);
    elementIndex = dista < distb ? 0 : 1;
  }

  return { postGeometry, action, preCoords, postCoords, elementIndex, isVia };
}

// --- Main Hook ---

export interface UseUnitHistoryOptions {
  showHistory?: boolean;
  editHistory?: boolean;
  showWaypointTimestamps?: boolean;
}

// Hook chính để quản lý hiển thị và chỉnh sửa lịch sử di chuyển của units
export function useUnitHistory(
  olMap: OLMap | null,
  options: UseUnitHistoryOptions = {}
) {
  // Default options
  const { 
    showHistory = true, 
    editHistory = true, 
    showWaypointTimestamps = true 
  } = options;

  // Context & Stores
  const { selectedWaypointIds } = useSelectedWaypoints(); 
  const { selectedUnitIds } = useSelectedItems();
  const { geo, unitActions, store, helpers } = useActiveScenario();
  const fmt = useTimeFormatStore();

  // Internal mutable state
  const isInternalRef = useRef(false);
  const preGeometryRef = useRef<LineString | undefined>(undefined);

  // 1. Create Layers (Memoized)
  const layers = useMemo(() => createUnitHistoryLayers(), []);
  const { waypointLayer, historyLayer, legLayer, viaLayer, arcLayer, labelsLayer } = layers;

  // 2. Setup Interactions (Memoized)
  const interactions = useMemo(() => {
    // Select Interaction
    const waypointSelect = new Select({
      layers: [waypointLayer, labelsLayer],
      condition: click,
      style: (feature: FeatureLike) => {
        labelStyle.getText()!.setText(feature.get("label") || "");
        return [selectedWaypointStyle, labelStyle];
      },
    });

    // Modify Interaction
    const historyModify = new Modify({ 
      source: legLayer.getSource()!, 
      deleteCondition 
    });

    // CtrlClick Interaction
    const ctrlClickInteraction = new MapCtrlClick({ 
      handleCtrlClickEvent: () => {} // Placeholder, sẽ override
    });
    ctrlClickInteraction.setActive(false);

    return { waypointSelect, historyModify, ctrlClickInteraction };
  }, [waypointLayer, labelsLayer, legLayer]);

  const { waypointSelect, historyModify, ctrlClickInteraction } = interactions;

  // 3. Logic: Redraw Selected Layer để Cập nhật waypoint selection
  const redrawSelectedLayer = useCallback((waypointIds: Set<string>) => {
    if (!isInternalRef.current) {
      waypointSelect.getFeatures().clear();
      waypointIds.forEach((fid) => {
        const feature = waypointLayer.getSource()?.getFeatureById(fid) as Feature;
        if (feature) waypointSelect.getFeatures().push(feature);
      });
    }
    isInternalRef.current = false;
  }, [waypointSelect, waypointLayer]);

  // 4. Logic: Draw History: Render đường đi từ state history
  const drawHistory = useCallback(() => {
    if (!olMap) return;

    const historyLayerSource = legLayer.getSource()!;
    const waypointLayerSource = waypointLayer.getSource()!;
    const viaLayerSource = viaLayer.getSource()!;
    const arcLayerSource = arcLayer.getSource()!;

    arcLayer.setOpacity(editHistory ? 0.4 : 1);
    
    // Clear all
    historyLayerSource.clear();
    waypointLayerSource.clear();
    arcLayerSource.clear();
    viaLayerSource.clear();

    if (!showHistory) return;

    selectedUnitIds.forEach((unitId) => {
      const unit = helpers.getUnitById(unitId);
      if (!unit) return;

      const { legFeatures, waypointFeatures, viaPointFeatures, arcFeatures } =
        createUnitPathFeatures(unit, {
          isEditMode: editHistory,
          timeZone: store.state.info.timeZone,
        });

      arcLayerSource.addFeatures(arcFeatures);
      historyLayerSource.addFeatures(editHistory ? legFeatures : []);
      waypointLayerSource.addFeatures(waypointFeatures);
      viaLayerSource.addFeatures(viaPointFeatures);
      
      redrawSelectedLayer(selectedWaypointIds);
    });
  }, [
    olMap, showHistory, editHistory, selectedUnitIds, selectedWaypointIds,
    legLayer, waypointLayer, viaLayer, arcLayer,
    helpers, store.state.info.timeZone, redrawSelectedLayer
  ]);

  // 5. Logic: Handle Feature Change (Core Logic)
  const handleHistoryFeatureChange = useCallback((
    unitId: EntityId,
    action: HistoryAction,
    elementIndex: number,
    isVia: boolean,
    postCoordinates: Coordinate[],
    preCoordinates: Coordinate[],
  ) => {
    const unit = unitActions.getUnitById(unitId);
    if (!unit) return;

    const changedCoords = postCoordinates[elementIndex];
    const llChangedCoords = changedCoords && toLonLat([changedCoords[0], changedCoords[1]]);
    
    if (isVia) {
      // Logic xử lý Via Point
      let stateElementIndex = -1;
      let viaElementIndex = -1;
      let newIndex = -1;

      const filterVia = (c: Coordinate) => !(c[2] === VIA_TIME || c[2] === 0);
      
      const coordsToCheck = action === "remove" ? preCoordinates : postCoordinates;
      const filtered = [...coordsToCheck.entries()].filter(([_, c]) => filterVia(c));
      
      stateElementIndex = filtered.findIndex(([i]) => i > elementIndex);
      // Fallback nếu là điểm cuối
      if (stateElementIndex === -1) { /* Handle edge case if needed */ }

      if (stateElementIndex > 0) {
        viaElementIndex = elementIndex - filtered[stateElementIndex - 1][0] - 1;
        const targetTime = filtered[stateElementIndex][1][2];
        newIndex = unit.state?.findIndex((s) => s.t === targetTime) ?? -1;
      }

      unitActions.updateUnitStateVia(
        unitId,
        action,
        newIndex,
        viaElementIndex,
        llChangedCoords,
      );
    } else {
      // Logic xử lý Waypoint thường
      if (action === "remove") {
        const index = unit.state?.findIndex(
          (s) => s.t === preCoordinates[elementIndex][2],
        );
        if (index !== undefined && index !== -1) {
          unitActions.deleteUnitStateEntry(unitId, index);
        }
      } else if (action === "modify") {
        geo.addUnitPosition(unitId, llChangedCoords, changedCoords[2]);
      }
    }
  }, [geo, unitActions]);

  // --- Effects ---

  // Effect: Add Layers & Interactions to Map
  useEffect(() => {
    if (!olMap) return;

    // Add Layers
    olMap.addLayer(arcLayer);
    olMap.addLayer(legLayer);
    olMap.addLayer(waypointLayer);
    olMap.addLayer(viaLayer);
    olMap.addLayer(labelsLayer);

    // Add Interactions
    olMap.addInteraction(waypointSelect);
    olMap.addInteraction(historyModify);
    olMap.addInteraction(ctrlClickInteraction);

    historyLayer.set("title", "History");

    return () => {
      // Cleanup Layers
      olMap.removeLayer(arcLayer);
      olMap.removeLayer(legLayer);
      olMap.removeLayer(waypointLayer);
      olMap.removeLayer(viaLayer);
      olMap.removeLayer(labelsLayer);

      // Cleanup Interactions
      olMap.removeInteraction(waypointSelect);
      olMap.removeInteraction(historyModify);
      olMap.removeInteraction(ctrlClickInteraction);
    };
  }, [olMap, arcLayer, legLayer, waypointLayer, viaLayer, labelsLayer, historyLayer, waypointSelect, historyModify, ctrlClickInteraction]);

  // Effect: Update Interaction Handlers (Override function to access fresh closure)
  useEffect(() => {
    // 1. Override CtrlClick Handler
    (ctrlClickInteraction as any).handleCtrlClickEvent = (event: MapBrowserEvent<PointerEvent>) => {
      const clickPosition = toLonLat(olMap?.getEventCoordinate(event.originalEvent) || [0,0]);
      
      selectedUnitIds.forEach((unitId) => {
        const unit = helpers.getUnitById(unitId);
        if (!unit) return;
        
        // Logic tính toán thời gian dựa trên vận tốc
        const lastLocationEntry = unit.state?.filter((s) => s.location).pop();
        let newTime = undefined;
        if (lastLocationEntry) {
          const { location, t } = lastLocationEntry;
          const distance = getDistance(location!, clickPosition);
          const speedValue = unit.properties?.averageSpeed || unit.properties?.maxSpeed;
          const speed = speedValue
            ? convertSpeedToMetric(speedValue.value, speedValue.uom)
            : convertSpeedToMetric(30, "km/h");
          const time = distance / speed;
          newTime = Math.round(t + time * 1000);
        }
        geo.addUnitPosition(unitId, clickPosition, newTime);
      });
    };

    // 2. Select Handler
    const selectKey = waypointSelect.on("select", (evt: SelectEvent) => {
      evt.mapBrowserEvent.stopPropagation();
      isInternalRef.current = true;
      
      const newSet = new Set(selectedWaypointIds);
      evt.selected.forEach((f) => newSet.add(f.getId() as string));
      evt.deselected.forEach((f) => newSet.delete(f.getId() as string));
      
      selectedWaypointIds.clear();
      newSet.forEach(id => selectedWaypointIds.add(id));
    });

    // 3. Modify Handlers
    const modifyStartKey = historyModify.on("modifystart", (evt) => {
      const f = (evt as ModifyEvent).features.item(0) as Feature<LineString>;
      const geometryType = f.getGeometry()?.getType();
      if (geometryType === "LineString") {
        preGeometryRef.current = f.getGeometry()?.clone();
      }
    });

    const modifyEndKey = historyModify.on("modifyend", (evt) => {
      const f = (evt as ModifyEvent).features.item(0) as Feature<LineString | Point>;
      const geometryType = f.getGeometry()?.getType();

      if (geometryType === "LineString") {
        const result = analyzeLineStringChange(f as Feature<LineString>, evt as ModifyEvent, preGeometryRef.current);
        if (result.elementIndex === -1) {
          console.warn("Cannot modify geometry");
          return;
        }
        
        handleHistoryFeatureChange(
          f.get("unitId"),
          result.action,
          result.elementIndex,
          result.isVia,
          result.postCoords,
          result.preCoords,
        );

        // Update geometry visual immediately
        const updatedGeometry = result.postGeometry?.getCoordinates()
          .map((e) => [e[0], e[1], e[2] === 0 ? VIA_TIME : e[2]]);
        if (updatedGeometry) f.getGeometry()?.setCoordinates(updatedGeometry, "XYM");

      } else if (geometryType === "Point") {
        const unitId = f.get("unitId");
        const action = deleteCondition((evt as ModifyEvent).mapBrowserEvent) ? "remove" : "modify";
        const postCoords = [(f as Feature<Point>).getGeometry()?.getCoordinates()!];
        
        handleHistoryFeatureChange(unitId, action, 0, false, postCoords, postCoords);
      }
      
      drawHistory();
    });

    return () => {
      // Cleanup listeners
      waypointSelect.un("select", selectKey.listener);
      historyModify.un("modifystart", modifyStartKey.listener);
      historyModify.un("modifyend", modifyEndKey.listener);
    };

  }, [
    olMap, selectedUnitIds, selectedWaypointIds, geo, helpers, 
    handleHistoryFeatureChange, drawHistory, waypointSelect, 
    historyModify, ctrlClickInteraction
  ]);

  // Effect: React to Option Changes
  useEffect(() => {
    historyModify.setActive(editHistory);
    labelsLayer.setVisible(showWaypointTimestamps);
    drawHistory();
  }, [editHistory, showWaypointTimestamps, historyModify, labelsLayer, drawHistory]);

  // Effect: React to Selection Changes
  useEffect(() => {
    const hasSelection = selectedUnitIds.size > 0;
    waypointSelect.setActive(hasSelection);
    ctrlClickInteraction.setActive(hasSelection);
    drawHistory();
  }, [selectedUnitIds, waypointSelect, ctrlClickInteraction, drawHistory]);

  // Effect: Redraw when selected Waypoints change (Highlighting)
  useEffect(() => {
    redrawSelectedLayer(selectedWaypointIds);
  }, [selectedWaypointIds, redrawSelectedLayer]);

  // Effect: Redraw when time format changes
  useEffect(() => {
    drawHistory();
  }, [(fmt as any).trackFormatter, drawHistory]);

  // Expose Controls (để component cha có thể control nếu cần)
  return {
    historyLayer,
    drawHistory,
    historyModify,
    waypointSelect,
    ctrlClickInteraction,
  };
}