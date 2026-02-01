"use client";

import { ReactNode, useState } from "react";
import { ScenarioContext } from "./index";
import type { NewScenarioStore } from "./newScenarioStore";

interface ScenarioProviderProps {
  children: ReactNode;
}

export function ScenarioProvider({ children }: ScenarioProviderProps) {
  const [store, setStore] = useState<NewScenarioStore | null>(null);

  return (
    <ScenarioContext.Provider value={{ store, setStore }}>
      {children}
    </ScenarioContext.Provider>
  );
}
