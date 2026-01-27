"use client";

import React, { useEffect, useRef } from "react";
import MapEvent from "ol/MapEvent";
import OLMap from "ol/Map";
import { defaults as defaultControls } from "ol/control";
import View from "ol/View";
import "ol/ol.css";
import { fromLonLat } from "ol/proj";
import BaseLayer from "ol/layer/Base";
import { type Coordinate } from "ol/coordinate";

// Import Store và Types
import { useBaseLayersStore } from "@/stores/baseLayersStore"; // Đường dẫn store của bạn
import { createBaseLayerInstances } from "@/geo/baseLayers";
import type { LayerConfigFile } from "@/geo/layerConfigTypes";

interface MapContainerProps {
  center?: Coordinate;
  zoom?: number;
  baseLayerName?: string; // Tên layer muốn active ban đầu (override default của store)
  onReady?: (map: OLMap) => void;
  onMoveEnd?: (event: { view: View }) => void;
}

export default function MapContainer({
  center = [30, 60],
  zoom = 5,
  baseLayerName,
  onReady,
  onMoveEnd,
}: MapContainerProps) {
  const mapRoot = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<OLMap | null>(null);
  const layerInstances = useRef<BaseLayer[]>([]); 

  // --- Zustand Store Hooks ---
  // Lấy các state và actions cần thiết để lắng nghe thay đổi
  const initializeStore = useBaseLayersStore((state) => state.initialize);
  const selectLayer = useBaseLayersStore((state) => state.selectLayer);
  const activeLayerName = useBaseLayersStore((state) => state.activeLayerName);
  const storedLayers = useBaseLayersStore((state) => state.layers);

  // --- Effect 1: Initialization (Chạy 1 lần khi mount) ---
  useEffect(() => {
    if (!mapRoot.current) return;

    // 1. Khởi tạo View
    const view = new View({
      zoom: zoom,
      center: fromLonLat(center),
      showFullExtent: true,
    });

    // 2. Khởi tạo Map (chưa có layers)
    const olMap = new OLMap({
      target: mapRoot.current,
      maxTilesLoading: 200,
      layers: [], // Sẽ add sau khi init store
      view: view,
      controls: defaultControls({
        attributionOptions: { collapsible: true },
      }),
    });

    mapInstance.current = olMap;

    // Handler MoveEnd
    const handleMoveEnd = (evt: MapEvent) => {
      onMoveEnd?.({ view: evt.map.getView() });
    };
    olMap.on("moveend", handleMoveEnd);

    // 3. Logic Async: Load Config -> Tạo Layers
    const initMapLayers = async () => {
      // Gọi action initialize từ store
      await initializeStore();

      // Mẹo quan trọng:
      // Tại thời điểm này, biến `storedLayers` (từ hook) chưa kịp cập nhật do React render cycle.
      // Ta dùng `useBaseLayersStore.getState()` để lấy dữ liệu mới nhất ngay lập tức.
      const freshState = useBaseLayersStore.getState();
      
      // Xử lý override active layer nếu props truyền vào có
      if (
        baseLayerName &&
        freshState.layers.some((l) => l.name === baseLayerName)
      ) {
        selectLayer(baseLayerName);
      }

      // Tạo OpenLayers Instances từ config của store
      // Ép kiểu unknown sang LayerConfigFile để khớp với hàm createBaseLayerInstances của bạn
      const createdLayers = createBaseLayerInstances(
        freshState.layers as unknown as LayerConfigFile,
        view
      );
      
      layerInstances.current = createdLayers;

      // Add layers vào Map
      createdLayers.forEach((layer) => {
        olMap.addLayer(layer);
        
        // Sync Opacity ban đầu
        const storeLayer = freshState.layers.find((l) => l.name === layer.get("name"));
        if (storeLayer) {
          layer.setOpacity(storeLayer.opacity);
        }
        
        // Sync Visibility ban đầu (dựa trên active name mới nhất)
        // Lưu ý: dùng getState() để lấy activeName chính xác nhất lúc này
        const currentActiveName = useBaseLayersStore.getState().activeLayerName;
        layer.setVisible(layer.get("name") === currentActiveName);
      });

      // Báo ra ngoài là Map đã sẵn sàng
      onReady?.(olMap);
    };

    initMapLayers();

    // Cleanup
    return () => {
      olMap.setTarget(undefined);
      olMap.un("moveend", handleMoveEnd);
      mapInstance.current = null;
      layerInstances.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 


  // --- Effect 2: Sync Visibility (Active Layer) ---
  // Khi activeLayerName trong store thay đổi -> Update OL layers
  useEffect(() => {
    if (layerInstances.current.length === 0) return;

    layerInstances.current.forEach((l) => {
      const isVisible = l.get("name") === activeLayerName;
      // Chỉ set nếu trạng thái thực sự khác để tối ưu performance
      if (l.getVisible() !== isVisible) {
        l.setVisible(isVisible);
      }
    });
  }, [activeLayerName]);


  // --- Effect 3: Sync Opacity ---
  // Khi mảng layers trong store thay đổi (ví dụ do kéo thanh trượt opacity) -> Update OL layers
  useEffect(() => {
    if (layerInstances.current.length === 0) return;

    storedLayers.forEach((storeLayer) => {
      const olLayer = layerInstances.current.find(
        (l) => l.get("name") === storeLayer.name
      );
      if (olLayer) {
        // Chỉ set nếu giá trị khác nhau
        if (olLayer.getOpacity() !== storeLayer.opacity) {
          olLayer.setOpacity(storeLayer.opacity);
        }
      }
    });
  }, [storedLayers]);

  return <div ref={mapRoot} className="h-full w-full map-container-custom" />;
}