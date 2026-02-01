"use client";

import React, { useEffect, useState, useRef } from "react";
import { useEventListener } from "usehooks-ts";

// Components
import ScenarioEditor from "@/modules/scenarioeditor/ScenarioEditor";
import ScenarioNotFoundPage from "@/modules/scenarioeditor/ScenarioNotFoundPage";

// Hooks & Stores
import { useScenario } from "@/scenariostore";
import { useSelectedItems } from "@/stores/selectedStore";
import { getIndexedDb } from "@/scenariostore/localdb";
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

  // --- Logic trợ giúp ---
  const isDemoScenario = (id: string) => id.startsWith("demo-");

  const saveScenarioIfNecessary = async ({ saveDemo = false } = {}) => {
    // Giả định canUndo là một thuộc tính hoặc getter trong store
    if (scenario?.store?.canUndo) {
      if (isDemoScenario(scenarioId)) {
        if (!saveDemo) return;
        if (!window.confirm("You have made changes to a demo scenario. Do you want to save a copy?")) {
          return;
        }
      }
      await scenario.io.saveToIndexedDb();
    }
  };

  // --- Effect: Tương đương watch(scenarioId) ---
  useEffect(() => {
    const loadData = async () => {
      console.log("[ScenarioEditorWrapper] Loading scenario:", scenarioId, "isDemoScenario:", isDemoScenario(scenarioId));
      setLocalReady(false);
      setScenarioNotFound(false);

      if (isDemoScenario(scenarioId)) {
        const demoId = scenarioId.replace("demo-", "");
        
        // Chỉ load lại nếu là demo khác hoặc chưa có scenario
        if (demoId !== currentDemoRef.current || !scenario) {
          console.log("[ScenarioEditorWrapper] Loading demo scenario:", demoId);
          // Load demo scenario directly
          const idUrlMap: Record<string, string> = {
            falkland82: "/scenarios/falkland82.json",
            falklands82: "/scenarios/falkland82.json", // Support both variants
            narvik40: "/scenarios/narvik40.json",
          };
          const url = idUrlMap[demoId];
          
          if (url) {
            try {
              const response = await fetch(url);
              if (response.ok) {
                const data = await response.json();
                const { useNewScenarioStore } = await import("@/scenariostore/newScenarioStore");
                const newStore = useNewScenarioStore(data);
                setStore(newStore);
                currentDemoRef.current = demoId;
                selectedItems.clear();
                selectedItems.setShowScenarioInfo(true);
                console.log("[ScenarioEditorWrapper] Demo scenario loaded successfully");
              } else {
                console.error("Failed to fetch demo scenario:", response.status, response.statusText);
                setScenarioNotFound(true);
              }
            } catch (e) {
              console.error("Failed to load demo scenario", e);
              setScenarioNotFound(true);
            }
          } else {
            console.error("Unknown demo scenario ID:", demoId);
            setScenarioNotFound(true);
          }
        } else {
          console.log("[ScenarioEditorWrapper] Demo scenario already loaded, skipping");
        }
        setLocalReady(true);
      } else {
        console.log("[ScenarioEditorWrapper] Loading from IndexedDB:", scenarioId);
        const { loadScenario } = await getIndexedDb();
        const idbscenario = await loadScenario(scenarioId);
        
        if (idbscenario) {
          const { useNewScenarioStore } = await import("@/scenariostore/newScenarioStore");
          const newStore = useNewScenarioStore(idbscenario);
          setStore(newStore);
          selectedItems.clear();
          selectedItems.setShowScenarioInfo(true);
        } else {
          setScenarioNotFound(true);
          console.error("Scenario not found in indexeddb");
        }
        setLocalReady(true);
      }
    };

    loadData();

    // Cleanup function: Tương đương onBeforeRouteLeave (một phần)
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