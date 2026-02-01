"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  GripVertical as IconDrag,
  Eye as IconEye,
  EyeOff as IconEyeOff,
  Clock as IconClockOutline,
  MapPin,
  Activity,
  Pentagon,
  Circle,
} from "lucide-react";
import {
  draggable,
  dropTargetForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import {
  attachClosestEdge,
  extractClosestEdge,
  type Edge,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";

// Project Imports
import DotsMenu from "@/components/DotsMenu";
import DropIndicator from "@/components/DropIndicator";
import {
  featureMenuItems,
  // getGeometryIcon, // Thay thế bằng logic icon nội bộ hoặc component đã convert
} from "@/modules/scenarioeditor/featureLayerUtils";
import type { ScenarioFeatureActions } from "@/types/constants";
import type { NScenarioFeature } from "@/types/internalModels";
import {
  getScenarioFeatureDragItem,
  idle,
  isScenarioFeatureDragItem,
  type ItemState,
} from "@/types/draggables";
import { cn } from "@/lib/utils";

// --- Helper Component cho Geometry Icon ---
const FeatureIcon = ({ feature, className }: { feature: NScenarioFeature; className?: string }) => {
  const type = feature.geometry?.type;
  // Check for circle in meta or properties (OpenLayers specific)
  const isCircle = feature.meta?.type === "Circle" || (feature as any).properties?.type === "Circle";
  
  if (isCircle) return <Circle className={className} />;
  if (type === "Point" || type === "MultiPoint") return <MapPin className={className} />;
  if (type === "LineString" || type === "MultiLineString") return <Activity className={className} />;
  if (type === "Polygon" || type === "MultiPolygon") return <Pentagon className={className} />;
  return <MapPin className={className} />;
};

// --- Main Component ---

interface ScenarioFeatureListItemProps {
  feature: NScenarioFeature;
  layer: any;
  selected?: boolean;
  active?: boolean;
  
  // Events
  onFeatureClick?: (e: React.MouseEvent) => void;
  onFeatureDoubleClick?: (e: React.MouseEvent) => void;
  onFeatureAction?: (action: ScenarioFeatureActions) => void;
  onToggleVisibility?: () => void;
}

export default function ScenarioFeatureListItem({
  feature,
  layer,
  selected = false,
  active = false,
  onFeatureClick,
  onFeatureDoubleClick,
  onFeatureAction,
  onToggleVisibility,
}: ScenarioFeatureListItemProps) {
  // --- Refs & State ---
  const elementRef = useRef<HTMLLIElement>(null);
  const handleRef = useRef<HTMLSpanElement>(null);
  const [itemState, setItemState] = useState<ItemState>(idle);

  // --- Logic ---
  const hidden = layer.isHidden || feature._hidden;

  // --- Drag & Drop Effect ---
  useEffect(() => {
    const element = elementRef.current;
    const handle = handleRef.current;
    
    if (!element || !handle) return;

    const cleanup = combine(
      draggable({
        element,
        dragHandle: handle,
        getInitialData: () => getScenarioFeatureDragItem({ feature }),
        onDragStart: () => setItemState({ type: "dragging" }),
        onDrop: () => setItemState(idle),
      }),
      dropTargetForElements({
        element,
        onDragEnter: ({ self }) => {
          const closestEdge = extractClosestEdge(self.data);
          setItemState({ type: "drag-over", closestEdge });
        },
        onDragLeave: () => setItemState(idle),
        canDrop: ({ source }) => {
          const data = source.data;
          if (!isScenarioFeatureDragItem(data)) return false;
          // Prevent dropping on itself
          return data.feature.id !== feature.id;
        },
        getData: ({ input, element }) => {
          const data = getScenarioFeatureDragItem({ feature });
          return attachClosestEdge(data, {
            input,
            element,
            allowedEdges: ["top", "bottom"],
          });
        },
        onDrag({ self }) {
          const closestEdge = extractClosestEdge(self.data);
          // Only update state if edge changes to avoid excessive re-renders
          setItemState((prev) => {
             if (prev.type === 'drag-over' && prev.closestEdge === closestEdge) return prev;
             return { type: "drag-over", closestEdge: closestEdge };
          });
        },
        onDrop: () => {
          setItemState(idle);
        },
      })
    );

    return cleanup;
  }, [feature]);

  // --- Render ---
  return (
    <li
      ref={elementRef}
      className={cn(
        "group hover:bg-accent relative flex items-center justify-between border-l select-none",
        itemState.type === "drag-over"
          ? "bg-muted"
          : selected
            ? "border-yellow-500 bg-yellow-100 dark:bg-yellow-900"
            : "border-transparent",
        itemState.type === "dragging" ? "opacity-20" : ""
      )}
      data-feature-id={feature.id}
    >
      {/* Drag Handle */}
      <span ref={handleRef}>
        <IconDrag className="text-muted-foreground h-6 w-6 cursor-move group-focus-within:opacity-100 group-hover:opacity-100 sm:opacity-0" />
      </span>

      {/* Main Click Area */}
      <button
        type="button"
        onClick={onFeatureClick}
        onDoubleClick={onFeatureDoubleClick}
        className="flex flex-auto items-center py-2.5 sm:py-2"
      >
        <FeatureIcon feature={feature} className="text-muted-foreground size-5" />
        
        <span
          className={cn(
            "group-hover:text-accent-foreground text-foreground ml-2 text-left text-sm",
            active && "font-bold",
            hidden && "opacity-50"
          )}
        >
          {feature.meta.name || feature.type || feature.geometry.type}
        </span>
      </button>

      {/* Right Side Actions */}
      <div className="relative flex items-center">
        {/* Toggle Visibility */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisibility?.();
          }}
          className="text-muted-foreground hover:text-foreground mr-1 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 transition-opacity"
          title="Toggle visibility"
        >
          {feature.meta.isHidden ? (
            <IconEyeOff className="size-5" />
          ) : (
            <IconEye className="size-5" />
          )}
        </button>

        {/* Time Indicator */}
        {(feature.meta.visibleFromT !== undefined || feature.meta.visibleUntilT !== undefined) && (
          <IconClockOutline className="text-muted-foreground h-5 w-5" />
        )}

        {/* Dots Menu */}
        <div className="opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 transition-opacity">
          <DotsMenu
            items={featureMenuItems}
            onAction={onFeatureAction}
          />
        </div>
      </div>

      {/* Drop Indicator */}
      {itemState.type === "drag-over" && itemState.closestEdge && (
        <DropIndicator edge={itemState.closestEdge} gap="0px" />
      )}
    </li>
  );
}