"use client";

import React, { useState, useEffect, useMemo } from "react";

// Stores & Hooks
import { useActiveScenario } from "@/components/injects";
import { useScenarioInfoPanelStore } from "@/stores/scenarioInfoPanelStore";

// Components
import EditableLabel from "@/components/EditableLabel";
import ScenarioInfoDetails from "@/modules/scenarioeditor/ScenarioInfoDetails";
import ScrollTabs from "@/components/ScrollTabs";
import { TabsContent } from "@/components/ui/tabs";

// Types
import { type ScenarioInfo } from "@/types/scenarioModels";

export default function ScenarioInfoPanel() {
  // --- Context & Store ---
  const { store } = useActiveScenario();
  const state = store.state;
  const panelStore = useScenarioInfoPanelStore();

  // --- Local State ---
  const [scenarioName, setScenarioName] = useState("");

  // --- Watchers (useEffect) ---
  // Tương đương watch(() => state.info.name, ..., { immediate: true })
  useEffect(() => {
    setScenarioName(state.info.name);
  }, [state.info.name]);

  // --- Constants ---
  const tabList = useMemo(() => [{ label: "Details", value: "0" }], []);

  // --- Handlers ---
  const updateScenarioInfo = (data: Partial<ScenarioInfo>) => {
    store.update((s: any) => {
      Object.assign(s.info, { ...data });
    });
  };

  const handleTabChange = (value: string) => {
    panelStore.setTabIndex(Number(value)); // Giả định method của Zustand store
  };

  return (
    <div className="">
      <header className="pr-4">
        <EditableLabel
          value={scenarioName}
          onChange={setScenarioName}
          onUpdateValue={(val) => updateScenarioInfo({ name: val })}
        />
      </header>

      

      <div className="-mx-4">
        <ScrollTabs
          items={tabList}
          value={panelStore.tabIndex.toString()}
          onValueChange={handleTabChange}
        >
          <TabsContent value="0" className="mx-4 pt-4">
            <ScenarioInfoDetails />
          </TabsContent>
        </ScrollTabs>
      </div>
    </div>
  );
}