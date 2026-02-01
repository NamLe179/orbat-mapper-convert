"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import { draggable, dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { attachClosestEdge, extractClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";

// Types & Constants
import { 
  ScenarioLayerActions, 
  type ScenarioLayerAction, 
  type ScenarioFeatureActions 
} from "@/types/constants";
import type { NScenarioFeature, NScenarioLayer } from "@/types/internalModels";
import type { FeatureId } from "@/types/scenarioGeoModels";
import type { MenuItemData } from "@/components/types";
import { 
  getScenarioFeatureLayerDragItem, 
  idle, 
  isScenarioFeatureDragItem, 
  isScenarioFeatureLayerDragItem, 
  type ItemState 
} from "@/types/draggables";

// Hooks & Stores
import { useActiveScenario } from "@/components/injects";
import { useSelectedItems } from "@/stores/selectedStore";

// Components
import DotsMenu from "@/components/DotsMenu";
import ChevronPanel from "@/components/ChevronPanel";
import EditLayerInlineForm from "@/modules/scenarioeditor/EditLayerInlineForm";
import ScenarioFeatureListItem from "@/modules/scenarioeditor/ScenarioFeatureListItem";
import TreeDropIndicator from "@/components/TreeDropIndicator";
import DropIndicator from "@/components/DropIndicator";
import { Button } from "@/components/ui/button";
import { 
  GripVertical as DragIcon, 
  Clock as ClockIcon, 
  Eye as EyeIcon, 
  EyeOff as EyeOffIcon, 
  Star as StarIcon, 
  StarOff as StarOutlineIcon 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  layer: NScenarioLayer;
  features: NScenarioFeature[];
  activeLayerId?: FeatureId | null;
  setActiveLayerId: (id: FeatureId | null) => void;
  editedLayerId?: FeatureId | null;
  setEditedLayerId: (id: FeatureId | null) => void;
  onFeatureClick: (feature: NScenarioFeature, layer: NScenarioLayer, event: React.MouseEvent) => void;
  onFeatureDoubleClick: (feature: NScenarioFeature, layer: NScenarioLayer, event: React.MouseEvent) => void;
  onFeatureAction: (featureId: FeatureId, action: ScenarioFeatureActions) => void;
  onLayerAction: (layer: NScenarioLayer, action: ScenarioLayerAction) => void;
}

const LAYER_MENU_ITEMS: MenuItemData<ScenarioLayerAction>[] = [
  { label: "Zoom to", action: ScenarioLayerActions.Zoom },
  { label: "Set as active", action: ScenarioLayerActions.SetActive },
  { label: "Edit", action: ScenarioLayerActions.Edit },
  { label: "Move up", action: ScenarioLayerActions.MoveUp },
  { label: "Move down", action: ScenarioLayerActions.MoveDown },
  { label: "Delete", action: ScenarioLayerActions.Delete },
];

export default function ScenarioFeatureLayer({ 
  layer, 
  features, 
  activeLayerId, 
  setActiveLayerId,
  editedLayerId,
  setEditedLayerId,
  onFeatureClick,
  onFeatureDoubleClick,
  onFeatureAction,
  onLayerAction 
}: Props) {
  const { geo } = useActiveScenario();
  const { selectedFeatureIds, activeFeatureId } = useSelectedItems();

  const elRef = useRef<HTMLElement>(null);
  const handleRef = useRef<HTMLElement>(null);
  
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [itemState, setItemState] = useState<ItemState>(idle);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- Helpers ---
  const toggleFeatureVisibility = (feature: NScenarioFeature) => {
    geo.updateFeature(feature.id, { meta: { isHidden: !feature.meta.isHidden } });
  };

  const toggleLayerVisibility = (layer: NScenarioLayer) => {
    geo.updateLayer(layer.id, { isHidden: !layer.isHidden });
  };

  const updateLayerOpen = useCallback((open: boolean) => {
    geo.updateLayer(layer.id, { _isOpen: open });
  }, [geo, layer.id]);

  // --- Drag and Drop Logic ---
  useEffect(() => {
    if (!elRef.current || !handleRef.current) return;

    return combine(
      draggable({
        element: elRef.current,
        dragHandle: handleRef.current,
        getInitialData: () => getScenarioFeatureLayerDragItem({ layer }),
        onDragStart: () => setIsDragging(true),
        onDrop: () => setIsDragging(false),
      }),
      dropTargetForElements({
        element: elRef.current,
        canDrop: ({ source }) =>
          (isScenarioFeatureDragItem(source.data) && source.data.feature._pid !== layer.id) ||
          (isScenarioFeatureLayerDragItem(source.data) && source.data.layer.id !== layer.id),
        onDragEnter: ({ self }) => {
          setIsDragOver(true);
          const closestEdge = extractClosestEdge(self.data);
          setItemState({ type: "drag-over", closestEdge });
        },
        onDrag: ({ self, source }) => {
          // Auto-open layer when dragging over with a feature
          if (isScenarioFeatureDragItem(source.data) && !layer._isOpen && !timeoutRef.current) {
            timeoutRef.current = setTimeout(() => updateLayerOpen(true), 500);
          }
          if (isScenarioFeatureLayerDragItem(self.data)) {
            const closestEdge = extractClosestEdge(self.data);
            setItemState({ type: "drag-over", closestEdge });
          }
        },
        onDragLeave: () => {
          setIsDragOver(false);
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          setItemState(idle);
        },
        getData({ input, element, source }) {
          const data = getScenarioFeatureLayerDragItem({ layer });
          if (isScenarioFeatureLayerDragItem(source.data)) {
            return attachClosestEdge(data, { input, element, allowedEdges: ["top", "bottom"] });
          }
          return data;
        },
        onDrop: ({ source }) => {
          setItemState(idle);
          setIsDragOver(false);
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          if (isScenarioFeatureDragItem(source.data) && !layer._isOpen) {
            updateLayerOpen(true);
          }
        },
      })
    );
  }, [layer, updateLayerOpen]);

  return (
    <ChevronPanel
      label={layer.name}
      open={layer._isOpen}
      onOpenChange={updateLayerOpen}
      headerClass={cn("-ml-2", isDragging && "opacity-20")}
      headerRef={elRef as any}
      data-layer-id={layer.id}
    >
      {/* Left Handle */}
      <template slot="left">
        <span ref={handleRef}>
          <DragIcon className="text-muted-foreground h-6 w-6 cursor-move group-focus-within:opacity-100 group-hover:opacity-100 sm:opacity-0 transition-opacity" />
        </span>
      </template>

      {/* Label / Title */}
      <template slot="label">
        <div
          onDoubleClick={() => setActiveLayerId(layer.id)}
          className={cn(
            "cursor-pointer select-none",
            layer.isHidden && "opacity-50",
            layer.id === activeLayerId && "dark:text-army2 text-red-800 font-bold"
          )}
        >
          {layer.name}
        </div>
        
        {itemState.type === "drag-over" && itemState.closestEdge ? (
          <div className="-m-2">
            <DropIndicator edge={itemState.closestEdge} gap="0px" />
          </div>
        ) : isDragOver ? (
          <div className="-m-2">
            <TreeDropIndicator 
              instruction={{ type: "make-child", currentLevel: 0, indentPerLevel: 0 }} 
            />
          </div>
        ) : null}
      </template>

      {/* Right Actions */}
      <template slot="right">
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setActiveLayerId(layer.id)}
            className="opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 transition-opacity"
            title="Set as active layer"
          >
            {activeLayerId === layer.id ? <StarIcon className="size-5" /> : <StarOutlineIcon className="size-5" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => toggleLayerVisibility(layer)}
            className="opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 transition-opacity"
            title="Toggle layer visibility"
          >
            {layer.isHidden ? <EyeOffIcon className="size-5" /> : <EyeIcon className="size-5" />}
          </Button>

          {(layer.visibleFromT || layer.visibleUntilT) && (
            <ClockIcon className="text-muted-foreground size-5" />
          )}

          <DotsMenu
            className="opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 transition-opacity"
            items={LAYER_MENU_ITEMS}
            onAction={(action) => onLayerAction(layer, action)}
          />
        </div>
      </template>

      {/* Nested Content */}
      <div className="relative">
        

        {editedLayerId === layer.id && (
          <div className="-mt-6 -ml-5 border bg-background z-10">
            <EditLayerInlineForm
              layer={layer}
              onClose={() => setEditedLayerId(null)}
              onUpdate={(data) => geo.updateLayer(layer.id, data)}
            />
          </div>
        )}

        <ul className="-mt-6 -ml-5 space-y-1">
          {features.map((feature) => (
            <ScenarioFeatureListItem
              key={feature.id}
              feature={feature}
              layer={layer}
              selected={selectedFeatureIds.has(feature.id)}
              active={activeFeatureId === feature.id}
              onFeatureClick={(e) => onFeatureClick(feature, layer, e)}
              onFeatureDoubleClick={(e) => onFeatureDoubleClick(feature, layer, e)}
              onFeatureAction={(action) => onFeatureAction(feature.id, action)}
              onToggleVisibility={() => toggleFeatureVisibility(feature)}
            />
          ))}
        </ul>
      </div>
    </ChevronPanel>
  );
}