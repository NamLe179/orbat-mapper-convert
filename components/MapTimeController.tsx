"use client";

import React from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Settings,
  SkipBack,
  SkipForward,
} from "lucide-react";

import BaseToolbar from "./BaseToolbar";
import ToolbarButton from "./ToolbarButton";
import { useActiveScenario } from "@/components/injects";
import { useTimeFormatters } from "@/stores/timeFormatStore";
import { useStore } from "zustand";
// import { useUiStore } from "@/stores/uiStore"; // Import nếu cần dùng logic khác

interface MapTimeControllerProps {
  showControls?: boolean;
  hideTime?: boolean;
  
  // Events
  onOpenTimeModal?: () => void;
  onIncDay?: () => void;
  onDecDay?: () => void;
  onNextEvent?: () => void;
  onPrevEvent?: () => void;
  onShowSettings?: () => void;
}

export default function MapTimeController({
  showControls = true,
  hideTime = false,
  onOpenTimeModal,
  onIncDay,
  onDecDay,
  onNextEvent,
  onPrevEvent,
  onShowSettings,
}: MapTimeControllerProps) {
  
  // Hooks
  const { store } = useActiveScenario();
  const { scenarioFormatter } = useTimeFormatters();
  // const uiStore = useUiStore(); // Chưa dùng trong template gốc

  // Subscribe trực tiếp để cập nhật UI theo timeline/playback.
  const currentTime = useStore(store._store, (s) => s.currentTime);

  return (
    <div className="flex items-center space-x-2">
      {!hideTime && (
        <p
          className="pointer-events-none font-mono text-xl font-bold sm:text-2xl"
          style={{ textShadow: "white 0 0 5px" }}
        >
          {scenarioFormatter.format(currentTime)}
        </p>
      )}

      {showControls && (
        <BaseToolbar>
          <ToolbarButton onClick={onShowSettings} start>
            <span className="sr-only">Show settings</span>
            <Settings className="h-5 w-5" aria-hidden="true" />
          </ToolbarButton>

          <ToolbarButton onClick={onOpenTimeModal}>
            <span className="sr-only">Select time and date</span>
            <Calendar className="h-5 w-5" aria-hidden="true" />
          </ToolbarButton>

          <ToolbarButton type="button" onClick={onDecDay}>
            <span className="sr-only">Previous</span>
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </ToolbarButton>

          <ToolbarButton onClick={onIncDay}>
            <span className="sr-only">Next</span>
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </ToolbarButton>

          <ToolbarButton onClick={onPrevEvent}>
            <span className="sr-only">Previous Event</span>
            <SkipBack className="h-5 w-5" aria-hidden="true" />
          </ToolbarButton>

          <ToolbarButton onClick={onNextEvent} end>
            <span className="sr-only">Next Event</span>
            <SkipForward className="h-5 w-5" aria-hidden="true" />
          </ToolbarButton>
        </BaseToolbar>
      )}
    </div>
  );
}