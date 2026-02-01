"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";

// Types
import type {
  OrbatGeneratorOrbat,
  SpatialIllusionsOrbat,
} from "@/types/externalModels";
import type { FeatureCollection } from "geojson";
import type { MilxImportedLayer } from "@/hooks/scenarioImport";
import type { ImportedFileInfo } from "@/importexport/fileHandling";
import type { ImportData } from "@/types/importExport";

// Components
import NewSimpleModal from "@/components/NewSimpleModal";
import DocLink from "@/components/DocLink";
import ImportLoadStep from "@/components/ImportLoadStep";

// Dynamic Imports
const LoadingState = () => <div className="p-4 text-sm text-muted-foreground">Loading module...</div>;

const ImportGeojsonStep = dynamic(() => import("@/components/ImportGeojsonStep"), { 
  loading: LoadingState, ssr: false 
});
const DecryptScenarioModal = dynamic(() => import("@/components/DecryptScenarioModal"), { 
  loading: LoadingState, ssr: false 
});
const ImportSpatialIllusionsStep = dynamic(() => import("@/components/ImportSpatialIllusionsStep"), { 
  loading: LoadingState, ssr: false 
});
const ImportOrbatGeneratorStep = dynamic(() => import("@/components/ImportOrbatGeneratorStep"), { 
  loading: LoadingState, ssr: false 
});
const ImportMilxStep = dynamic(() => import("@/components/ImportMilxStep"), { 
  loading: LoadingState, ssr: false 
});
const ImportKMLStep = dynamic(() => import("@/components/ImportKMLStep"), { 
  loading: LoadingState, ssr: false 
});
const ImportSpreadsheetStep = dynamic(() => import("@/components/ImportSpreadsheetStep"), { 
  loading: LoadingState, ssr: false 
});
const ImportOrbatMapperStep = dynamic(() => import("@/components/ImportOrbatMapperStep"), { 
  loading: LoadingState, ssr: false 
});
const ImportImageStep = dynamic(() => import("@/components/ImportImageStep"), { 
  loading: LoadingState, ssr: false 
});

// Types definition
type ImportState =
  | "select"
  | "milx"
  | "geojson"
  | "unitgenerator"
  | "orbatgenerator"
  | "image"
  | "kml"
  | "xlsx"
  | "orbatmapper"
  | "orbatmapper-encrypted";

interface ImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel?: () => void;
}

export default function ImportModal({
  open,
  onOpenChange,
  onCancel: parentOnCancel,
}: ImportModalProps) {
  // --- State ---
  const [importState, setImportState] = useState<ImportState>("select");
  const [loadedData, setLoadedData] = useState<any>([]); // Tương đương shallowRef
  const [loadedImportData, setLoadedImportData] = useState<ImportData | undefined>(undefined);
  const [fileInfo, setFileInfo] = useState<ImportedFileInfo | undefined>(undefined);
  const [showDecryptModal, setShowDecryptModal] = useState(false);

  // --- Handlers ---

  function onLoaded(
    nextState: ImportState,
    data: any,
    info: ImportedFileInfo | undefined
  ) {
    setLoadedData(data);
    if (nextState === "orbatmapper-encrypted") {
      setShowDecryptModal(true);
      return;
    }
    setImportState(nextState);
    setFileInfo(info);
  }

  function onDecrypted(scenario: any) {
    setShowDecryptModal(false);
    setLoadedData(scenario);
    setImportState("orbatmapper");
  }

  function onLod(importData: ImportData) {
    setLoadedImportData(importData);
    setImportState(importData.format as ImportState);
  }

  function onImport() {
    onOpenChange(false);
  }

  function onCancel() {
    onOpenChange(false);
    
    // Cleanup Object URLs
    const objectUrlStates = ["image", "kml"];
    if (objectUrlStates.includes(importState) && typeof loadedData === 'string') {
      URL.revokeObjectURL(loadedData);
    }
    
    // clean up loadedImportData (Blob URLs)
    loadedImportData?.data.forEach((d) => {
      if (typeof d === "string" && d.startsWith("blob:")) {
        URL.revokeObjectURL(d);
      }
    });
    
    setLoadedImportData(undefined);

    if (parentOnCancel) parentOnCancel();
  }

  // --- Render Content Logic ---
  const renderStepContent = () => {
    switch (importState) {
      case "select":
        return (
          <ImportLoadStep
            onCancel={onCancel}
            onLoaded={onLoaded}
            onLod={onLod}
          />
        );
      case "milx":
        return (
          <ImportMilxStep
            onCancel={onCancel}
            data={loadedData as MilxImportedLayer[]}
            onLoaded={onImport}
          />
        );
      case "geojson":
        return (
          <ImportGeojsonStep
            onCancel={onCancel}
            data={loadedData as FeatureCollection}
            onLoaded={onImport}
          />
        );
      case "unitgenerator":
        return (
          <ImportSpatialIllusionsStep
            onCancel={onCancel}
            data={loadedData as SpatialIllusionsOrbat}
            onLoaded={onImport}
          />
        );
      case "orbatgenerator":
        return (
          <ImportOrbatGeneratorStep
            onCancel={onCancel}
            data={loadedData as OrbatGeneratorOrbat}
            onLoaded={onImport}
          />
        );
      case "image":
        return fileInfo ? (
          <ImportImageStep
            objectUrl={loadedData as string}
            fileInfo={fileInfo}
            onCancel={onCancel}
            onLoaded={onImport}
          />
        ) : null;
      case "kml":
        return loadedImportData?.format === "kml" ? (
          <ImportKMLStep
            loadedData={loadedImportData}
            onCancel={onCancel}
            onLoaded={onImport}
          />
        ) : null;
      case "xlsx":
        return fileInfo ? (
          <ImportSpreadsheetStep
            fileInfo={fileInfo}
            onCancel={onCancel}
            onLoaded={onImport}
          />
        ) : null;
      case "orbatmapper":
        return (
          <ImportOrbatMapperStep
            data={loadedData}
            onCancel={onCancel}
            onLoaded={onImport}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <NewSimpleModal
        open={open}
        onOpenChange={onOpenChange} // Hoặc xử lý đóng qua prop open nếu NewSimpleModal controlled
        dialogTitle="Import data"
        // onCancel={onCancel}
        className="sm:max-w-xl md:max-w-4xl"
      >
        <div className="-mx-6 overflow-x-hidden px-6">
          <p className="text-muted-foreground flex items-center justify-between text-sm leading-6">
            {importState === "select" ? (
              <span>Import data for use in your scenario</span>
            ) : (
              <span />
            )}
            <DocLink href="https://docs.orbat-mapper.app/guide/import-data" />
          </p>

          <div className="mt-4">
             {renderStepContent()}
          </div>
        </div>
      </NewSimpleModal>

      {showDecryptModal && loadedData && (
        <DecryptScenarioModal
          open={showDecryptModal}
          onOpenChange={setShowDecryptModal}
          encryptedScenario={loadedData}
          onDecrypted={onDecrypted}
        />
      )}
    </>
  );
}