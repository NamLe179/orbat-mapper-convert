"use client";

import React, { useState, useEffect } from "react";
import OLMap from "ol/Map";
import VectorLayer from "ol/layer/Vector";
import Select from "ol/interaction/Select";
import { 
  Lock, 
  LockOpen, 
  MousePointer2, 
  MapPin, 
  Activity, // Thay cho VectorLine
  Triangle, 
  Circle as CircleIcon, 
  Edit, 
  Trash2 
} from "lucide-react";

import ToolbarButton from "./ToolbarButton";
import VerticalToolbar from "./VerticalToolbar";
import { useEditingInteraction } from "@/hooks/geoEditing"; 
import { useUiStore } from "@/stores/uiStore";

interface MapEditToolbarProps {
  olMap: OLMap;
  layer: VectorLayer<any>;
  select?: Select;
  deleteEnabled?: boolean;
  
  // Events
  onAdd?: (feature: any) => void;
  onModify?: (feature: any) => void;
  onDelete?: () => void;
}

export default function MapEditToolbar({
  olMap,
  layer,
  select,
  deleteEnabled = false,
  onAdd,
  onModify,
  onDelete,
}: MapEditToolbarProps) {
  
  const uiStore = useUiStore();
  
  // useToggle -> useState
  const [addMultiple, setAddMultiple] = useState(false);

  // Hook tương tác bản đồ (Custom Hook)
  // Lưu ý: Trong React, 'layer' được truyền trực tiếp, hook cần handle dependency updates.
  const {
    startDrawing,
    currentDrawType,
    startModify,
    isModifying,
    cancel,
    isDrawing,
  } = useEditingInteraction(olMap, layer, {
    // Adapter cho events
    emit: (event: string, ...args: any[]) => {
      if (event === "add") onAdd?.(args[0]);
      if (event === "modify") onModify?.(args[0]);
      if (event === "delete") onDelete?.();
    },
    addMultiple,
    select,
  });

  // Watcher: Sync UI Store state
  useEffect(() => {
    const isActive = isDrawing || isModifying;
    
    // Kiểm tra xem store là mutable (Valtio) hay Zustand (setter)
    // @ts-ignore
    if (uiStore.setEditToolbarActive) uiStore.setEditToolbarActive(isActive);
    // @ts-ignore
    else uiStore.editToolbarActive = isActive;

  }, [isDrawing, isModifying, uiStore]);

  // Handle Escape Key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        cancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cancel]);

  const toggleAddMultiple = () => setAddMultiple((prev) => !prev);

  return (
    <div className="flex flex-col">
      <VerticalToolbar className="shadow-sm">
        <ToolbarButton
          top
          onClick={toggleAddMultiple}
          title="Keep selected tool active after drawing"
        >
          {addMultiple ? (
            <Lock className="h-5 w-5" />
          ) : (
            <LockOpen className="h-5 w-5" />
          )}
        </ToolbarButton>

        <ToolbarButton
          title="Select features"
          onClick={() => cancel()}
          active={!currentDrawType}
        >
          <MousePointer2 className="h-5 w-5" />
        </ToolbarButton>

        <ToolbarButton
          title="Draw point feature"
          onClick={() => startDrawing("Point")}
          active={currentDrawType === "Point"}
        >
          <MapPin className="h-5 w-5" />
        </ToolbarButton>

        <ToolbarButton
          title="Draw polyline"
          onClick={() => startDrawing("LineString")}
          active={currentDrawType === "LineString"}
        >
          <Activity className="h-5 w-5" />
        </ToolbarButton>

        <ToolbarButton
          title="Draw polygon"
          onClick={() => startDrawing("Polygon")}
          active={currentDrawType === "Polygon"}
        >
          <Triangle className="h-5 w-5" />
        </ToolbarButton>

        <ToolbarButton
          bottom
          title="Draw circle"
          onClick={() => startDrawing("Circle")}
          active={currentDrawType === "Circle"}
        >
          <CircleIcon className="h-5 w-5" />
        </ToolbarButton>
      </VerticalToolbar>

      <VerticalToolbar className="mt-2 shadow-sm">
        <ToolbarButton
          top
          title="Modify feature"
          onClick={() => startModify()}
          active={isModifying}
        >
          <Edit className="h-5 w-5" />
        </ToolbarButton>

        <ToolbarButton
          bottom
          title="Delete feature"
          disabled={!deleteEnabled}
          onClick={onDelete}
        >
          <Trash2 className="h-5 w-5" />
        </ToolbarButton>
      </VerticalToolbar>
    </div>
  );
}