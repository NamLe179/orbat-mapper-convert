"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import BaseLayer from "ol/layer/Base";
import VectorLayer from "ol/layer/Vector";
import LayerGroup from "ol/layer/Group";
import ImageLayer from "ol/layer/Image";
import { getUid } from "ol";
import { toLonLat } from "ol/proj";
import { Eye, EyeOff } from "lucide-react"; // Thay thế HeroIcons

import { useGeoStore } from "@/stores/geoStore";
import { useMapSettingsStore } from "@/stores/mapSettingsStore";
import { useBaseLayersStore } from "@/stores/baseLayersStore";
import BaseLayerSwitcher from "./BaseLayerSwitcher";
import OpacityInput from "./OpacityInput";

import { type LayerType } from "@/modules/scenarioeditor/featureLayerUtils";
import { type AnyVectorLayer } from "@/geo/types";

// --- Types ---
export interface LayerInfo<T extends BaseLayer = BaseLayer> {
  id: string;
  name: string;
  title: string;
  visible: boolean;
  zIndex: number;
  opacity: number;
  layer: T; // Trong React state, ta vẫn giữ ref tới layer gốc để thao tác
  subLayers?: LayerInfo<T>[];
  description?: string;
  layerType?: LayerType | "baselayer";
}

// --- Component ---
export default function LayersPanel() {
  const geoStore = useGeoStore();
  const mapSettings = useMapSettingsStore();
  const baseLayersStore = useBaseLayersStore();

  const [vectorLayers, setVectorLayers] = useState<LayerInfo<AnyVectorLayer>[]>([]);
  const [debugMapView, setDebugMapView] = useState<{ center: number[]; zoom: number } | null>(null);

  // 1. Base Layers Logic (Computed)
  const baseLayers = useMemo(() => {
    return baseLayersStore.layers.map((l) => ({
      id: l.name,
      name: l.name,
      title: l.title,
      visible: baseLayersStore.activeLayerName === l.name,
      zIndex: 0,
      opacity: l.opacity,
      layer: null as any, // Không cần instance OL cho base layer switcher
      description: "",
      layerType: "baselayer" as const,
    }));
  }, [baseLayersStore.layers, baseLayersStore.activeLayerName]);

  const activeBaseLayer = useMemo(() => {
    return baseLayers.find((l) => l.name === baseLayersStore.activeLayerName);
  }, [baseLayers, baseLayersStore.activeLayerName]);

  const handleSelectBaseLayer = (layerInfo: LayerInfo<any> | undefined) => {
    if (layerInfo) {
      baseLayersStore.selectLayer(layerInfo.name);
      // Giả định mapSettings là mutable store (Valtio) hoặc có setter
      // @ts-ignore
      if (mapSettings.setBaseLayerName) mapSettings.setBaseLayerName(layerInfo.name);
      // @ts-ignore
      else mapSettings.baseLayerName = layerInfo.name;
    }
  };

  // 2. Vector/Other Layers Logic
  const updateLayers = useCallback(() => {
    if (!geoStore.olMap) return;

    const transformLayer = (layer: BaseLayer): LayerInfo => {
      const l: LayerInfo = {
        id: getUid(layer),
        title: layer.get("title") || layer.get("name"),
        name: layer.get("name"),
        layerType: layer.get("layerType"),
        visible: layer.getVisible(),
        zIndex: layer.getZIndex() || 0,
        opacity: layer.getOpacity(),
        layer: layer, // Không cần markRaw trong React
        subLayers: [],
      };

      if (layer instanceof LayerGroup) {
        l.subLayers = layer
          .getLayers()
          .getArray()
          .filter((sub) => sub.get("title"))
          .map(transformLayer);
      }
      return l;
    };

    const mappedLayers = geoStore.olMap
      .getLayers()  // Only get top-level layers, not getAllLayers()
      .getArray()
      .filter((l) => l.get("title"))
      .map(transformLayer);

    const filteredVectorLayers = mappedLayers.filter(
      ({ layer, layerType }) =>
        (layer instanceof VectorLayer ||
          layer instanceof LayerGroup ||
          layer instanceof ImageLayer) &&
        layerType !== "baselayer"
    ) as LayerInfo<AnyVectorLayer>[];

    setVectorLayers(filteredVectorLayers);
  }, [geoStore.olMap]);

  // Effect: Watch map instance to update layers list
  useEffect(() => {
    if (geoStore.olMap) {
      updateLayers();
      // Optional: Lắng nghe sự kiện add/remove layer nếu cần
      // geoStore.olMap.getLayers().on('change:length', updateLayers);
    }
  }, [geoStore.olMap, updateLayers]);

  // Effect: Update debug view info
  useEffect(() => {
    if (!geoStore.olMap) return;
    const view = geoStore.olMap.getView();

    const updateViewInfo = () => {
      const center = view.getCenter();
      if (center) {
        setDebugMapView({
          center: toLonLat(center, view.getProjection()),
          zoom: view.getZoom() || 0,
        });
      }
    };

    // Initial update
    updateViewInfo();

    // Listen to changes
    geoStore.olMap.on("moveend", updateViewInfo);

    return () => {
      geoStore.olMap?.un("moveend", updateViewInfo);
    };
  }, [geoStore.olMap]);

  // 3. Actions
  const toggleLayer = (l: LayerInfo<any>) => {
    const newVisible = !l.visible;
    
    // Side effect trên OL Layer
    l.layer.setVisible(newVisible);
    l.layer.setOpacity(l.opacity);

    // Update React State để re-render UI (đổi icon mắt)
    setVectorLayers((prev) =>
      prev.map((item) =>
        item.id === l.id ? { ...item, visible: newVisible } : item
      )
    );
  };

  const handleUpdateOpacity = (l: LayerInfo<any>, opacity: number) => {
    if (l.layerType === "baselayer") {
      baseLayersStore.setLayerOpacity(l.name, opacity);
    } else {
      // Side effect
      l.layer.setOpacity(opacity);
      // Update React State
      setVectorLayers((prev) =>
        prev.map((item) =>
          item.id === l.id ? { ...item, opacity } : item
        )
      );
    }
  };

  return (
    <div>
      <p className="text-xs font-medium tracking-wider uppercase">Base layers</p>

      <div className="mt-4">
        <BaseLayerSwitcher
          settings={baseLayers}
          defaultLayerName="osm" // Hoặc lấy từ config
          selectedLayer={activeBaseLayer}
          onSelectLayer={handleSelectBaseLayer}
          onLayerOpacityChange={handleUpdateOpacity}
        />
      </div>

      <p className="mt-4 text-xs font-medium tracking-wider uppercase">
        Other layers
      </p>

      <div className="bg-card mt-4 overflow-hidden rounded-md shadow-sm">
        <ul className="divide-y divide-border">
          {vectorLayers.map((layer) => (
            <li key={layer.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <p className="flex-auto truncate text-sm" title={layer.title}>
                  {layer.title}
                </p>
                <div className="ml-2 flex shrink-0 items-center">
                  <OpacityInput
                    opacity={layer.opacity}
                    onOpacityChange={(val) => handleUpdateOpacity(layer, val)}
                  />
                  <button
                    type="button"
                    className="text-muted-foreground ml-4 h-5 w-5 hover:text-foreground transition-colors"
                    onClick={() => toggleLayer(layer)}
                  >
                    {layer.visible ? (
                      <Eye className="h-5 w-5" />
                    ) : (
                      <EyeOff className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </li>
          ))}
          {vectorLayers.length === 0 && (
            <li className="px-6 py-4 text-sm text-muted-foreground italic">
              No other layers available
            </li>
          )}
        </ul>
      </div>

      <div className="mt-4">
        <p className="text-sm font-medium">For debugging:</p>
        <pre className="text-xs mt-1 bg-muted p-2 rounded overflow-auto">
          {debugMapView ? JSON.stringify(debugMapView, null, 2) : "Map not ready"}
        </pre>
      </div>
    </div>
  );
}