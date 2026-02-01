"use client";

import OrbatChartViewWrapper from "@/modules/charteditor/OrbatChartViewWrapper";
import { ScenarioProvider } from "@/scenariostore/ScenarioProvider";

export default function ChartPage() {
  return (
    <ScenarioProvider>
      <OrbatChartViewWrapper />
    </ScenarioProvider>
  );
}
