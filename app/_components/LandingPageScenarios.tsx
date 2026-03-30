"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import WipBadge from "@/components/WipBadge";
import LoadScenarioPanel from "@/modules/scenarioeditor/LoadScenarioPanel";
import LoadScenarioFromUrlPanel from "@/modules/scenarioeditor/LoadScenarioFromUrlPanel";
import ScenarioLinkCard from "@/components/ScenarioLinkCard";
import SortDropdown from "@/components/SortDropdown";
import { DEMO_SCENARIOS, useBrowserScenarios } from "@/hooks/browserScenarios";
import DecryptScenarioModal from "@/components/DecryptScenarioModal";
import type { EncryptedScenario, Scenario } from "@/types/scenarioModels";

export default function LandingPageScenarios() {
  const { storedScenarios, sortOptions, onAction, loadScenario } = useBrowserScenarios();
  const router = useRouter();

  const [showDecryptModal, setShowDecryptModal] = useState(false);
  const [currentEncryptedScenario, setCurrentEncryptedScenario] =
    useState<EncryptedScenario | null>(null);

  const getScenarioTo = (scenarioId: string) => {
    return `/scenario/demo-${scenarioId}`;
  };

  const newScenario = () => {
    router.push("/scenario/new");
  };

  function onLoaded(scenario: Scenario | EncryptedScenario) {
    if (scenario.type === "ORBAT-mapper-encrypted") {
      setCurrentEncryptedScenario(scenario as EncryptedScenario);
      setShowDecryptModal(true);
      return;
    }
    loadScenario(scenario as Scenario);
  }

  function onDecrypted(scenario: Scenario) {
    loadScenario(scenario);
    setShowDecryptModal(false);
    setCurrentEncryptedScenario(null);
  }

  return (
    <div className="relative bg-background py-5">
      <div className="mx-auto max-w-3xl p-4 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-heading">Scenarios</h2>
      </div>

      {storedScenarios.length > 0 && (
        <section className="mx-auto max-w-7xl p-6">
          <header className="border-b border-border pb-5 sm:flex sm:items-center sm:justify-between">
            <h2 className="text-base font-semibold leading-6 text-foreground">
              Recent scenarios
            </h2>
            <div className="mt-3 flex items-center gap-1 sm:ml-4 sm:mt-0">
              <SortDropdown options={sortOptions} />
              <Button asChild>
                <Link href="/scenario/new">Create new scenario</Link>
              </Button>
            </div>
          </header>
          <ul className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {storedScenarios.map((info) => (
              <ScenarioLinkCard
                key={info.id}
                data={info}
                onAction={(e) => onAction(e, info)}
              />
            ))}
          </ul>
        </section>
      )}

      <section className="mb-2">
        <p className="relative top-0 right-0 left-0 bg-muted/50 p-4 text-center text-sm text-muted-foreground">
          Please note that the demo scenarios are incomplete and they are still under
          development.
        </p>
      </section>

      <div className="mx-auto max-w-3xl px-4 text-center">
        <p className="text-lg text-muted-foreground">
          Try one of the bundled demo scenarios or create your own
        </p>
      </div>

      <section className="mx-auto max-w-7xl p-6">
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {DEMO_SCENARIOS.map((scenario) => {
            const imageUrl = scenario.imageUrl?.trim();

            return (
              <li
                key={scenario.name}
                className="col-span-1 flex flex-col divide-y divide-border overflow-hidden rounded-lg border bg-card text-center text-card-foreground shadow-sm focus-within:border-primary"
              >
                <Link
                  href={getScenarioTo(scenario.id)}
                  className="flex flex-1 flex-col"
                  draggable="false"
                >
                  {imageUrl ? (
                    <img
                      className="mx-auto h-52 w-full shrink-0 bg-muted object-cover object-top"
                      src={imageUrl}
                      alt={scenario.name}
                      draggable="false"
                    />
                  ) : (
                    <div className="mx-auto h-52 w-full shrink-0 bg-muted" aria-hidden="true" />
                  )}
                  <h3 className="mt-6 text-sm font-medium text-heading">{scenario.name}</h3>
                  <dl className="mt-1 flex grow flex-col justify-between p-4">
                    <dt className="sr-only">Summary</dt>
                    <dd className="text-sm text-muted-foreground">{scenario.summary}</dd>
                  </dl>
                </Link>
              </li>
            );
          })}

          <li className="col-span-1 flex">
            <button
              type="button"
              onClick={newScenario}
              className="relative block w-full rounded-lg border-2 border-dashed border-border p-12 text-center hover:border-border/80 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <svg
                className="mx-auto h-12 w-12 text-muted-foreground"
                xmlns="http://www.w3.org/2000/svg"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8 14v20c0 4.418 7.163 8 16 8 1.381 0 2.721-.087 4-.252M8 14c0 4.418 7.163 8 16 8s16-3.582 16-8M8 14c0-4.418 7.163-8 16-8s16 3.582 16 8m0 0v14m0-4c0 4.418-7.163 8-16 8S8 28.418 8 24m32 10v6m0 0v6m0-6h6m-6 0h-6"
                />
              </svg>
              <span className="mt-2 block text-sm font-medium text-foreground">
                Create new scenario
              </span>
            </button>
          </li>
        </ul>
      </section>

      <section className="border-t border-border py-10">
        <div className="mx-auto max-w-3xl space-y-4 px-4 text-center">
          <p className="text-sm text-muted-foreground">Or load a scenario from a file</p>
          <div className="flex flex-wrap justify-center gap-3">
            <LoadScenarioPanel onLoaded={onLoaded} />
            <LoadScenarioFromUrlPanel onLoaded={onLoaded} />
          </div>
        </div>
      </section>

      {showDecryptModal && currentEncryptedScenario && (
        <DecryptScenarioModal
          encryptedScenario={currentEncryptedScenario}
          open={showDecryptModal}
          onOpenChange={setShowDecryptModal}
          onDecrypted={onDecrypted}
        />
      )}
    </div>
  );
}
