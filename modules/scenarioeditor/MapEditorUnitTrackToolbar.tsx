"use client";

import React from "react";
import {
  X as CloseIcon,
  Edit as EditIcon,
  Route as ShowPathIcon, // Hoặc dùng icon Footprints
  Clock as IconTimelineClockOutline,
} from "lucide-react";

// Components
import FloatingPanel from "@/components/FloatingPanel";
import MainToolbarButton from "@/components/MainToolbarButton";

// Stores
import { useMainToolbarStore } from "@/stores/mainToolbarStore";
import { useUnitSettingsStore } from "@/stores/geoStore";

export default function MapEditorUnitTrackToolbar() {
  // --- Stores ---
  const toolbarStore = useMainToolbarStore();

  // Giả định UnitSettingsStore đã convert sang Zustand với các setters tương ứng
  const {
    showHistory,
    setShowHistory,
    editHistory,
    setEditHistory,
    showWaypointTimestamps,
    setShowWaypointTimestamps,
  } = useUnitSettingsStore();

  return (
    <FloatingPanel className="pointer-events-auto flex items-center space-x-1 rounded-md p-1">
      <p className="text-muted-foreground px-2 text-sm font-medium">Track</p>
      
      {/* Separator */}
      <div className="border-border h-5 border-l" />

      {/* Show History Toggle */}
      <MainToolbarButton
        title="Show unit track"
        onClick={() => setShowHistory(!showHistory)}
        active={showHistory}
      >
        <ShowPathIcon className="size-5" />
      </MainToolbarButton>

      {/* Edit History Toggle */}
      <MainToolbarButton
        title="Edit track"
        onClick={() => setEditHistory(!editHistory)}
        active={editHistory}
      >
        <EditIcon className="size-5" />
      </MainToolbarButton>

      {/* Show Timestamps Toggle */}
      <MainToolbarButton
        title="Show timestamps"
        onClick={() => setShowWaypointTimestamps(!showWaypointTimestamps)}
        active={showWaypointTimestamps}
      >
        <IconTimelineClockOutline className="size-5" />
      </MainToolbarButton>

      {/* Close Toolbar */}
      <MainToolbarButton 
        title="Toggle toolbar" 
        onClick={() => toolbarStore.clearToolbar()}
      >
        <CloseIcon className="size-5" />
      </MainToolbarButton>
    </FloatingPanel>
  );
}