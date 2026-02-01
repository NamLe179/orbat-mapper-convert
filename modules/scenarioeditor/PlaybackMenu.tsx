"use client";

import React from "react";
import {
  ChevronDown,
  Clock,
  Pause,
  Play,
  FastForward,
  Rewind,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

import { usePlaybackStore } from "@/stores/playbackStore";
import { useTimeFormatters } from "@/stores/timeFormatStore";
import { useActiveScenario } from "@/components/injects";

export default function PlaybackMenu() {
  // --- Stores & Hooks ---
  const { store } = useActiveScenario();
  const tm = useTimeFormatters();
  const playback = usePlaybackStore();

  // --- Helpers for Marker Count Display ---
  const markerCount = () => {
    if (playback.startMarker && playback.endMarker) return 2;
    if (playback.startMarker || playback.endMarker) return 1;
    return 0;
  };

  return (
    <div className="bg-muted-foreground/20 dark:bg-muted-foreground/30 flex items-center rounded-lg px-1">
      {/* Play/Pause Button */}
      <Button
        variant="ghost"
        size="icon"
        title="Undo action (ctrl+z)" // Note: Original title was "Undo action" but functionality is Play/Pause. Kept original for fidelity, but consider changing to "Play/Pause"
        onClick={() => playback.togglePlayback()}
      >
        {playback.playbackRunning ? (
          <Pause className="h-6 w-6" />
        ) : (
          <Play className="h-6 w-6" />
        )}
      </Button>

      {/* Dropdown Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:bg-muted hover:text-foreground focus:ring-ring h-auto w-auto p-1.5 focus:ring-2 focus:outline-hidden focus:ring-inset disabled:opacity-50 sm:block"
          >
            <ChevronDown className="h-6 w-6" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent sideOffset={10} className="w-56">
          {/* Play/Pause Item */}
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              playback.togglePlayback();
            }}
          >
            {playback.playbackRunning ? (
              <Pause className="mr-2 h-4 w-4" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            <span>{playback.playbackRunning ? "Pause" : "Play"}</span>
            <DropdownMenuShortcut>k, alt+p</DropdownMenuShortcut>
          </DropdownMenuItem>

          {/* Speed Up */}
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              playback.increaseSpeed();
            }}
          >
            <FastForward className="mr-2 h-4 w-4" />
            <span>Speed up</span>
            <DropdownMenuShortcut>&gt;</DropdownMenuShortcut>
          </DropdownMenuItem>

          {/* Slow Down */}
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              playback.decreaseSpeed();
            }}
          >
            <Rewind className="mr-2 h-4 w-4" />
            <span>Slow down</span>
            <DropdownMenuShortcut>&lt;</DropdownMenuShortcut>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Loop Toggle */}
          <DropdownMenuCheckboxItem
            checked={playback.playbackLooping}
            onCheckedChange={(checked) => playback.toggleLooping?.(checked)} 
            onSelect={(e) => e.preventDefault()}
          >
            Loop playback
          </DropdownMenuCheckboxItem>

          {/* Add Marker */}
          <DropdownMenuItem
            inset
            onSelect={(e) => {
              e.preventDefault();
              // Assuming store.state.currentTime is accessible here
              if (store.state?.currentTime !== undefined) {
                playback.addMarker(store.state.currentTime);
              }
            }}
          >
            Add marker
            <span className="ml-1">({markerCount()} / 2)</span>
          </DropdownMenuItem>

          {/* Clear Markers */}
          <DropdownMenuItem
            inset
            onSelect={(e) => {
              e.preventDefault();
              playback.clearMarkers();
            }}
            disabled={!playback.startMarker && !playback.endMarker}
          >
            Clear markers
          </DropdownMenuItem>

          {/* Start Marker Display */}
          {playback.startMarker !== undefined && (
            <DropdownMenuItem disabled>
              <Clock className="mr-2 h-4 w-4" />
              <span>{tm.scenarioFormatter.format(playback.startMarker)}</span>
            </DropdownMenuItem>
          )}

          {/* End Marker Display */}
          {playback.endMarker !== undefined && (
            <DropdownMenuItem disabled>
              <Clock className="mr-2 h-4 w-4" />
              <span>{tm.scenarioFormatter.format(playback.endMarker)}</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}