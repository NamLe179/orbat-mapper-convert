import { create } from "zustand";
import {
  type BufferOptions,
  createDefaultTransformationOperation,
  type SimplifyOptions,
  type TransformationOperation,
} from "@/geo/transformations";
import type { FeatureId } from "@/types/scenarioGeoModels";

// -----------------------------------------------------------------------------
// Interface Definitions
// -----------------------------------------------------------------------------

interface TransformSettingsState {
  // --- State ---
  showPreview: boolean;
  transformations: TransformationOperation[];
  updateAtTime: boolean;
  updateActiveFeature: FeatureId | undefined;

  // --- Basic Setters ---
  setShowPreview: (show: boolean) => void;
  setTransformations: (ops: TransformationOperation[]) => void;
  setUpdateAtTime: (update: boolean) => void;
  setUpdateActiveFeature: (id: FeatureId | undefined) => void;

  // --- Array Manipulation Helpers (For convenience) ---
  addTransformation: () => void;
  removeTransformation: (index: number) => void;
  updateTransformation: (index: number, op: TransformationOperation) => void;
}

// -----------------------------------------------------------------------------
// Store Implementation
// -----------------------------------------------------------------------------

export const useTransformSettingsStore = create<TransformSettingsState>((set) => ({
  // Initial State
  showPreview: true,
  transformations: [createDefaultTransformationOperation()],
  updateAtTime: false,
  updateActiveFeature: undefined,

  // Basic Setters
  setShowPreview: (show) => set({ showPreview: show }),
  
  setTransformations: (transformations) => set({ transformations }),
  
  setUpdateAtTime: (update) => set({ updateAtTime: update }),
  
  setUpdateActiveFeature: (id) => set({ updateActiveFeature: id }),

  // Helpers for managing the transformations array immutably
  addTransformation: () => 
    set((state) => ({
      transformations: [...state.transformations, createDefaultTransformationOperation()],
    })),

  removeTransformation: (index) =>
    set((state) => ({
      transformations: state.transformations.filter((_, i) => i !== index),
    })),

  updateTransformation: (index, op) =>
    set((state) => {
      const newTransformations = [...state.transformations];
      newTransformations[index] = op;
      return { transformations: newTransformations };
    }),
}));