"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

// UI Components
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import NewSimpleModal from "@/components/NewSimpleModal";
import SortDropdown from "@/components/SortDropdown";
import ScenarioLinkCard from "@/components/ScenarioLinkCard";
import LoadScenarioPanel from "@/modules/scenarioeditor/LoadScenarioPanel";
import LoadScenarioUrlForm from "@/modules/scenarioeditor/LoadScenarioUrlForm";

// Hooks & Types
import { useBrowserScenarios } from "@/hooks/browserScenarios";
import { NEW_SCENARIO_ROUTE } from "@/router/name";
import type { Scenario, EncryptedScenario } from "@/types/scenarioModels";

// Dynamic Import cho Modal giải mã (Lazy Load)
const DecryptScenarioModal = dynamic(
  () => import("@/components/DecryptScenarioModal"),
  { ssr: false }
);

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function LoadScenarioDialog({ open, onOpenChange }: Props) {
  // --- Local State ---
  const [inputSource, setInputSource] = useState<"external" | "browser">("browser");
  const [showDecryptModal, setShowDecryptModal] = useState(false);
  const [currentEncryptedScenario, setCurrentEncryptedScenario] = useState<EncryptedScenario | null>(null);

  // --- Composables (Custom Hooks) ---
  const { loadScenario, storedScenarios, sortOptions, onAction } = useBrowserScenarios();

  // --- Handlers ---
  const onLoaded = (scenario: Scenario | EncryptedScenario) => {
    if (scenario.type === "ORBAT-mapper-encrypted") {
      setCurrentEncryptedScenario(scenario as EncryptedScenario);
      setShowDecryptModal(true);
      return;
    }
    loadScenario(scenario as Scenario);
    onOpenChange(false);
  };

  const onDecrypted = (scenario: Scenario) => {
    loadScenario(scenario);
    onOpenChange(false);
    setShowDecryptModal(false);
    setCurrentEncryptedScenario(null);
  };

  return (
    <>
      <NewSimpleModal
        open={open}
        onOpenChange={onOpenChange}
        dialogTitle="Load scenario"
        className="sm:max-w-xl md:max-w-4xl"
      >
        

        <Tabs value={inputSource} onValueChange={(val) => setInputSource(val as any)} className="mt-4">
          <div className="flex items-center gap-x-4">
            <span className="text-muted-foreground text-sm font-medium">Source</span>
            <TabsList className="bg-transparent p-0">
              <TabsTrigger
                value="browser"
                className="text-muted-foreground hover:text-muted-foreground data-[state=active]:bg-accent data-[state=active]:text-primary cursor-pointer rounded-md px-3 py-2 text-sm font-medium shadow-none transition-none data-[state=active]:shadow-none"
              >
                Browser
              </TabsTrigger>
              <TabsTrigger
                value="external"
                className="text-muted-foreground hover:text-muted-foreground data-[state=active]:bg-accent data-[state=active]:text-primary cursor-pointer rounded-md px-3 py-2 text-sm font-medium shadow-none transition-none data-[state=active]:shadow-none"
              >
                Local file / URL
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="browser" className="mt-4">
            <header className="flex items-center justify-end border-b border-gray-200 pb-5">
              <div className="mt-3 flex items-center sm:mt-0 sm:ml-4">
                <SortDropdown className="mr-4" options={sortOptions} />
                <Button asChild variant="secondary">
                  <Link href={NEW_SCENARIO_ROUTE}>Create new</Link>
                </Button>
              </div>
            </header>
            
            <ul className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
              {storedScenarios.map((info) => (
                <ScenarioLinkCard
                  key={info.id}
                  data={info}
                  onAction={(event: any) => onAction(event, info)}
                />
              ))}
            </ul>
          </TabsContent>

          <TabsContent value="external" className="mt-6">
            <div className="h-40">
              <LoadScenarioPanel onLoaded={onLoaded} />
            </div>
            <div className="mt-4">
              <LoadScenarioUrlForm onLoaded={onLoaded} />
            </div>
          </TabsContent>
        </Tabs>
      </NewSimpleModal>

      {/* Render Modal giải mã nếu có kịch bản bị khóa */}
      {showDecryptModal && currentEncryptedScenario && (
        <DecryptScenarioModal
          open={showDecryptModal}
          onOpenChange={setShowDecryptModal}
          encryptedScenario={currentEncryptedScenario}
          onDecrypted={onDecrypted}
        />
      )}
    </>
  );
}