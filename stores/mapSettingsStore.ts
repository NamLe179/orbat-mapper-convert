import { create } from "zustand";
import { persist } from "zustand/middleware";
import { type CoordinateFormatType } from "@/hooks/geoShowLocation";
import { DEFAULT_BASEMAP_ID } from "@/config/constants";

export interface MapSettingsState {
  // Persisted State
  showLocation: boolean;
  coordinateFormat: CoordinateFormatType;
  showScaleLine: boolean;
  mapIconSize: number;
  mapCustomIconScale: number;
  mapUnitLabelBelow: boolean;
  mapWrapUnitLabels: boolean;
  mapWrapLabelWidth: number;
  mapLabelSize: number;

  // Non-persisted State (based on original code)
  baseLayerName: string;
  showDayNightTerminator: boolean;

  // Actions (Setters for all fields)
  setShowLocation: (v: boolean) => void;
  setCoordinateFormat: (v: CoordinateFormatType) => void;
  setShowScaleLine: (v: boolean) => void;
  setBaseLayerName: (v: string) => void;
  setShowDayNightTerminator: (v: boolean) => void;
  setMapIconSize: (v: number) => void;
  setMapCustomIconScale: (v: number) => void;
  setMapUnitLabelBelow: (v: boolean) => void;
  setMapWrapUnitLabels: (v: boolean) => void;
  setMapWrapLabelWidth: (v: number) => void;
  setMapLabelSize: (v: number) => void;
}

export const useMapSettingsStore = create<MapSettingsState>()(
  persist(
    (set) => ({
      // --- Initial State ---
      showLocation: true,
      coordinateFormat: "DecimalDegrees",
      showScaleLine: true,
      baseLayerName: DEFAULT_BASEMAP_ID,
      showDayNightTerminator: false,
      mapIconSize: 30,
      mapCustomIconScale: 1.7,
      mapUnitLabelBelow: false,
      mapWrapUnitLabels: false,
      mapWrapLabelWidth: 15,
      mapLabelSize: 12,

      // --- Actions ---
      setShowLocation: (v) => set({ showLocation: v }),
      setCoordinateFormat: (v) => set({ coordinateFormat: v }),
      setShowScaleLine: (v) => set({ showScaleLine: v }),
      setBaseLayerName: (v) => set({ baseLayerName: v }),
      setShowDayNightTerminator: (v) => set({ showDayNightTerminator: v }),
      setMapIconSize: (v) => set({ mapIconSize: v }),
      setMapCustomIconScale: (v) => set({ mapCustomIconScale: v }),
      setMapUnitLabelBelow: (v) => set({ mapUnitLabelBelow: v }),
      setMapWrapUnitLabels: (v) => set({ mapWrapUnitLabels: v }),
      setMapWrapLabelWidth: (v) => set({ mapWrapLabelWidth: v }),
      setMapLabelSize: (v) => set({ mapLabelSize: v }),
    }),
    {
      name: "map-settings", // LocalStorage key
      
      // Only persist fields that used `useLocalStorage` in the original Vue code
      partialize: (state) => ({
        showLocation: state.showLocation,
        coordinateFormat: state.coordinateFormat,
        showScaleLine: state.showScaleLine,
        mapIconSize: state.mapIconSize,
        mapCustomIconScale: state.mapCustomIconScale,
        mapUnitLabelBelow: state.mapUnitLabelBelow,
        mapWrapUnitLabels: state.mapWrapUnitLabels,
        mapWrapLabelWidth: state.mapWrapLabelWidth,
        mapLabelSize: state.mapLabelSize,
      }),
    }
  )
);