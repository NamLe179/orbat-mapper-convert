"use client";

import { use, ReactNode } from "react";
import ScenarioEditorWrapper from "@/modules/scenarioeditor/ScenarioEditorWrapper";
import { ScenarioProvider } from "@/scenariostore/ScenarioProvider";

interface ScenarioLayoutProps {
  children: ReactNode;
  params: Promise<{
    scenarioId: string;
  }>;
}

export default function ScenarioLayout({ children, params }: ScenarioLayoutProps) {
  const { scenarioId } = use(params);
  
  return (
    <ScenarioProvider>
      <ScenarioEditorWrapper scenarioId={scenarioId}>
        {children}
      </ScenarioEditorWrapper>
    </ScenarioProvider>
  );
}
