"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import OLMap from "ol/Map";
import View from "ol/View";
import type Select from "ol/interaction/Select";

// Stores & Hooks
import { useGeoStore } from "@/stores/geoStore";
import { useMapSettingsStore } from "@/stores/mapSettingsStore";
import { useMapViewStore } from "@/stores/mapViewStore";

// Components
import MapContainer from "./MapContainer";
import ScenarioMapLogic from "@/components/ScenarioMapLogic";
import MapContextMenu from "@/components/MapContextMenu";

// Types
interface MapReadyPayload {
  olMap: OLMap;
  featureSelectInteraction: Select;
  unitSelectInteraction: Select;
}

interface ScenarioMapProps {
  onMapReady?: (payload: MapReadyPayload) => void;
  children?: React.ReactNode;
}

export default function ScenarioMap({ onMapReady, children }: ScenarioMapProps) {
  // --- Refs & State ---
  const [olMapInstance, setOlMapInstance] = useState<OLMap | null>(null);
  const mapRef = useRef<OLMap | null>(null); // Để truyền vào ContextMenu

  const mapSettings = useMapSettingsStore();
  const mapViewStore = useMapViewStore();
  const geoStore = useGeoStore();

  // --- Handlers ---

  const handleMapReady = useCallback((olMap: OLMap) => {
    mapRef.current = olMap;
    setOlMapInstance(olMap);
    
    // Đồng bộ vào store (giả định store mutable như logic gốc)
    if (geoStore.setOlMap) {
      geoStore.setOlMap(olMap);
    } else {
      geoStore.olMap = olMap;
    }
  }, [geoStore]);

  const handleMoveEnd = useCallback(({ view }: { view: View }) => {
    // Cập nhật zoom level vào store
    const currentZoom = view.getZoom() ?? 0;
    if (mapViewStore.setZoomLevel) {
      mapViewStore.setZoomLevel(currentZoom);
    } else {
      mapViewStore.zoomLevel = currentZoom;
    }
  }, [mapViewStore]);

  const handleLogicMapReady = useCallback((payload: MapReadyPayload) => {
    if (onMapReady) {
      onMapReady(payload);
    }
  }, [onMapReady]);

  // Debug: Log dimensions
  useEffect(() => {
    const interval = setInterval(() => {
      const elements = document.querySelectorAll('[class*="ScenarioMap"], [class*="MapContextMenu"], [class*="MapContainer"]');
      console.log('[ScenarioMap] Debug - checking all map-related elements');
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 bg-background overflow-hidden" data-component="ScenarioMap">
      {/* Sử dụng MapRef (MutableRefObject) để tránh re-render ContextMenu 
        vô tận khi instance bản đồ thay đổi 
      */}
      <div className="absolute inset-0" data-component="ScenarioMap-inner">
        <MapContextMenu mapRef={mapRef}>
          <MapContainer
            onReady={handleMapReady}
            baseLayerName={mapSettings.baseLayerName}
            onMoveEnd={handleMoveEnd}
          />
        </MapContextMenu>
      </div>

      {/* Logic Component chỉ mount khi instance bản đồ đã tồn tại */}
      {olMapInstance && (
        <ScenarioMapLogic
          olMap={olMapInstance}
          onMapReady={handleLogicMapReady}
        />
      )}

      {/* Slot Content */}
      {children}

      <style jsx global>{`
        .ol-scale-line {
          bottom: 2.2rem;
        }
      `}</style>
    </div>
  );
}