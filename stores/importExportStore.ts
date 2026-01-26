import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ExportFormat, ImportFormat } from "@/types/importExport";

// -----------------------------------------------------------------------------
// 1. Import Store
// -----------------------------------------------------------------------------

export interface ImportState {
  // State
  inputSource: "file" | "url" | "browser" | "string";
  format: ImportFormat;
  keepOpen: boolean;

  // Actions
  setInputSource: (source: "file" | "url" | "browser" | "string") => void;
  setFormat: (format: ImportFormat) => void;
  setKeepOpen: (keepOpen: boolean) => void;
}

export const useImportStore = create<ImportState>()(
  persist(
    (set) => ({
      inputSource: "file",
      format: "milx",
      keepOpen: false,

      setInputSource: (inputSource) => set({ inputSource }),
      setFormat: (format) => set({ format }),
      setKeepOpen: (keepOpen) => set({ keepOpen }),
    }),
    {
      name: "import-settings", // Key name in localStorage
      // Original Vue code only persisted 'keepOpen', so we use partialize
      partialize: (state) => ({ keepOpen: state.keepOpen }),
    }
  )
);

// -----------------------------------------------------------------------------
// 2. Export Store
// -----------------------------------------------------------------------------

export interface ExportState {
  // State
  keepOpen: boolean;
  currentFormat: ExportFormat;

  // Actions
  setKeepOpen: (keepOpen: boolean) => void;
  setCurrentFormat: (format: ExportFormat) => void;
}

export const useExportStore = create<ExportState>()(
  persist(
    (set) => ({
      keepOpen: false,
      currentFormat: "orbatmapper",

      setKeepOpen: (keepOpen) => set({ keepOpen }),
      setCurrentFormat: (currentFormat) => set({ currentFormat }),
    }),
    {
      name: "export-settings", // Key name in localStorage
      // Original Vue code persisted both fields, so no partialize needed (defaults to all)
    }
  )
);