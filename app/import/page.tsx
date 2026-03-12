"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import {
  AlertTriangle,
  Download,
  ExternalLink,
  FileWarning,
  LoaderCircle,
  Moon,
  Sun,
} from "lucide-react";
import { useScenarioShare } from "@/hooks/scenarioShare";
// DEPRECATED: IndexedDB is no longer used for scenario storage
// import { getIndexedDb } from "@/scenariostore/localdb";
import { mockScenarioService } from "@/scenariostore/mockScenarios";
import { nanoid } from "@/utils";
import type { EncryptedScenario, Scenario, Unit } from "@/types/scenarioModels";
import DecryptScenarioModal from "@/components/DecryptScenarioModal";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { GithubIcon } from "@/components/GithubIcon";

export default function ImportScenarioPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme, setTheme } = useTheme();
  const { loadScenarioFromUrlParam } = useScenarioShare();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scenarioData, setScenarioData] = useState<Scenario | null>(null);
  const [hasConflict, setHasConflict] = useState(false);
  const [isWaitingForDownload, setIsWaitingForDownload] = useState(false);
  const [showDecryptModal, setShowDecryptModal] = useState(false);
  const [currentEncryptedScenario, setCurrentEncryptedScenario] =
    useState<EncryptedScenario | null>(null);

  const isDark = theme === "dark";
  const toggleDark = () => setTheme(isDark ? "light" : "dark");

  useEffect(() => {
    const dataParam = searchParams.get("data");
    const idParam = searchParams.get("id");

    if (!dataParam && !idParam) {
      setError("No scenario data provided in the URL.");
      setIsLoading(false);
      return;
    }

    setIsWaitingForDownload(true);
    setIsLoading(false);
  }, [searchParams]);

  async function handleDownload() {
    setIsWaitingForDownload(false);
    setIsLoading(true);
    const dataParam = searchParams.get("data");
    const idParam = searchParams.get("id");

    try {
      let loadedScenario: any;
      if (idParam) {
        const response = await fetch(`/share?id=${idParam}`);
        if (!response.ok) {
          if (response.status === 404) throw new Error("Scenario not found.");
          throw new Error("Failed to load scenario.");
        }
        loadedScenario = await response.json();
      } else if (dataParam) {
        loadedScenario = await loadScenarioFromUrlParam(dataParam);
      }

      if (loadedScenario?.type === "ORBAT-mapper-encrypted") {
        setIsLoading(false);
        setCurrentEncryptedScenario(loadedScenario as EncryptedScenario);
        setShowDecryptModal(true);
        return;
      }

      await processLoadedScenario(loadedScenario);
    } catch (e: any) {
      console.error("Failed to load scenario", e);
      setError(
        e.message || "Failed to decode the scenario. The URL may be corrupted or invalid."
      );
    } finally {
      if (!showDecryptModal) {
        setIsLoading(false);
      }
    }
  }

  async function processLoadedScenario(scenario: Scenario) {
    setScenarioData(scenario);

    // Check if scenario with same ID exists
    if (scenario?.id) {
      const existingScenario = await mockScenarioService.getScenarioInfo(scenario.id);
      if (existingScenario) {
        setHasConflict(true);
        return;
      }
    }

    // Save and navigate
    await saveAndNavigate(scenario);
  }

  async function saveAndNavigate(scenario: Scenario) {
    const newId = nanoid();

    const newScenario = {
      ...scenario,
      id: newId,
    };

    console.log("[ImportPage] Saving scenario with ID:", newId);
    await mockScenarioService.saveScenario(newScenario);
    
    // Verify scenario was saved
    const saved = await mockScenarioService.getScenarioInfo(newId);
    console.log("[ImportPage] Scenario saved successfully:", saved ? "yes" : "no");
    
    if (!saved) {
      console.error("[ImportPage] Failed to save scenario to storage");
      setError("Failed to save scenario to storage.");
      return;
    }
    
    console.log("[ImportPage] Navigating to /scenario/" + newId);
    router.push(`/scenario/${newId}`);
  }

  async function handleReplaceExisting() {
    if (!scenarioData) return;
    await mockScenarioService.saveScenario(scenarioData);
    router.push(`/scenario/${scenarioData.id}`);
  }

  async function handleSaveAsNew() {
    if (!scenarioData) return;
    await saveAndNavigate(scenarioData);
  }

  function handleDecrypted(scenario: Scenario) {
    processLoadedScenario(scenario);
    setShowDecryptModal(false);
    setCurrentEncryptedScenario(null);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="relative top-0 right-0 left-0 flex items-center justify-center gap-8 bg-muted p-1 text-center">
        <p>
          This is a work in progress prototype. Follow the{" "}
          <a href="https://github.com/orbat-mapper/orbat-mapper" className="underline">
            development on GitHub <GithubIcon className="inline size-6 sm:size-10" />
          </a>
        </p>
        <Button variant="ghost" size="icon" onClick={toggleDark} title="Toggle dark mode">
          {isDark ? <Sun /> : <Moon />}
        </Button>
      </header>

      <main className="flex flex-1 items-center justify-center p-4">
        {isLoading ? (
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <LoaderCircle className="mx-auto h-12 w-12 animate-spin text-primary" />
              <CardTitle>Loading scenario...</CardTitle>
              <CardDescription>Please wait while we load your scenario.</CardDescription>
            </CardHeader>
          </Card>
        ) : error ? (
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <FileWarning className="mx-auto h-12 w-12 text-destructive" />
              <CardTitle>Error</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={() => router.push("/")}>Go to Home</Button>
            </CardContent>
          </Card>
        ) : isWaitingForDownload ? (
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <Download className="mx-auto h-12 w-12 text-primary" />
              <CardTitle>Import Shared Scenario</CardTitle>
              <CardDescription>
                Click the button below to download and import the shared scenario.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 text-center">
              <Button onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download and Import
              </Button>
              <Button variant="outline" onClick={() => router.push("/")}>
                Cancel
              </Button>
            </CardContent>
          </Card>
        ) : hasConflict ? (
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <AlertTriangle className="mx-auto h-12 w-12 text-warning" />
              <CardTitle>Scenario Already Exists</CardTitle>
              <CardDescription>
                A scenario with the same ID already exists in your browser. What would you
                like to do?
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Scenario: {scenarioData?.name || "Untitled"}</AlertTitle>
                <AlertDescription>
                  Replacing will overwrite your existing scenario.
                </AlertDescription>
              </Alert>
              <div className="flex flex-col gap-2">
                <Button variant="destructive" onClick={handleReplaceExisting}>
                  Replace Existing
                </Button>
                <Button onClick={handleSaveAsNew}>Save as New</Button>
                <Separator />
                <Button variant="outline" onClick={() => router.push("/")}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </main>

      {showDecryptModal && currentEncryptedScenario && (
        <DecryptScenarioModal
          encryptedScenario={currentEncryptedScenario}
          open={showDecryptModal}
          onOpenChange={(open) => {
            setShowDecryptModal(open);
            if (!open) router.push("/");
          }}
          onDecrypted={handleDecrypted}
        />
      )}
    </div>
  );
}
