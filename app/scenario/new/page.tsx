"use client";

import { useEffect } from "react";
import NewScenarioView from "@/modules/scenarioeditor/NewScenarioView";
import { useScenario } from "@/scenariostore";
import { ScenarioProvider } from "@/scenariostore/ScenarioProvider";
import { ActiveScenarioContext } from "@/components/injects";
import { createEmptyScenario } from "@/scenariostore/io";

function NewScenarioContent() {
  const { scenario, setStore } = useScenario();

  useEffect(() => {
    if (!scenario) {
      // Create empty scenario on mount
      const emptyScenario = createEmptyScenario({ addGroups: false });
      const { useNewScenarioStore } = require("@/scenariostore/newScenarioStore");
      const newStore = useNewScenarioStore(emptyScenario);
      setStore(newStore);
    }
  }, [scenario, setStore]);

  if (!scenario) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="text-muted-foreground animate-pulse text-sm font-medium">
          Initializing...
        </div>
      </div>
    );
  }

  return (
    <ActiveScenarioContext.Provider value={scenario}>
      <NewScenarioView />
    </ActiveScenarioContext.Provider>
  );
}

export default function NewScenarioPage() {
  return (
    <ScenarioProvider>
      <NewScenarioContent />
    </ScenarioProvider>
  );
}
