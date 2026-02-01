"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Eye, EyeOff, Maximize2 as ZoomIcon } from "lucide-react";
import { useDebounceCallback } from "usehooks-ts";

// Components
import EditableLabel from "@/components/EditableLabel";
import IconButton from "@/components/IconButton";
import DotsMenu from "@/components/DotsMenu";
import ScrollTabs from "@/components/ScrollTabs";
import { TabsContent } from "@/components/ui/tabs";
import ImageMapLayerSettings from "@/modules/scenarioeditor/ImageMapLayerSettings";
import TileJSONMapLayerSettings from "@/modules/scenarioeditor/TileMapLayerSettings";
import MapLayerMetaSettings from "@/modules/scenarioeditor/MapLayerMetaSettings";

// Logic & Stores
import { useActiveScenario } from "@/components/injects";
import { useUiStore } from "@/stores/uiStore";
import { useSelectedItems } from "@/stores/selectedStore";
import { imageLayerAction } from "@/components/eventKeys";
import { eventBus } from "@/lib/eventBus";
import { getMapLayerIcon } from "@/modules/scenarioeditor/scenarioMapLayers";

// Types
import type { FeatureId, ScenarioMapLayer } from "@/types/scenarioGeoModels";
import type { ScenarioMapLayerUpdate } from "@/types/internalModels";
import type { LayerUpdateOptions } from "@/hooks/geoMapLayers";
import type { ScenarioMapLayerAction } from "@/types/constants";

interface Props {
  layerId: FeatureId;
}

export default function ScenarioMapLayerDetails({ layerId }: Props) {
  const { geo } = useActiveScenario();
  const uiStore = useUiStore();
  const { clear } = useSelectedItems();

  // --- State ---
  const [layerName, setLayerName] = useState("");
  const [selectedTab, setSelectedTab] = useState(0);

  // --- Computed (useMemo) ---
  const mapLayer = useMemo(() => 
    geo.getMapLayerById(layerId) as ScenarioMapLayer, 
  [geo, layerId]);

  const isVisible = useMemo(() => 
    !(mapLayer?.isHidden ?? false), 
  [mapLayer]);

  const opacityAsPercent = useMemo(() => 
    ((mapLayer?.opacity ?? 1) * 100).toFixed(0), 
  [mapLayer?.opacity]);

  const tabList = useMemo(() => {
    const base = [
      { label: "Details", value: "0" },
      { label: "Settings", value: "1" },
    ];
    if (uiStore.debugMode) base.push({ label: "Debug", value: "2" });
    return base;
  }, [uiStore.debugMode]);

  // --- Watchers (useEffect) ---
  useEffect(() => {
    if (mapLayer) {
      setLayerName(mapLayer.name ?? "");
      if (mapLayer._isNew) setSelectedTab(1);
    }
  }, [mapLayer, layerId]);

  // --- Handlers ---
  const debouncedUpdate = useDebounceCallback((data: ScenarioMapLayerUpdate) => {
    geo.updateMapLayer(layerId, data, { noEmit: true });
  }, 500);

  const updateLayer = (data: ScenarioMapLayerUpdate, options: LayerUpdateOptions = {}) => {
    const debounce = options.debounce ?? false;
    const undoable = options.undoable ?? !debounce;
    if (debounce) debouncedUpdate(data);
    if (mapLayer) {
      geo.updateMapLayer(layerId, data, { undoable, emitOnly: debounce });
    }
  };

  const onImageLayerAction = (action: ScenarioMapLayerAction) => {
    if (action === "zoom") eventBus.emit(imageLayerAction, { action, id: mapLayer.id });
    if (action === "delete") {
      geo.deleteMapLayer(mapLayer.id);
      clear();
    }
  };

  if (!mapLayer) return null;

  const LayerIcon = getMapLayerIcon(mapLayer);

  return (
    <div className="flex flex-col">
      <header className="px-4 py-2">
        <EditableLabel 
          value={layerName} 
          onChange={setLayerName}
          onUpdateValue={(val) => geo.updateMapLayer(layerId, { name: val })} 
        />
        
        

        <div className="flex items-center mt-2">
          <div className="flex flex-auto items-center">
            {LayerIcon && <LayerIcon className="text-muted-foreground mr-2 h-7 w-7" />}
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={mapLayer.opacity ?? 1}
              onChange={(e) => updateLayer({ opacity: parseFloat(e.target.value) }, { undoable: false, debounce: false })}
              className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-red-800 accent-red-600"
            />
            <span className="ml-2 w-8 shrink-0 text-sm font-medium">{opacityAsPercent}%</span>
          </div>

          <div className="ml-2 flex shrink-0 items-center gap-1">
            <IconButton
              onClick={() => eventBus.emit(imageLayerAction, { action: 'zoom', id: layerId })}
              title="Zoom to extent"
            >
              <ZoomIcon className="h-6 w-6" />
            </IconButton>
            
            <IconButton 
              onClick={() => updateLayer({ isHidden: !mapLayer.isHidden })} 
              title="Toggle visibility"
            >
              {isVisible ? <Eye className="h-6 w-6" /> : <EyeOff className="h-6 w-6" />}
            </IconButton>

            <DotsMenu 
              items={[
                { label: "Zoom to", action: "zoom" },
                { label: "Delete", action: "delete" },
              ]} 
              onAction={onImageLayerAction} 
            />
          </div>
        </div>
      </header>

      <div className="-mx-4 border-t mt-2">
        <ScrollTabs 
          items={tabList} 
          value={selectedTab.toString()} 
          onValueChange={(v) => setSelectedTab(parseInt(v))}
        >
          <TabsContent value="0" className="mx-4 pt-4">
            <MapLayerMetaSettings layer={mapLayer} onUpdate={updateLayer} onAction={(action) => onImageLayerAction(action as ScenarioMapLayerAction)} />
          </TabsContent>

          <TabsContent value="1" className="mx-4 pt-4">
            {mapLayer.type === "ImageLayer" ? (
              <ImageMapLayerSettings
                key={mapLayer.id}
                layer={mapLayer}
                onUpdate={updateLayer}
              />
            ) : (mapLayer.type === "TileJSONLayer" || mapLayer.type === "XYZLayer") ? (
              <TileJSONMapLayerSettings
                layer={mapLayer}
                onUpdate={updateLayer}
                onAction={(action) => onImageLayerAction(action as ScenarioMapLayerAction)}
              />
            ) : null}
          </TabsContent>

          {uiStore.debugMode && (
            <TabsContent value="2" className="mx-4 pt-4 max-w-none">
              <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                {JSON.stringify(mapLayer, null, 2)}
              </pre>
            </TabsContent>
          )}
        </ScrollTabs>
      </div>
    </div>
  );
}