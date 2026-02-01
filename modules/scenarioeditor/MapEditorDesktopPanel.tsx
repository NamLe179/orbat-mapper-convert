"use client";

import React, { useEffect, useMemo } from "react";
import dynamic from "next/dynamic";

// UI Components (Shadcn/Custom)
import { TabsContent } from "@/components/ui/tabs";
import ScrollTabs from "@/components/ScrollTabs";
import CloseButton from "@/components/CloseButton";
import PanelResizeHandle from "@/components/PanelResizeHandle";

// Logic Panels
import ScenarioEventsPanel from "@/modules/scenarioeditor/ScenarioEventsPanel";
import OrbatPanel from "@/modules/scenarioeditor/OrbatPanel";
import ScenarioLayersTabPanel from "@/modules/scenarioeditor/ScenarioLayersTabPanel";
import ScenarioSettingsPanel from "@/modules/scenarioeditor/ScenarioSettingsPanel";

// Hooks & Stores
import { useActiveMap } from "@/components/injects";
import { useUiStore, useWidthStore } from "@/stores/uiStore";
import { useSelectedItems } from "@/stores/selectedStore";

// Lazy loading component
const ScenarioFiltersTabPanel = dynamic(
  () => import("@/modules/scenarioeditor/ScenarioFiltersTabPanel"),
  { ssr: false }
);

interface MapEditorDesktopPanelProps {
  onClose: () => void;
}

export default function MapEditorDesktopPanel({ onClose }: MapEditorDesktopPanelProps) {
  const map = useActiveMap();
  const { activeScenarioEventId } = useSelectedItems();
  
  // State từ UI Store (Zustand)
  const { activeTabIndex, setActiveTabIndex } = useUiStore();
  const { orbatPanelWidth, setOrbatPanelWidth, resetOrbatPanelWidth } = useWidthStore();

  // Chuyển đổi tab index sang string cho Radix UI Tabs
  const activeTabIndexString = useMemo(() => 
    activeTabIndex.toString(), 
    [activeTabIndex]
  );

  // --- Map Padding Logic (Lifecycle) ---
  useEffect(() => {
    if (!map) return;

    const view = map.getView();
    const currentPadding = view.padding || [0, 0, 0, 0];
    const [top, right, bottom, left] = currentPadding;

    // Set padding khi mount (left = 400 để tránh panel)
    view.padding = [top, right, bottom, 400];

    return () => {
      // Reset padding khi unmount
      const view = map?.getView();
      if (view) {
        const padding = view.padding;
        if (padding) {
          const [top, right, bottom, left] = padding;
          view.padding = [top, right, bottom, 0];
        }
      }
    };
  }, [map]);

  // --- Event Handlers ---
  const handleEventClick = (scenarioEvent: any) => {
    // activeScenarioEventId is a string, need to use setActiveScenarioEventId to update
    // For now, just comment this out as we need the setter from useSelectedItems
    // setActiveScenarioEventId(scenarioEvent.id);
  };

  return (
    <aside
      className="pointer-events-auto relative hidden max-h-[80vh] overflow-auto rounded-md border border-gray-300 shadow-sm md:block dark:border-slate-700 bg-background"
      style={{ width: `${orbatPanelWidth}px` }}
    >
      
      
      <ScrollTabs
        value={activeTabIndexString}
        onValueChange={(val) => setActiveTabIndex(parseInt(val))}
        items={[
          { label: 'ORBAT', value: '0' },
          { label: 'Events', value: '1' },
          { label: 'Layers', value: '2' },
          { label: 'Settings', value: '3' },
          { label: 'Filters', value: '4' }
        ]}
        rightContent={(
          <CloseButton onClick={onClose} className="bg-transparent" />
        )}
      >
        <TabsContent value="0" className="h-full pb-10">
          <OrbatPanel />
        </TabsContent>

        <TabsContent value="1" className="p-4 pb-10">
          <ScenarioEventsPanel onEventClick={handleEventClick} />
        </TabsContent>

        <TabsContent value="2" className="p-4 pb-10">
          <ScenarioLayersTabPanel />
        </TabsContent>

        <TabsContent value="3" className="p-4 pb-10">
          <ScenarioSettingsPanel />
        </TabsContent>

        <TabsContent value="4" className="p-4 pb-10">
          <ScenarioFiltersTabPanel />
        </TabsContent>
      </ScrollTabs>

      <PanelResizeHandle
        width={orbatPanelWidth}
        onUpdate={(newWidth) => setOrbatPanelWidth(newWidth)}
        onReset={() => resetOrbatPanelWidth()}
      />
    </aside>
  );
}