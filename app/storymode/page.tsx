"use client";

import StoryModeWrapper from "@/modules/storymode/StoryModeWrapper";
import { ScenarioProvider } from "@/scenariostore/ScenarioProvider";

export default function StoryModePage() {
  return (
    <ScenarioProvider>
      <StoryModeWrapper />
    </ScenarioProvider>
  );
}
