"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Eye, EyeOff } from "lucide-react";
import { monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { extractClosestEdge, type Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";

// Logic & Stores
import { useActiveScenario, useActiveMap, useActiveLayer } from "@/components/injects";
import { useUiStore } from "@/stores/uiStore";
import { useSelectedItems } from "@/stores/selectedStore";
import { useFeatureLayerUtils, useScenarioLayerSync } from "./featureLayerUtils";
import { addMapLayer, getMapLayerIcon } from "./scenarioMapLayers";
import { 
  isScenarioFeatureDragItem, 
  isScenarioFeatureLayerDragItem 
} from "@/types/draggables";
import { nanoid, triggerPostMoveFlash } from "@/utils";
import { ScenarioLayerActions } from "@/types/constants";

// Components
import ChevronPanel from "@/components/ChevronPanel";
import DotsMenu from "@/components/DotsMenu";
import SplitButton from "@/components/SplitButton";
import ScenarioFeatureLayer from "./ScenarioFeatureLayer";

// Types
import type { NScenarioFeature, NScenarioLayer } from "@/types/internalModels";
import type { 
  FeatureId, 
  ScenarioMapLayer, ScenarioMapLayerType
} from "@/types/scenarioGeoModels";

export default function ScenarioLayersTabPanel({ 
  onFeatureClick: emitFeatureClick 
}: { 
  onFeatureClick?: (f: NScenarioFeature, l: NScenarioLayer, e?: React.MouseEvent) => void 
}) {
  const scn = useActiveScenario();
  const olMap = useActiveMap();
  const activeLayerContext = useActiveLayer();
  const activeLayerId = activeLayerContext?.activeLayerId;
  const setActiveLayerId = activeLayerContext?.setActiveLayerId;
  const uiStore = useUiStore();
  const { geo, store: { groupUpdate, state } } = scn;

  // --- UI Logic ---
  const [editedLayerId, setEditedLayerId] = useState<FeatureId | null>(null);

  const { 
    scenarioLayersFeatures, 
    scenarioLayersGroup, 
    zoomToLayer, 
    zoomToFeature, 
    zoomToFeatures, 
    panToFeature 
  } = useFeatureLayerUtils(olMap!);

  useScenarioLayerSync(scenarioLayersGroup.getLayers() as any);

  const selectedItems = useSelectedItems();

  const { 
    selectedFeatureIds, 
    selectedMapLayerIds, 
    activeMapLayerId, 
    activeFeatureId 
  } = selectedItems;

  useEffect(() => {
    uiStore.setLayersPanelActive(true);
    return () => uiStore.setLayersPanelActive(false);
  }, []);

  // --- Handlers ---
  const addNewLayer = () => {
    const addedLayer = geo.addLayer({
      id: nanoid(),
      name: `New layer`,
      features: [],
      _isNew: false,
    });
    if (addedLayer) {
      setActiveLayerId?.(addedLayer.id);
      setEditedLayerId(addedLayer.id);
    }
    return addedLayer;
  };

  const addNewMapLayer = (type: ScenarioMapLayerType) => {
    const newLayer = addMapLayer(type, geo);
    uiStore.setMapLayersPanelOpen(true);
    // Sử dụng setTimeout thay cho nextTick
    setTimeout(() => selectedItems.setActiveMapLayerId(newLayer.id), 0);
  };

  // --- Drag and Drop Monitor ---
  useEffect(() => {
    return monitorForElements({
      canMonitor: ({ source }) =>
        isScenarioFeatureDragItem(source.data) || isScenarioFeatureLayerDragItem(source.data),
      onDrop: ({ source, location }) => {
        const destination = location.current.dropTargets[0];
        if (!destination) return;

        const closestEdge: Edge | null = extractClosestEdge(destination.data);

        if (isScenarioFeatureDragItem(source.data) && isScenarioFeatureDragItem(destination.data)) {
          const target = closestEdge === "top" ? "above" : "below";
          const sourceData = source.data as { feature: NScenarioFeature };
          const destData = destination.data as { feature: NScenarioFeature };
          geo.reorderFeature(sourceData.feature.id, destData.feature.id, target);
          
          setTimeout(() => {
            const el = document.querySelector(`[data-feature-id="${sourceData.feature.id}"]`);
            if (el) triggerPostMoveFlash(el as HTMLElement);
          }, 0);
        } else if (isScenarioFeatureLayerDragItem(destination.data) && isScenarioFeatureDragItem(source.data)) {
          const sourceData = source.data as { feature: NScenarioFeature };
          const destData = destination.data as { layer: NScenarioLayer };
          geo.reorderFeature(sourceData.feature.id, destData.layer.id, "on");
        } else if (isScenarioFeatureLayerDragItem(source.data) && isScenarioFeatureLayerDragItem(destination.data)) {
          const sourceData = source.data as { layer: NScenarioLayer };
          const destData = destination.data as { layer: NScenarioLayer };
          let toIndex = geo.getLayerIndex(destData.layer.id);
          if (closestEdge === "bottom") toIndex++;
          geo.moveLayer(sourceData.layer.id, toIndex);
        }
      },
    });
  }, [geo]);

  // --- Feature & Layer Actions ---
  const onFeatureAction = (featureIds: FeatureId | FeatureId[], action: string) => {
    const ids = Array.isArray(featureIds) ? featureIds : [featureIds];
    
    // Single item actions
    if (ids.length === 1) {
      const id = ids[0];
      const result = geo.getFeatureById(id);
      if (!result.feature || !result.layer) return;
      
      if (action === "setActive") {
        selectedItems.setActiveFeatureId(id);
        return;
      }
      if (action === "edit") {
        selectedItems.setActiveFeatureId(id);
        // TODO: Open feature edit form/panel
        return;
      }
      if (action === "moveUp") {
        const idx = result.layer.features.indexOf(id);
        if (idx > 0) {
          geo.moveFeature(id, idx - 1);
        }
        return;
      }
      if (action === "moveDown") {
        const idx = result.layer.features.indexOf(id);
        if (idx < result.layer.features.length - 1) {
          geo.moveFeature(id, idx + 1);
        }
        return;
      }
      if (action === "duplicate") {
        geo.duplicateFeature(id);
        return;
      }
    }
    
    // Batch actions
    groupUpdate(() => {
      ids.forEach(id => {
        if (action === "zoom") zoomToFeature(id);
        if (action === "pan") panToFeature(id);
        if (action === "delete") {
          geo.deleteFeature(id);
          selectedFeatureIds.delete(id);
        }
      });
    });
  };

  return (
    <div className="scenario-layers-panel">
      {/* Map Layers Section */}
      <div className="mb-4">
        <ChevronPanel 
          label="Map layers" 
          open={uiStore.mapLayersPanelOpen}
          onOpenChange={uiStore.setMapLayersPanelOpen}
          right={
            <DotsMenu 
              items={[
                { label: "Add image layer", action: () => addNewMapLayer("ImageLayer") },
                { label: "Add TileJSON layer", action: () => addNewMapLayer("TileJSONLayer") },
                { label: "Add XYZ tile layer", action: () => addNewMapLayer("XYZLayer") }
              ]}
            />
          }
        >
          
          
          <ul className="-mt-6">
            {geo.mapLayers.map((layer: ScenarioMapLayer) => (
              <li 
                key={layer.id}
                className={`group hover:bg-accent relative flex items-center justify-between border-l select-none transition-colors ${
                  selectedMapLayerIds.has(layer.id) 
                  ? 'border-yellow-500 bg-yellow-100 dark:bg-yellow-900' 
                  : 'border-transparent'
                }`}
                onClick={(e) => {
                  if (!e.ctrlKey && !e.shiftKey) selectedItems.clearSelectedFeatureIds();
                  selectedMapLayerIds.has(layer.id) 
                    ? selectedItems.deselectFeature(layer.id) 
                    : selectedItems.selectFeature(layer.id);
                }}
              >
                <button className="flex flex-auto items-center py-2.5 px-4 text-left">
                  {React.createElement(getMapLayerIcon(layer), { className: "text-muted-foreground size-5" })}
                  <span className={`ml-2 text-sm ${activeMapLayerId === layer.id ? 'font-bold' : ''} ${layer.isHidden ? 'opacity-50' : ''}`}>
                    {layer.name}
                  </span>
                </button>

              <div className="flex items-center pr-2 gap-1">
                <button 
                  onClick={(e) => { e.stopPropagation(); geo.updateMapLayer(layer.id, { isHidden: !layer.isHidden }); }}
                  className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100"
                >
                  {layer.isHidden ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
                <DotsMenu 
                  items={[
                    { label: "Zoom to", action: () => zoomToLayer(layer.id) },
                    { label: "Delete", action: () => geo.deleteMapLayer(layer.id) }
                  ]}
                  className="opacity-0 group-hover:opacity-100" 
                />
              </div>
            </li>
          ))}
        </ul>
        </ChevronPanel>
      </div>

      {/* Feature Layers Section */}
      <div className="feature-layers-list">
        {scenarioLayersFeatures.map(({ layer, features }: { layer: NScenarioLayer; features: NScenarioFeature[] }) => (
          <ScenarioFeatureLayer
            key={layer.id}
            layer={layer}
            features={features}
            activeLayerId={activeLayerId}
            setActiveLayerId={setActiveLayerId!}
            editedLayerId={editedLayerId}
            setEditedLayerId={setEditedLayerId}
            onFeatureClick={(f, l, e) => {
              if (!e?.ctrlKey) selectedItems.setActiveFeatureId(f.id);
              emitFeatureClick?.(f, l, e);
            }}
            onFeatureDoubleClick={(f, l, e) => {
              // Handle double click if needed
            }}
            onFeatureAction={onFeatureAction}
            onLayerAction={(layer, action) => {
              if (action === ScenarioLayerActions.Zoom) {
                zoomToLayer(layer.id);
              } else if (action === ScenarioLayerActions.SetActive) {
                setActiveLayerId?.(layer.id);
              } else if (action === ScenarioLayerActions.Edit) {
                setEditedLayerId(layer.id);
              } else if (action === ScenarioLayerActions.MoveUp) {
                const idx = geo.getLayerIndex(layer.id);
                if (idx > 0) {
                  geo.moveLayer(layer.id, idx - 1);
                }
              } else if (action === ScenarioLayerActions.MoveDown) {
                const idx = geo.getLayerIndex(layer.id);
                const totalLayers = geo.layers.length;
                if (idx < totalLayers - 1) {
                  geo.moveLayer(layer.id, idx + 1);
                }
              } else if (action === ScenarioLayerActions.Delete) {
                geo.deleteLayer(layer.id);
                if (activeLayerId === layer.id) setActiveLayerId?.(null);
                if (editedLayerId === layer.id) setEditedLayerId(null);
              }
            }}
          />
        ))}
      </div>

      <footer className="my-8 text-right pr-4">
        <SplitButton 
          items={[
            { label: "Add feature layer", onClick: addNewLayer },
            { label: "Add image layer", onClick: () => addNewMapLayer("ImageLayer") },
            { label: "Add TileJSON layer", onClick: () => addNewMapLayer("TileJSONLayer") },
            { label: "Add XYZ tile layer", onClick: () => addNewMapLayer("XYZLayer") }
          ]} 
        />
      </footer>
    </div>
  );
}