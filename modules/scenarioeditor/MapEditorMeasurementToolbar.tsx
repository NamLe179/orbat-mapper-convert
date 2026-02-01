"use client";

import React, { useEffect } from "react";
import {
  X as CloseIcon,
  Magnet as SnapIcon,
  Ruler as ShowSegmentsIcon,
  Circle as ShowCircleIcon,
  Copy as ShowMultipleIcon, // Hoặc dùng icon Layers
  Trash2 as TrashIcon,
  Activity as LengthIcon, // Hoặc Polyline
  Pentagon as AreaIcon,
} from "lucide-react";

// Project Imports
import FloatingPanel from "@/components/FloatingPanel";
import MainToolbarButton from "@/components/MainToolbarButton";
import { useMainToolbarStore } from "@/stores/mainToolbarStore";
import { useMapSelectStore } from "@/stores/mapSelectStore";
import { useMeasurementsStore } from "@/stores/geoStore"; 
import { useActiveMap } from "@/components/injects";
import { useMeasurementInteraction } from "@/hooks/geoMeasurement";

export default function MapEditorMeasurementToolbar() {
  // --- Contexts ---
  const map = useActiveMap();

  // --- Stores ---
  const toolbarStore = useMainToolbarStore();
  const selectStore = useMapSelectStore();
  
  // Destructure state & setters từ Measurement Store (Zustand)
  const {
    showSegments,
    setShowSegments,
    clearPrevious,
    setClearPrevious,
    measurementType,
    setMeasurementType,
    measurementUnit, // Nếu cần dùng trong UI
    snap,
    setSnap,
    showCircle,
    setShowCircle,
  } = useMeasurementsStore();

  // --- Interaction Hook ---
  // Giả định hook này trả về hàm clear và tự handle interaction lifecycle
  const { clear } = useMeasurementInteraction(map, measurementType, {
    showSegments,
    clearPrevious,
    measurementUnit,
    snap,
    showCircle,
  });

  // --- Lifecycle & Side Effects ---

  // 1. Handle Selection State (Mount/Unmount)
  useEffect(() => {
    // On Mount: Disable selection
    selectStore.setUnitSelectEnabled(false);
    selectStore.setFeatureSelectEnabled(false);

    // On Unmount: Cleanup & Re-enable selection
    return () => {
      clear(); // Clear measurements layer
      selectStore.setUnitSelectEnabled(true);
      selectStore.setFeatureSelectEnabled(true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Handle Key Press (Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        toolbarStore.clearToolbar();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toolbarStore]);

  return (
    <FloatingPanel className="pointer-events-auto flex items-center space-x-0.5 rounded-md p-1">
      <p className="text-muted-foreground px-2 text-sm font-medium">Measure</p>
      
      <MainToolbarButton
        title="Length"
        onClick={() => setMeasurementType("LineString")}
        active={measurementType === "LineString"}
      >
        <LengthIcon className="size-5" />
      </MainToolbarButton>

      <MainToolbarButton
        title="Area"
        onClick={() => setMeasurementType("Polygon")}
        active={measurementType === "Polygon"}
      >
        <AreaIcon className="size-5" />
      </MainToolbarButton>

      <div className="h-5 border-l border-gray-300" />

      <MainToolbarButton
        title="Show segment lengths"
        onClick={() => setShowSegments(!showSegments)}
        active={showSegments}
      >
        <ShowSegmentsIcon className="size-5" />
      </MainToolbarButton>

      <MainToolbarButton
        title="Show multiple measurements"
        onClick={() => setClearPrevious(!clearPrevious)}
        active={!clearPrevious}
      >
        <ShowMultipleIcon className="size-5" />
      </MainToolbarButton>

      <MainToolbarButton
        title="Show range circle"
        onClick={() => setShowCircle(!showCircle)}
        active={showCircle}
      >
        <ShowCircleIcon className="size-5" />
      </MainToolbarButton>

      <MainToolbarButton
        title="Toggle snapping"
        onClick={() => setSnap(!snap)}
        active={snap}
      >
        <SnapIcon className="size-5" />
      </MainToolbarButton>

      <MainToolbarButton 
        title="Clear measurements" 
        onClick={() => clear()}
      >
        <TrashIcon className="size-5" />
      </MainToolbarButton>

      <MainToolbarButton 
        title="Toggle toolbar" 
        onClick={() => toolbarStore.clearToolbar()}
      >
        <CloseIcon className="size-5" />
      </MainToolbarButton>
    </FloatingPanel>
  );
}