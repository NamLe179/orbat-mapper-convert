"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { type ScenarioMetadata, getIndexedDb } from "@/scenariostore/localdb";
import type { MenuItemData } from "@/components/types"; // Kiểm tra lại đường dẫn này trong project của bạn
import type { StoredScenarioAction } from "@/types/constants";
import type { Scenario } from "@/types/scenarioModels";
import { nanoid } from "@/utils/ids";

// Định nghĩa base path cho editor map (Tương đương MAP_EDIT_MODE_ROUTE)
const MAP_EDITOR_BASE_URL = "/map";

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
];

export function useBrowserScenarios() {
  const router = useRouter();
  const [storedScenarios, setStoredScenarios] = useState<ScenarioMetadata[]>([]);
  const [activeSort, setActiveSort] = useState("lastModified");

  // Hàm helper để load lại danh sách
  const reloadScenarios = useCallback(async () => {
    const { listScenarios } = await getIndexedDb();
    const scenarios = await listScenarios();
    // Mặc định reverse như logic cũ
    setStoredScenarios(scenarios.reverse());
    // Reset sort về default hoặc giữ logic sort hiện tại nếu cần thiết
    // Ở đây giữ nguyên logic Vue cũ là chỉ reload list raw
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
    const { deleteScenario, duplicateScenario, downloadAsJson } =
      await getIndexedDb();
      
    switch (action) {
      case "open":
        router.push(`${MAP_EDITOR_BASE_URL}/${scenario.id}`);
        break;
      case "delete":
        if (
          window.confirm(
            `Are you sure you want to permanently delete the scenario "${scenario.name}"?`,
          )
        ) {
          await deleteScenario(scenario.id);
        }
        break;
      case "download":
        await downloadAsJson(scenario.id);
        break;
      case "duplicate":
        await duplicateScenario(scenario.id);
        break;
    }

    await reloadScenarios();
  }

  async function loadScenario(v: Scenario) {
    const { addScenario, getScenarioInfo, putScenario } = await getIndexedDb();

    // Nếu object v chưa có id, tạo mới
    const targetId = v.id ?? nanoid();
    const existingScenarioInfo = await getScenarioInfo(targetId);

    let scenarioId = v.id;

    if (existingScenarioInfo) {
      if (
        window.confirm(
          "A scenario with the same ID is stored in the browser. Do you want to replace it with this scenario?",
        )
      ) {
        scenarioId = await putScenario(v);
      } else {
        // Nếu user không muốn ghi đè, tạo bản copy với ID mới
        scenarioId = await addScenario(v, nanoid());
      }
    } else {
      scenarioId = await addScenario(v);
    }
    
    router.push(`${MAP_EDITOR_BASE_URL}/${scenarioId}`);
  }

  async function importScenario(scenarioId: string) {
    const { loadScenario: dbLoadScenario } = await getIndexedDb();
    const scenario = await dbLoadScenario(scenarioId);
    if (scenario) {
      return scenario;
    }
    return null;
  }

  return { 
    storedScenarios, 
    sortOptions, 
    onAction, 
    loadScenario, 
    importScenario 
  };
}