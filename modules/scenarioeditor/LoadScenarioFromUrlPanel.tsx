"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Globe } from "lucide-react"; // Thay thế IconWebPlus

// Utils & Types
import { isUrl } from "@/utils";
import type { Scenario } from "@/types/scenarioModels";

// Components
import NewSimpleModal from "@/components/NewSimpleModal";
import LoadScenarioUrlForm from "@/modules/scenarioeditor/LoadScenarioUrlForm";

interface Props {
  onLoaded: (scenario: Scenario) => void;
}

export default function LoadScenarioFromUrlPanel({ onLoaded }: Props) {
  // --- Hooks & Search Params ---
  const searchParams = useSearchParams();
  
  // --- Local State ---
  const [showModal, setShowModal] = useState(false);
  const [isError, setIsError] = useState(false);
  const [initialUrl, setInitialUrl] = useState("");

  // --- Lifecycle (Tương đương onMounted) ---
  useEffect(() => {
    const loadScenarioURL = searchParams.get("loadScenarioURL") ?? "";
    if (loadScenarioURL) {
      setInitialUrl(loadScenarioURL);
      setShowModal(true);
    }
  }, [searchParams]);

  // --- Handlers ---
  const fetchScenario = async (url: string) => {
    try {
      setIsError(false);
      const response = await fetch(url);
      const jsonData = (await response.json()) as Scenario;
      
      if (
        jsonData?.type === "ORBAT-mapper" ||
        jsonData?.type === "ORBAT-mapper-encrypted"
      ) {
        onLoaded(jsonData);
      } else {
        setIsError(true);
      }
    } catch (e) {
      console.error("Failed to load", url);
      setIsError(true);
    }
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const possibleURL = e.dataTransfer?.getData("text/uri-list");
    if (possibleURL && isUrl(possibleURL)) {
      await fetchScenario(possibleURL);
    }
  };

  const toggleModal = () => setShowModal((prev) => !prev);

  return (
    <div
      className="border-border focus-within:ring-ring hover:border-border/80 relative w-full rounded-lg border-2 border-dashed p-4 ring-offset-2 focus-within:ring-2 transition-colors"
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <button
        type="button"
        className="text-foreground hover:text-muted-foreground flex h-full w-full cursor-pointer flex-col items-center justify-center text-sm font-medium"
        onClick={toggleModal}
      >
        <Globe className="text-muted-foreground h-10 w-10" />
        <span className="mt-2 block text-center">Load from URL</span>
      </button>

      {isError && (
        <p className="text-destructive absolute bottom-2 left-0 w-full text-center text-sm font-medium">
          Please select a valid scenario file.
        </p>
      )}

      

      <NewSimpleModal 
        open={showModal} 
        onOpenChange={setShowModal} 
        dialogTitle="Load scenario from URL"
      >
        <div className="mt-4">
          <LoadScenarioUrlForm
            url={initialUrl}
            onLoaded={(data: Scenario) => {
              onLoaded(data);
              setShowModal(false);
            }}
          />
        </div>
      </NewSimpleModal>
    </div>
  );
}