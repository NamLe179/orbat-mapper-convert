"use client";

import React, { memo, useState, useMemo, useEffect, useCallback, useRef } from "react";
import { PanelLeftOpen as ShowPanelIcon, Search as MagnifyingGlassIcon } from "lucide-react";
import { useMediaQuery } from "usehooks-ts";

// Context & Stores
import { 
  ActiveMapContext, 
  ActiveFeatureSelectInteractionContext, 
  useActiveScenario,
  useTimeModal,
} from "@/components/injects";
import { useUiStore } from "@/stores/uiStore";
import { usePlaybackStore } from "@/stores/playbackStore";
import { useSelectedItems, useSelectedStore } from "@/stores/selectedStore";
import { useMainToolbarStore } from "@/stores/mainToolbarStore";

// Components
import ScenarioMap from "@/components/ScenarioMap";
import MapTimeController from "@/components/MapTimeController";
import MapEditorMainToolbar from "./MapEditorMainToolbar";
import MapEditorMeasurementToolbar from "./MapEditorMeasurementToolbar";
import MapEditorDrawToolbar from "./MapEditorDrawToolbar";
import MapEditorUnitTrackToolbar from "./MapEditorUnitTrackToolbar";
import MapEditorDesktopPanel from "./MapEditorDesktopPanel";
import MapEditorMobilePanel from "./MapEditorMobilePanel";
import MapEditorDetailsPanel from "./MapEditorDetailsPanel";
import ScenarioFeatureDetails from "./ScenarioFeatureDetails";
import ScenarioEventDetails from "./ScenarioEventDetails";
import ScenarioMapLayerDetails from "./ScenarioMapLayerDetails";
import ScenarioInfoPanel from "./ScenarioInfoPanel";
import ScenarioTimeline from "./ScenarioTimeline";
import UnitDetails from "./UnitDetails";
import UnitBreadcrumbs from "./UnitBreadcrumbs";
import KeyboardScenarioActions from "./KeyboardScenarioActions";
import SearchScenarioActions from "./SearchScenarioActions";
import IconButton from "@/components/IconButton";
import { Button } from "@/components/ui/button";
import MainViewSlideOver from "@/components/MainViewSlideOver";

// Types
import OLMap from "ol/Map";
import Select from "ol/interaction/Select";

const FRAME_INTERVAL = 1000 / 60;

const MemoizedMapEditorDesktopPanel = memo(MapEditorDesktopPanel);
const MemoizedMapEditorDetailsPanel = memo(MapEditorDetailsPanel);
const MemoizedMapTimeController = memo(MapTimeController);

function PlaybackController({ scn }: { scn: ReturnType<typeof useActiveScenario> }) {
  const playbackRunning = usePlaybackStore((s) => s.playbackRunning);
  const playbackSpeed = usePlaybackStore((s) => s.playbackSpeed);
  const playbackLooping = usePlaybackStore((s) => s.playbackLooping);
  const startMarker = usePlaybackStore((s) => s.startMarker);
  const endMarker = usePlaybackStore((s) => s.endMarker);

  const rafRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef(0);
  const scnRef = useRef(scn);
  const playbackRunningRef = useRef(playbackRunning);
  const playbackSpeedRef = useRef(playbackSpeed);
  const playbackLoopingRef = useRef(playbackLooping);
  const startMarkerRef = useRef(startMarker);
  const endMarkerRef = useRef(endMarker);

  useEffect(() => {
    scnRef.current = scn;
  }, [scn]);

  useEffect(() => {
    playbackRunningRef.current = playbackRunning;
  }, [playbackRunning]);

  useEffect(() => {
    playbackSpeedRef.current = playbackSpeed;
  }, [playbackSpeed]);

  useEffect(() => {
    playbackLoopingRef.current = playbackLooping;
  }, [playbackLooping]);

  useEffect(() => {
    startMarkerRef.current = startMarker;
  }, [startMarker]);

  useEffect(() => {
    endMarkerRef.current = endMarker;
  }, [endMarker]);

  const updatePlayback = useCallback(() => {
    if (!playbackRunningRef.current) return;

    const now = performance.now();
    if (now - lastFrameTimeRef.current < FRAME_INTERVAL) {
      rafRef.current = requestAnimationFrame(updatePlayback);
      return;
    }
    lastFrameTimeRef.current = now;

    const scenario = scnRef.current;
    const currentTime = scenario.store.state.currentTime;

    if (
      playbackLoopingRef.current &&
      endMarkerRef.current !== undefined &&
      startMarkerRef.current !== undefined &&
      currentTime >= endMarkerRef.current
    ) {
      scenario.time.setCurrentTime(startMarkerRef.current);
    } else {
      scenario.time.setCurrentTime(currentTime + playbackSpeedRef.current);
    }

    rafRef.current = requestAnimationFrame(updatePlayback);
  }, []);

  useEffect(() => {
    if (playbackRunning) {
      lastFrameTimeRef.current = 0;
      rafRef.current = requestAnimationFrame(updatePlayback);
    } else if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playbackRunning, updatePlayback]);

  return null;
}

export default function ScenarioEditorMap({ 
  onShowSettings 
}: { onShowSettings?: () => void }) {
  const scn = useActiveScenario();
  const ui = useUiStore();
  const toolbarStore = useMainToolbarStore();
  const isMobile = useMediaQuery("(max-width: 768px)");

  // --- Refs & Shallow States ---
  const [mapInstance, setMapInstance] = useState<OLMap | null>(null);
  const [selectInteraction, setSelectInteraction] = useState<Select | null>(null);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const { getModalTimestamp } = useTimeModal();
  
  // Handler for opening settings panel
  const handleShowSettings = useCallback(() => {
    if (onShowSettings) {
      onShowSettings();
    } else {
      setShowSettingsPanel(true);
    }
  }, [onShowSettings]);

  const {
    selectedUnitIds,
    selectedFeatureIds,
    activeUnitId,
    activeScenarioEventId,
    activeMapLayerId,
    showScenarioInfo,
    activeDetailsPanel,
    clear: clearSelected,
  } = useSelectedItems();

  // --- Computed (useMemo) ---
  const showDetailsPanel = useMemo(() => {
    return !!(
      selectedFeatureIds.size ||
      selectedUnitIds.size ||
      activeScenarioEventId ||
      activeMapLayerId ||
      showScenarioInfo
    );
  }, [selectedFeatureIds, selectedUnitIds, activeScenarioEventId, activeMapLayerId, showScenarioInfo]);

  // --- Map Callbacks ---
  const onMapReady = useCallback(({ olMap, featureSelectInteraction }: { olMap: OLMap, featureSelectInteraction: Select }) => {
    setMapInstance(olMap);
    setSelectInteraction(featureSelectInteraction);
  }, []);

  // --- Cleanup ---
  useEffect(() => {
    return () => {
      useSelectedStore.getState().clear();
      usePlaybackStore.getState().togglePlayback(false);
    };
  }, []);

  // --- Handlers ---
  const openTimeDialog = async () => {
    const newTimestamp = await getModalTimestamp(scn.store.state.currentTime, {
      timeZone: scn.store.state.info.timeZone,
    });
    if (newTimestamp !== undefined) {
      scn.time.setCurrentTime(newTimestamp);
    }
  };

  return (
    <ActiveMapContext.Provider value={mapInstance}>
      <ActiveFeatureSelectInteractionContext.Provider value={selectInteraction}>
        <PlaybackController scn={scn} />
        <div className="flex flex-col h-full w-full" data-component="ScenarioEditorMap">
          {/* Map Container - takes remaining space */}
          <div className="relative flex-1 min-h-0" data-component="map-wrapper">
            {/* Map fills this container absolutely */}
            <ScenarioMap onMapReady={onMapReady} />

            {/* Left panel toggle button - positioned at top left, outside main flex container */}
            {!isMobile && !ui.showLeftPanel && (
              <Button
                variant="secondary"
                size="icon"
                onClick={() => ui.setShowLeftPanel(true)}
                className="pointer-events-auto absolute top-2 left-2 z-10"
              >
                <ShowPanelIcon className="size-7" />
              </Button>
            )}

            {/* UI Overlays - render on top of map */}
            <main className="pointer-events-none absolute inset-0 flex flex-col justify-between">
              <header className="flex flex-none items-center justify-end p-2">
                <div className="pointer-events-auto">
                  <MemoizedMapTimeController
                    showControls={isMobile ? ui.mobilePanelOpen : false}
                    onOpenTimeModal={openTimeDialog}
                    onShowSettings={handleShowSettings}
                    onIncDay={() => scn.time.add(1, "day", true)}
                    onDecDay={() => scn.time.subtract(1, "day", true)}
                    onNextEvent={scn.time.goToNextScenarioEvent}
                    onPrevEvent={scn.time.goToPrevScenarioEvent}
                  />
                </div>
                <IconButton
                  onClick={(e) => { e.stopPropagation(); ui.setSearchGeoMode(true); ui.setShowSearch(true); }}
                  className="pointer-events-auto ml-2"
                  title="Search"
                >
                  <MagnifyingGlassIcon className="text-muted-foreground h-5 w-5" />
                </IconButton>
              </header>

              {/* Left Panel - absolute positioned at top-left */}
              {!isMobile && ui.showLeftPanel && (
                <div className="absolute top-2 left-2 pointer-events-auto">
                  <MemoizedMapEditorDesktopPanel onClose={() => ui.setShowLeftPanel(false)} />
                </div>
              )}

              {/* Details Panel - absolute positioned at top-right, below header */}
              {showDetailsPanel && (
                <div className="absolute top-20 right-2 pointer-events-auto">
                  <MemoizedMapEditorDetailsPanel onClose={clearSelected}>
                    {activeDetailsPanel === "feature" && <ScenarioFeatureDetails selectedIds={new Set(Array.from(selectedFeatureIds).map(id => id.toString()))} />}
                    {activeDetailsPanel === "unit" && <UnitDetails unitId={activeUnitId || Array.from(selectedUnitIds)[0]} />}
                    {activeDetailsPanel === "event" && <ScenarioEventDetails eventId={activeScenarioEventId!} />}
                    {activeDetailsPanel === "mapLayer" && <ScenarioMapLayerDetails layerId={activeMapLayerId!} />}
                    {activeDetailsPanel === "scenario" && <ScenarioInfoPanel />}
                  </MemoizedMapEditorDetailsPanel>
                </div>
              )}
            </main>

            {isMobile && (
              <>
                {ui.showOrbatBreadcrumbs && <UnitBreadcrumbs />}
                <MapEditorMobilePanel
                  onOpenTimeModal={openTimeDialog}
                  onShowSettings={handleShowSettings}
                  onIncDay={() => scn.time.add(1, "day", true)}
                  onDecDay={() => scn.time.subtract(1, "day", true)}
                  onNextEvent={scn.time.goToNextScenarioEvent}
                  onPrevEvent={scn.time.goToPrevScenarioEvent}
                />
              </>
            )}

            {mapInstance && <KeyboardScenarioActions />}
            {mapInstance && <SearchScenarioActions />}
            
            {/* Toolbar overlay on map */}
            {ui.showToolbar && (
              <div className="absolute bottom-0 left-0 right-0 pointer-events-none flex flex-col items-center p-2 gap-2">
                {/* Sub-toolbars - render first so they appear above */}
                {toolbarStore.currentToolbar === "measurements" && (
                  <div className="pointer-events-auto">
                    <MapEditorMeasurementToolbar />
                  </div>
                )}
                {toolbarStore.currentToolbar === "draw" && (
                  <div className="pointer-events-auto">
                    <MapEditorDrawToolbar />
                  </div>
                )}
                {toolbarStore.currentToolbar === "track" && (
                  <div className="pointer-events-auto">
                    <MapEditorUnitTrackToolbar />
                  </div>
                )}
                
                {/* Main toolbar */}
                <div className="pointer-events-auto">
                  <MapEditorMainToolbar
                    onOpenTimeModal={openTimeDialog}
                    onShowSettings={handleShowSettings}
                    onIncDay={() => scn.time.add(1, "day", true)}
                    onDecDay={() => scn.time.subtract(1, "day", true)}
                    onNextEvent={scn.time.goToNextScenarioEvent}
                    onPrevEvent={scn.time.goToPrevScenarioEvent}
                  />
                </div>
              </div>
            )}
          </div>
          
          {/* Breadcrumb - outside map, below it */}
          {ui.showOrbatBreadcrumbs && !isMobile && (
            <div className="flex-none">
              <UnitBreadcrumbs />
            </div>
          )}
          
          {/* Timeline - outside map, at bottom */}
          {ui.showTimeline && (
            <div className="flex-none">
              <ScenarioTimeline />
            </div>
          )}
        </div>
      </ActiveFeatureSelectInteractionContext.Provider>
      
      {/* Settings Panel Slide-over */}
      <MainViewSlideOver
        open={showSettingsPanel}
        onOpenChange={setShowSettingsPanel}
      />
    </ActiveMapContext.Provider>
  );
}