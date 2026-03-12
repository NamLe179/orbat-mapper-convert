/**
 * Browser Scenarios Hook
 * 
 * This hook provides scenario management operations for UI components.
 * It handles listing, loading, creating, duplicating, and deleting scenarios.
 * 
 * IMPORTANT: API Integration Notes
 * 
 * Currently using mockScenarioService which stores data as JSON files.
 */

"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
// DEPRECATED: IndexedDB is no longer used for scenario storage
// import { type ScenarioMetadata, getIndexedDb } from "@/scenariostore/localdb";
import type { ScenarioMetadata } from "@/scenariostore/localdb";
import { mockScenarioService, isDemoScenario, DEMO_SCENARIO_IDS } from "@/scenariostore/mockScenarios";
import type { MenuItemData } from "@/components/types"; // Kiểm tra lại đường dẫn này trong project của bạn
import type { StoredScenarioAction } from "@/types/constants";
import type { Scenario } from "@/types/scenarioModels";
import { nanoid } from "@/utils/ids";

// Định nghĩa base path cho editor map (Tương đương MAP_EDIT_MODE_ROUTE)
const MAP_EDITOR_BASE_URL = "/scenario";

// Demo scenarios are now defined in mockScenarios.ts
// These are kept for backward compatibility with UI components
export const DEMO_SCENARIOS = [
  {
    name: "The Falklands War 1982",
    id: "falkland82",
    summary:
      "The Falklands War was a military conflict that took place in 1982 between Argentina and the United Kingdom. Argentina invaded the Falkland Islands on April 2, 1982, and the UK responded by sending a task force to retake the islands.",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/8/8b/HMS_Broadsword_and_Hermes%2C_1982_%28IWM%29.jpg",
  },
  {
    name: "Battles of Narvik 1940",
    id: "narvik40",
    summary:
      "A series of naval and land engagements fought between German and Allied forces from April to June 1940. The battles marked the first Allied victory against Germany in the war.",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/5/5f/Norwegian_Army_Colt_heavy_machine_gun_at_the_Narvik_front.jpg",
  },
  {
    name: "Empty Scenario",
    id: "empty",
    summary:
      "An empty scenario template for testing and development purposes.",
    imageUrl: "",
  },
];

export function useBrowserScenarios() {
  const router = useRouter();
  const [storedScenarios, setStoredScenarios] = useState<ScenarioMetadata[]>([]);
  const [activeSort, setActiveSort] = useState("lastModified");

  // Hàm helper để load lại danh sách
  const reloadScenarios = useCallback(async () => {
    // DEPRECATED: IndexedDB loading
    // const { listScenarios } = await getIndexedDb();
    // const scenarios = await listScenarios();
    
    // Load scenarios from API (JSON files in public/scenarios)
    const scenarios = await mockScenarioService.listScenarios();
    setStoredScenarios(scenarios);
  }, []);

  // Load danh sách khi mount (tương đương onMounted)
  useEffect(() => {
    reloadScenarios();
  }, [reloadScenarios]);

  // Logic sort (sử dụng useMemo để tính toán lại khi activeSort thay đổi)
  const sortOptions = useMemo<MenuItemData[]>(() => [
    {
      label: "Name",
      action: () => {
        setStoredScenarios((prev) => 
          [...prev].sort((a, b) => a.name.localeCompare(b.name))
        );
        setActiveSort("name");
      },
      active: activeSort === "name",
    },
    {
      label: "Last modified",
      action: () => {
        setActiveSort("lastModified");
        setStoredScenarios((prev) => 
          [...prev].sort((a, b) => +b.modified - +a.modified)
        );
      },
      active: activeSort === "lastModified",
    },
    {
      label: "Created",
      action: () => {
        setActiveSort("created");
        setStoredScenarios((prev) => 
          [...prev].sort((a, b) => +b.created - +a.created)
        );
      },
      active: activeSort === "created",
    },
  ], [activeSort]);

  async function onAction(action: StoredScenarioAction, scenario: ScenarioMetadata) {
    // DEPRECATED: IndexedDB operations
    // const { deleteScenario, duplicateScenario, downloadAsJson } =
    //   await getIndexedDb();
      
    switch (action) {
      case "open":
        router.push(`${MAP_EDITOR_BASE_URL}/${scenario.id}`);
        break;
      case "delete":
        // Don't allow deleting demo scenarios
        if (isDemoScenario(scenario.id)) {
          window.alert("Cannot delete demo scenarios");
          return;
        }
        if (
          window.confirm(
            `Are you sure you want to permanently delete the scenario "${scenario.name}"?`,
          )
        ) {
          await mockScenarioService.deleteScenario(scenario.id);
        }
        break;
      case "download":
        // Download scenario as JSON
        const scenarioData = await mockScenarioService.loadScenario(scenario.id);
        if (scenarioData) {
          const blob = new Blob([JSON.stringify(scenarioData, null, 2)], {
            type: "application/json",
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${scenario.name}.json`;
          a.click();
          URL.revokeObjectURL(url);
        }
        break;
      case "duplicate":
        await mockScenarioService.duplicateScenario(scenario.id);
        break;
    }

    await reloadScenarios();
  }

  async function loadScenario(v: Scenario) {
    // Check if scenario already exists
    const targetId = v.id ?? nanoid();
    const existingScenarioInfo = await mockScenarioService.getScenarioInfo(targetId);

    let scenarioId = v.id;

    if (existingScenarioInfo) {
      if (
        window.confirm(
          "A scenario with the same ID already exists. Do you want to replace it?",
        )
      ) {
        scenarioId = await mockScenarioService.saveScenario(v);
      } else {
        // Create a copy with a new ID
        scenarioId = await mockScenarioService.saveScenario({ ...v, id: nanoid() });
      }
    } else {
      scenarioId = await mockScenarioService.saveScenario(v);
    }
    
    router.push(`${MAP_EDITOR_BASE_URL}/${scenarioId}`);
  }

  async function importScenario(scenarioId: string) {
    const scenario = await mockScenarioService.loadScenario(scenarioId);
    return scenario ?? null;
  }

  return { 
    storedScenarios, 
    sortOptions, 
    onAction, 
    loadScenario, 
    importScenario 
  };
}