"use client";

import React from "react";
import { useBrowserScenarios } from "@/hooks/browserScenarios";
import { type StoredScenarioAction } from "@/types/constants";
import { type ScenarioMetadata } from "@/scenariostore/localdb";

// Components (Giả định đã convert)
import SortDropdown from "@/components/SortDropdown";
import ScenarioLinkCard from "@/components/ScenarioLinkCard";

interface ImportLoadStepBrowserProps {
  onLoaded?: (scenario: any) => void;
}

export default function ImportLoadStepBrowser({ onLoaded }: ImportLoadStepBrowserProps) {
  // Hook logic
  const { importScenario, storedScenarios, sortOptions, onAction } = useBrowserScenarios();

  async function handleAction(action: StoredScenarioAction, info: ScenarioMetadata) {
    if (action === "open") {
      const scenario = await importScenario(info.id);
      if (scenario && onLoaded) {
        onLoaded(scenario);
      }
    } else {
      await onAction(action, info);
    }
  }

  return (
    <section className="">
      <header className="flex items-center justify-end border-b border-gray-200 pb-5">
        <div className="mt-3 flex items-center sm:mt-0 sm:ml-4">
          <SortDropdown className="mr-4" options={sortOptions} />
        </div>
      </header>
      
      <ul className="mt-4 grid grid-cols-1 gap-6 p-1 sm:grid-cols-3">
        {storedScenarios.map((info) => (
          <ScenarioLinkCard
            key={info.id}
            noLink={true} // Vue: no-link -> React: noLink
            data={info}
            onAction={(action: StoredScenarioAction) => handleAction(action, info)}
          />
        ))}
      </ul>
    </section>
  );
}