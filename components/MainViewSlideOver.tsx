"use client";

import React from "react";

// Components
import LayersPanel from "./LayersPanel";
import SlideOver from "./SlideOver";
import ScrollTabs from "@/components/ScrollTabs";
import { TabsContent } from "@/components/ui/tabs";
import NumberInputGroup from "./NumberInputGroup";
import MapSettingsPanel from "@/components/MapSettingsPanel";
import ToggleField from "@/components/ToggleField";
import TimeDateSettingsPanel from "@/components/TimeDateSettingsPanel";

// Stores
import { useSettingsStore, useSymbolSettingsStore } from "@/stores/settingsStore";
import { useUiStore } from "@/stores/uiStore";
import { useMapSettingsStore } from "@/stores/mapSettingsStore";

interface MainViewSlideOverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MainViewSlideOver({ open, onOpenChange }: MainViewSlideOverProps) {
  // --- Accessing Global Stores (Zustand) ---
  const settings = useSettingsStore();
  const mapSettings = useMapSettingsStore();
  const symbolSettings = useSymbolSettingsStore();
  const uiSettings = useUiStore();

  const tabItems = ["Map view", "Map layers", "ORBAT", "Time and date"];

  return (
    <SlideOver open={open} onOpenChange={onOpenChange} title="Settings">
      <ScrollTabs items={tabItems} defaultValue="0">
        
        {/* Tab 0: Map View Settings */}
        <TabsContent value="0" className="px-4 py-6">
          <MapSettingsPanel />
        </TabsContent>

        {/* Tab 1: Map Layers Management */}
        <TabsContent value="1" className="px-4 py-6">
          <LayersPanel />
        </TabsContent>

        {/* Tab 2: ORBAT & Symbol Settings */}
        <TabsContent value="2" className="px-4 py-6">
          <div className="space-y-4 p-1">
            <NumberInputGroup
              label="Map symbol size"
              value={mapSettings.mapIconSize}
              onValueChange={(val) => mapSettings.setMapIconSize(val)}
            />
            
            <NumberInputGroup 
              label="ORBAT symbol size" 
              value={settings.orbatIconSize}
              onValueChange={(val) => settings.setOrbatIconSize(val)}
            />

            <ToggleField 
              checked={settings.orbatShortName}
              onCheckedChange={(val: string | boolean) => settings.setOrbatShortName(!!val)}
            >
              Use short names in ORBAT
            </ToggleField>

            <ToggleField 
              checked={symbolSettings.simpleStatusModifier}
              onCheckedChange={(val: string | boolean) => symbolSettings.setSimpleStatusModifier(!!val)}
            >
              Use simple status modifier
            </ToggleField>

            <hr className="border-border my-2" />

            <ToggleField 
              checked={uiSettings.debugMode}
              onCheckedChange={(val: string | boolean) => uiSettings.setDebugMode(!!val)}
            >
              Debug mode
            </ToggleField>

            {uiSettings.debugMode && (
              <ToggleField 
                checked={uiSettings.showFps}
                onCheckedChange={(val: string | boolean) => uiSettings.setShowFps(!!val)}
              >
                Show FPS
              </ToggleField>
            )}
          </div>
        </TabsContent>

        {/* Tab 3: Time and Date Configuration */}
        <TabsContent value="3" className="px-4 py-6">
          <TimeDateSettingsPanel />
        </TabsContent>

      </ScrollTabs>
    </SlideOver>
  );
}