"use client";

import React, { useRef, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import { ChevronLast as ChevronDoubleUp } from "lucide-react";

// UI Components
import { TabsContent } from "@/components/ui/tabs";
import CloseButton from "@/components/CloseButton";
import IconButton from "@/components/IconButton";
import MapTimeController from "@/components/MapTimeController";
import ScrollTabs from "@/components/ScrollTabs";

// Panels
import ScenarioEventsPanel from "@/modules/scenarioeditor/ScenarioEventsPanel";
import ScenarioInfoPanel from "@/modules/scenarioeditor/ScenarioInfoPanel";
import ScenarioFeatureDetails from "@/modules/scenarioeditor/ScenarioFeatureDetails";
import OrbatPanel from "@/modules/scenarioeditor/OrbatPanel";
import ScenarioLayersTabPanel from "@/modules/scenarioeditor/ScenarioLayersTabPanel";
import ScenarioMapLayerDetails from "@/modules/scenarioeditor/ScenarioMapLayerDetails";
import ScenarioEventDetails from "@/modules/scenarioeditor/ScenarioEventDetails";
import UnitDetails from "@/modules/scenarioeditor/UnitDetails";
import ScenarioSettingsPanel from "@/modules/scenarioeditor/ScenarioSettingsPanel";

// Hooks & Stores
import { useUiStore } from "@/stores/uiStore";
import { useSelectedItems } from "@/stores/selectedStore";
import { cn } from "@/lib/utils";

// Lazy loading component
const ScenarioFiltersTabPanel = dynamic(
  () => import("@/modules/scenarioeditor/ScenarioFiltersTabPanel"),
  { ssr: false }
);

interface Props {
  onOpenTimeModal: () => void;
  onIncDay: () => void;
  onDecDay: () => void;
  onNextEvent: () => void;
  onPrevEvent: () => void;
  onShowSettings: () => void;
}

export default function MapEditorMobilePanel({
  onOpenTimeModal,
  onIncDay,
  onDecDay,
  onNextEvent,
  onPrevEvent,
  onShowSettings,
}: Props) {
  // --- Stores ---
  const { 
    mobilePanelOpen, 
    setMobilePanelOpen, 
    activeTabIndex, 
    setActiveTabIndex 
  } = useUiStore();

  const {
    selectedFeatureIds,
    selectedUnitIds,
    activeUnitId,
    activeScenarioEventId,
    activeMapLayerId,
    activeDetailsPanel,
  } = useSelectedItems();

  // --- Swipe Logic ---
  const swipeRef = useRef<HTMLDivElement>(null);
  
  // TODO: Implement touch/swipe logic with native touch events
  // const { isSwiping, directionX, directionY } = useSwipe(swipeRef as any);

  // useEffect(() => {
  //   if (isSwiping) {
  //     if (directionY === "up" && !mobilePanelOpen) setMobilePanelOpen(true);
  //     if (directionY === "down" && mobilePanelOpen) setMobilePanelOpen(false);
  //   }
  // }, [isSwiping, directionY, mobilePanelOpen, setMobilePanelOpen]);

  // --- Computed ---
  const activeTabIndexString = useMemo(
    () => activeTabIndex.toString(),
    [activeTabIndex]
  );

  return (
    <main 
      ref={swipeRef}
      className={cn(
        "overflow-auto transition-all duration-300 ease-in-out bg-background border-t shadow-2xl",
        mobilePanelOpen ? "h-1/2" : "h-12"
      )}
    >
      

      {/* Header / Bar khi panel đóng */}
      {!mobilePanelOpen && (
        <div className="flex h-full items-center px-2">
          <div
            className="relative flex flex-1 items-center justify-center cursor-pointer"
            onClick={() => setMobilePanelOpen(true)}
          >
            <IconButton>
              <ChevronDoubleUp className="h-6 w-6" />
            </IconButton>
          </div>

          <div className="flex-none">
            <MapTimeController
              hideTime
              onOpenTimeModal={onOpenTimeModal}
              onShowSettings={onShowSettings}
              onDecDay={onDecDay}
              onIncDay={onIncDay}
              onNextEvent={onNextEvent}
              onPrevEvent={onPrevEvent}
            />
          </div>
        </div>
      )}

      {/* Tab Content khi panel mở */}
      <ScrollTabs
        value={activeTabIndexString}
        onValueChange={(v) => setActiveTabIndex(parseInt(v))}
        items={[
          { label: 'ORBAT', value: '0' },
          { label: 'Events', value: '1' },
          { label: 'Layers', value: '2' },
          { label: 'Settings', value: '3' },
          { label: 'Filter', value: '4' },
          { label: 'Details', value: '5' }
        ]}
        className={cn(!mobilePanelOpen && "hidden")}
        rightContent={(
          <CloseButton onClick={() => setMobilePanelOpen(false)} className="px-6" />
        )}
      >
        <TabsContent value="0" className="mt-0 h-full pb-10">
          <OrbatPanel />
        </TabsContent>

        <TabsContent value="1" className="mt-0 p-4 pb-10">
          <ScenarioEventsPanel />
        </TabsContent>

        <TabsContent value="2" className="mt-0 p-4 pb-10">
          <ScenarioLayersTabPanel />
        </TabsContent>

        <TabsContent value="3" className="mt-0 p-4 pb-10">
          <ScenarioSettingsPanel />
        </TabsContent>

        <TabsContent value="4" className="mt-0">
          <ScenarioFiltersTabPanel />
        </TabsContent>

        <TabsContent value="5" className="mt-0 pb-10">
          {activeDetailsPanel === 'unit' && (
            <div className="p-4">
              <UnitDetails
                unitId={activeUnitId || Array.from(selectedUnitIds)[0]}
              />
            </div>
          )}
          {activeDetailsPanel === 'feature' && (
            <div className="p-4">
              <ScenarioFeatureDetails
                selectedIds={new Set(Array.from(selectedFeatureIds).map(id => id.toString()))}
              />
            </div>
          )}
          {activeDetailsPanel === 'event' && (
            <div className="p-4">
              <ScenarioEventDetails
                eventId={activeScenarioEventId!}
              />
            </div>
          )}
          {activeDetailsPanel === 'mapLayer' && (
            <div className="p-4">
              <ScenarioMapLayerDetails
                layerId={activeMapLayerId!}
              />
            </div>
          )}
          {activeDetailsPanel === 'scenario' && (
            <div className="p-4">
              <ScenarioInfoPanel />
            </div>
          )}
        </TabsContent>
      </ScrollTabs>
    </main>
  );
}