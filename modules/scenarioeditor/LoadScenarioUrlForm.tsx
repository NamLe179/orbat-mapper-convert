"use client";

import React, { useState } from "react";
import { type Scenario } from "@/types/scenarioModels";
import { isUrl } from "@/utils";
import { Button } from "@/components/ui/button";

// Components (Giả định đã convert)
import InputGroup from "@/components/InputGroup";

interface LoadScenarioUrlFormProps {
  url?: string;
  onLoaded?: (data: Scenario) => void;
}

export default function LoadScenarioUrlForm({
  url = "",
  onLoaded,
}: LoadScenarioUrlFormProps) {
  // --- State ---
  const [scenarioUrl, setScenarioUrl] = useState(url);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [sharableUrl, setSharableUrl] = useState("");

  // --- Logic ---
  const isValidUrl = isUrl(scenarioUrl);

  // --- Handlers ---

  async function fetchScenario(e?: React.FormEvent) {
    if (e) e.preventDefault();

    if (!isValidUrl) {
      setIsError(true);
      setErrorMessage(`The url ${scenarioUrl} is not a valid url.`);
      return;
    }

    try {
      // Reset error state
      setIsError(false);
      setErrorMessage("");

      const response = await fetch(scenarioUrl);
      const jsonData = (await response.json()) as Scenario;

      if (
        jsonData?.type === "ORBAT-mapper" ||
        jsonData?.type === "ORBAT-mapper-encrypted"
      ) {
        if (onLoaded) onLoaded(jsonData);
      } else {
        setIsError(true);
        setErrorMessage(`The url ${scenarioUrl} is not a valid scenario file.`);
      }
    } catch (e: any) {
      console.error("Failed to load", scenarioUrl);
      setIsError(true);
      setErrorMessage(`Failed to load ${scenarioUrl}: ${e?.message}`);
    }
  }

  function createSharableUrl() {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    url.searchParams.set("loadScenarioURL", scenarioUrl);
    const urlString = url.toString();
    
    setSharableUrl(urlString);
    
    // Copy to clipboard immediately (giống behavior gốc)
    navigator.clipboard.writeText(urlString);
  }

  function copyToClipboard() {
    if (sharableUrl) {
      navigator.clipboard.writeText(sharableUrl);
    }
  }

  return (
    <form className="space-y-4" onSubmit={fetchScenario}>
      <InputGroup
        label="URL"
        value={scenarioUrl}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setScenarioUrl(e.target.value)
        }
      />
      
      <p className="text-sm">
        Please note that the scenario host must be configured to allow CORS
        requests.
      </p>

      {isError && (
        <p className="text-sm text-red-600">
          {errorMessage}
        </p>
      )}

      {sharableUrl && (
        <div className="prose prose-sm dark:prose-invert">
          <a href={sharableUrl} target="_blank" rel="noopener noreferrer">
            {sharableUrl}
          </a>
          <Button
            type="button"
            className="ml-2"
            variant="outline"
            size="sm"
            onClick={copyToClipboard}
          >
            Copy to clipboard
          </Button>
        </div>
      )}

      <p className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="secondary"
          onClick={createSharableUrl}
        >
          Create sharable URL
        </Button>
        <Button type="submit">Load from URL</Button>
      </p>
    </form>
  );
}