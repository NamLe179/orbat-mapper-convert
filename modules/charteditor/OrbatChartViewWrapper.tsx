"use client";

import React, { useEffect } from "react";
import { useScenario } from "@/scenariostore";

// Components
import OrbatChartView from "@/modules/charteditor/OrbatChartView";

export default function OrbatChartViewWrapper() {
  const { scenario, isReady } = useScenario();

  // --- Khởi tạo dữ liệu (Tương đương code trong <script setup>) ---
  useEffect(() => {
    const initScenario = async () => {
      // Chỉ load kịch bản mẫu nếu chưa có dữ liệu sẵn sàng
      // Logic này gọi đến io của scenario store
      if (scenario) {
        await scenario.io.loadDemoScenario("falkland82");
      }
    };

    initScenario();
  }, [scenario]); // Chạy một lần khi mount

  // --- Render logic ---
  if (!isReady || !scenario) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background p-10">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm font-medium text-muted-foreground italic">
            Preparing ORBAT Chart...
          </p>
        </div>
      </div>
    );
  }

  

  return (
    <OrbatChartView
      key={scenario.store.state.id}
      activeScenario={scenario}
    />
  );
}