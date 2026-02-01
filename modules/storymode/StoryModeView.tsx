"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { fromLonLat } from "ol/proj";
import OLMap from "ol/Map";
import { Bars3Icon as MenuIcon, XMarkIcon as XIcon } from "@heroicons/react/24/outline";
import { useDocumentTitle } from "usehooks-ts";

// Types & Config
import type { TScenario } from "@/scenariostore";
import { chapter, type StoryStateChange } from "@/testdata/testStory";

// Contexts
import { ActiveScenarioContext, ActiveFeatureStylesContext } from "@/components/injects";

// Hooks & Stores
import { useUnitLayer } from "@/hooks/geoUnitLayers";
import { useFeatureStyles } from "@/geo/featureStyles";
import { useScenarioFeatureLayers } from "@/modules/scenarioeditor/scenarioFeatureLayers";
import { useMapSettingsStore } from "@/stores/mapSettingsStore";
import { clearUnitStyleCache } from "@/geo/unitStyles";
import { flyTo } from "@/geo/layers";

// Components
import MapContainer from "@/components/MapContainer";
import StoryModeContent from "./StoryModeContent";
import SlideOver from "@/components/SlideOver";
import NumberInputGroup from "@/components/NumberInputGroup";
import MeasurementToolbar from "@/components/MeasurementToolbar";

dayjs.extend(utc);

interface StoryModeViewProps {
  activeScenario: TScenario;
}

export default function StoryModeView({ activeScenario }: StoryModeViewProps) {
  // --- Refs & State ---
  const mapRef = useRef<OLMap | null>(null);
  const [mapIsReady, setMapIsReady] = useState(false);
  const [sidebarIsOpen, setSidebarIsOpen] = useState(false);

  // --- Context Providers Data ---
  const scnFeatures = useFeatureStyles(activeScenario.geo);
  const { state } = activeScenario.store;
  const settingsStore = useMapSettingsStore();

  // --- Window Title ---
  useDocumentTitle(state.info.name || "Story Mode");

  // --- Map Hooks ---
  const { unitLayer, drawUnits } = useUnitLayer(mapRef.current);

  // --- Lifecycle: On Mounted ---
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // --- Map Logic ---
  const onMapReady = (olMap: OLMap) => {
    mapRef.current = olMap;
    setMapIsReady(true);

    const view = olMap.getView();
    const { center, ...rest } = chapter.view;
    const time = dayjs.utc(chapter.startTime);

    activeScenario.time.setCurrentTime(time.valueOf());

    // Load feature layers
    const { initializeFeatureLayersFromStore: loadScenarioLayers } = useScenarioFeatureLayers(olMap);
    loadScenarioLayers();

    olMap.addLayer(unitLayer);
    drawUnits();

    // Tương đương watch currentTime
    const unsubscribe = activeScenario.store.subscribe(() => {
      loadScenarioLayers();
    });

    view.animate({
      ...rest,
      center: fromLonLat(center, view.getProjection()),
      duration: 0,
    });

    return () => unsubscribe();
  };

  // --- Story State Management ---
  const onUpdateState = async (storyState: StoryStateChange) => {
    if (storyState.time) {
      const timeValue = dayjs.utc(storyState.time).valueOf();
      activeScenario.time.setCurrentTime(timeValue);
      drawUnits();
    }

    if (storyState.view && mapRef.current) {
      const view = mapRef.current.getView();
      const { center, zoom, duration } = storyState.view;

      if (center) {
        await flyTo(view, {
          location: fromLonLat(center, view.getProjection()),
          zoom,
          duration,
        });
      }
    }
    console.log("On update state", storyState);
  };

  // --- Sync Map Settings ---
  useEffect(() => {
    clearUnitStyleCache();
    drawUnits();
  }, [settingsStore.mapIconSize, drawUnits]);

  return (
    <ActiveScenarioContext.Provider value={activeScenario}>
      <ActiveFeatureStylesContext.Provider value={scnFeatures}>
        <div className="pt-4 md:flex md:h-screen md:flex-col relative">
          <p className="absolute inset-x-0 top-0 h-4 border-b bg-amber-200 text-center text-xs text-amber-700 z-50">
            Test
          </p>

          <header className="bg-muted relative w-full p-4 md:shrink-0">
            <h1 className="text-xl font-bold">{state.info.name}</h1>
            <button
              type="button"
              onClick={() => setSidebarIsOpen(!sidebarIsOpen)}
              className="bg-opacity-75 text-muted-foreground hover:text-muted-foreground focus:ring-ring bg-background hover:bg-muted fixed top-2 right-4 z-20 inline-flex items-center justify-center rounded-md p-2 focus:ring-2 focus:ring-offset-2 focus:outline-none"
            >
              <span className="sr-only">Open main menu</span>
              {!sidebarIsOpen ? (
                <MenuIcon className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <XIcon className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </header>

          

          <div className="md:flex md:min-h-0 md:flex-auto">
            <section className="bg-background sticky top-0 z-10 h-[45vh] w-full shadow-md md:static md:h-full md:shadow-none">
              <MapContainer onReady={onMapReady} />
              {mapRef.current && (
                <div className="absolute bottom-2 left-2">
                  <MeasurementToolbar olMap={mapRef.current} />
                </div>
              )}
            </section>

            <section className="bg-muted/50 w-full overflow-auto border md:max-w-sm lg:max-w-lg">
              <StoryModeContent onUpdateState={onUpdateState} />
            </section>
          </div>

          <SlideOver 
            open={sidebarIsOpen} 
            onOpenChange={setSidebarIsOpen} 
            title="Settings"
          >
            <NumberInputGroup 
              label="Symbol size" 
              value={settingsStore.mapIconSize}
              onValueChange={(val) => settingsStore.setMapIconSize(val)}
            />
          </SlideOver>
        </div>
      </ActiveFeatureStylesContext.Provider>
    </ActiveScenarioContext.Provider>
  );
}