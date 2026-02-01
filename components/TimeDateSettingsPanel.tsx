"use client";

import React from "react";

// Stores & Hooks
import { useTimeFormatSettingsStore, useTimeFormatters } from "@/stores/timeFormatStore";
import { useActiveScenario } from "@/hooks/scenarioUtils";

// Components
import PanelHeading from "@/components/PanelHeading";
import HeadingDescription from "@/components/HeadingDescription";
import AccordionPanel from "@/components/AccordionPanel";
import TimeDateSettingsDetails from "@/components/TimeDateSettingsDetails";

export default function TimeDateSettingsPanel() {
  // --- Hooks & Stores ---
  const { store } = useActiveScenario();
  
  // Lấy giá trị format settings (Zustand pattern)
  const track = useTimeFormatSettingsStore((s) => s.track);
  const scenario = useTimeFormatSettingsStore((s) => s.scenario);
  const setTrackSettings = useTimeFormatSettingsStore((s) => s.setTrackSettings);
  const setScenarioSettings = useTimeFormatSettingsStore((s) => s.setScenarioSettings);
  
  // Lấy các formatter functions
  const fmt = useTimeFormatters();

  // Giả định store.state.currentTime là reactive (ví dụ dùng proxy hoặc subscribe)
  const currentTime = store.state.currentTime;

  // --- Render Helpers (Tương đương Vue Slots) ---
  const scenarioClosedContent = (
    <span className="text-muted-foreground text-sm leading-7">
      {fmt.scenarioFormatter.format(currentTime)}
    </span>
  );

  const trackClosedContent = (
    <span className="text-muted-foreground text-sm leading-7">
      {fmt.trackFormatter.format(currentTime)}
    </span>
  );

  return (
    <>
      <PanelHeading>Time and date</PanelHeading>
      <HeadingDescription>
        Choose how you want to format the scenario's time and date.
      </HeadingDescription>

      {/* Scenario Datetime Format Section */}
      <AccordionPanel 
        label="Scenario datetime format" 
        closedContent={scenarioClosedContent}
      >
        <TimeDateSettingsDetails
          sampleTime={fmt.scenarioFormatter.format(currentTime)}
          settings={scenario}
          onSettingsChange={setScenarioSettings}
        />
      </AccordionPanel>

      {/* Map Format Section */}
      <AccordionPanel 
        label="Map format" 
        closedContent={trackClosedContent}
      >
        <TimeDateSettingsDetails
          sampleTime={fmt.trackFormatter.format(currentTime)}
          settings={track}
          onSettingsChange={setTrackSettings}
        />
      </AccordionPanel>
    </>
  );
}