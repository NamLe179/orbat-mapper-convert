"use client";

import React, { useEffect, useState, useRef } from "react";
import { useEventListener } from "usehooks-ts";

// Components
import ScenarioEditor from "@/modules/scenarioeditor/ScenarioEditor";
import ScenarioNotFoundPage from "@/modules/scenarioeditor/ScenarioNotFoundPage";

// Hooks & Stores
import { useScenario } from "@/scenariostore";
import { useSelectedItems } from "@/stores/selectedStore";
// DEPRECATED: IndexedDB is no longer used for scenario storage
// import { getIndexedDb } from "@/scenariostore/localdb";
import { mockScenarioService, isDemoScenario } from "@/scenariostore/mockScenarios";
import { ActiveScenarioContext } from "@/components/injects";

interface Props {
  scenarioId: string;
  children: React.ReactNode;
}

export default function ScenarioEditorWrapper({ scenarioId, children }: Props) {
  const { scenario, isReady, setStore } = useScenario();
  const [localReady, setLocalReady] = useState(false);
  const [scenarioNotFound, setScenarioNotFound] = useState(false);
  
  const selectedItems = useSelectedItems();
  const currentDemoRef = useRef("");

  // --- Helper function (using imported isDemoScenario) ---

  const saveScenarioIfNecessary = async ({ saveDemo = false } = {}) => {
    if (scenario?.store?.canUndo) {
      if (isDemoScenario(scenarioId)) {
        if (!saveDemo) return;
        if (!window.confirm("You have made changes to a demo scenario. Do you want to save a copy?")) {
          return;
        }
      }
      // Save scenario via API (creates/updates JSON file)
      await mockScenarioService.saveScenario(scenario.io.serializeToObject());
      console.log("[ScenarioEditorWrapper] Scenario saved to file");
    }
  };

  // --- Effect: Load scenario ---
  useEffect(() => {
    const loadData = async () => {
      console.log("[ScenarioEditorWrapper] Loading scenario:", scenarioId, "isDemoScenario:", isDemoScenario(scenarioId));
      setLocalReady(false);
      setScenarioNotFound(false);

      try {
        // Load scenario via API or from demo files
        const scenarioData = await mockScenarioService.loadScenario(scenarioId);
        
        if (scenarioData) {
          const { useNewScenarioStore } = await import("@/scenariostore/newScenarioStore");
          const newStore = useNewScenarioStore(scenarioData);
          setStore(newStore);
          
          if (isDemoScenario(scenarioId)) {
            currentDemoRef.current = scenarioId.replace("demo-", "");
          }
          
          selectedItems.clear();
          selectedItems.setShowScenarioInfo(true);
          console.log("[ScenarioEditorWrapper] Scenario loaded successfully:", scenarioId);
        } else {
          console.error("[ScenarioEditorWrapper] Scenario not found:", scenarioId);
          setScenarioNotFound(true);
        }
      } catch (error) {
        console.error("[ScenarioEditorWrapper] Error loading scenario:", error);
        setScenarioNotFound(true);
      }
      
      setLocalReady(true);
    };

    loadData();

    // Cleanup function: Save on route leave
    return () => {
      saveScenarioIfNecessary({ saveDemo: true });
    };
  }, [scenarioId, setStore]);

  // --- Browser Events ---
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        saveScenarioIfNecessary();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  useEventListener("beforeunload", (event) => {
    saveScenarioIfNecessary();
  });

  // --- Render logic ---
  if (scenarioNotFound) {
    return <ScenarioNotFoundPage />;
  }

  

  if (localReady && isReady && scenario) {
    return (
      <ActiveScenarioContext.Provider value={scenario}>
        <ScenarioEditor key={scenario.store.state.id}>
          {children}
        </ScenarioEditor>
      </ActiveScenarioContext.Provider>
    );
  }

  // Trạng thái Loading mặc định
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="text-muted-foreground animate-pulse text-sm font-medium">
        Loading Scenario...
      </div>
    </div>
  );
}