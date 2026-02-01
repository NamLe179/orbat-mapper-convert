"use client";

import React, { useEffect } from "react";
import { useSearchParams } from "next/navigation";

// Hooks & Stores
import { useScenario } from "@/scenariostore";

// Components
import StoryModeView from "@/modules/storymode/StoryModeView";

export default function StoryModeWrapper() {
  const { scenario, isReady } = useScenario();
  const searchParams = useSearchParams();
  const loadQuery = searchParams.get("load");

  // --- Khởi tạo dữ liệu ban đầu ---
  useEffect(() => {
    const initScenario = async () => {
      if (loadQuery && scenario) {
        // Nếu có tham số ?load= trên URL
        await scenario.io.loadDemoScenario(loadQuery);
      } else if (!isReady && scenario) {
        // Nếu chưa sẵn sàng và không có query, load mặc định falkland82
        await scenario.io.loadDemoScenario("falkland82");
      }
    };

    initScenario();
  }, []); // Chỉ chạy một lần khi component mount

  // --- Watcher: Tương đương watch(() => route.query.load) ---
  useEffect(() => {
    if (loadQuery && scenario) {
      scenario.io.loadDemoScenario(loadQuery);
    }
  }, [loadQuery, scenario]); // Chạy lại mỗi khi tham số 'load' trên URL thay đổi

  // Đảm bảo dữ liệu đã sẵn sàng trước khi render view chính
  if (!isReady || !scenario) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-muted-foreground">
        <p className="animate-pulse">Loading scenario...</p>
      </div>
    );
  }

  return (
    <StoryModeView
      key={scenario.store.state.id}
      activeScenario={scenario}
    />
  );
}