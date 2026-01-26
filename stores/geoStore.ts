import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import OLMap from "ol/Map";
import { fromLonLat } from "ol/proj";
import { type AllGeoJSON, featureCollection, point as turfPoint } from "@turf/helpers";
import GeoJSON from "ol/format/GeoJSON";
import turfEnvelope from "@turf/envelope";
import Feature from "ol/Feature";
import type { Position } from "geojson";

// Project Types
import type { Unit } from "@/types/scenarioModels";
import type { MeasurementTypes, MeasurementUnit } from "@/hooks/geoMeasurement";
import type { NUnit } from "@/types/internalModels";

export interface ZoomOptions {
  maxZoom?: number;
  duration?: number;
}

// ---------------------------------------------------------------------------
// 1. Geo Store (Map Instance & Navigation Logic)
// ---------------------------------------------------------------------------

interface GeoState {
  olMap: OLMap | null;
  setOlMap: (map: OLMap | null) => void;
  
  zoomToUnit: (unit?: Unit | NUnit | null, duration?: number) => void;
  zoomToUnits: (units: NUnit[], options?: ZoomOptions) => void;
  zoomToGeometry: (geometry: AllGeoJSON, options?: ZoomOptions) => void;
  zoomToLocation: (location?: Position, duration?: number) => void;
  panToUnit: (unit?: Unit | NUnit | null, duration?: number) => void;
  panToLocation: (location?: Position, duration?: number) => void;
  updateMapSize: () => void;
}

export const useGeoStore = create<GeoState>((set, get) => ({
  olMap: null,
  setOlMap: (olMap) => set({ olMap }),

  zoomToUnit: (unit, duration = 900) => {
    const { olMap } = get();
    if (!olMap) return;
    const location = unit?._state?.location;
    if (!location) return;
    const view = olMap.getView();
    view.animate({
      zoom: 15,
      center: fromLonLat(location, view.getProjection()),
      duration,
    });
  },

  zoomToUnits: (units, options = {}) => {
    const { olMap } = get();
    if (!olMap) return;
    const { duration = 900, maxZoom = 15 } = options;
    const points = units
      .filter((u) => u._state?.location)
      .map((u) => turfPoint(u._state?.location!));
    if (!points.length) return;
    const c = featureCollection(points);
    get().zoomToGeometry(c, { duration, maxZoom });
  },

  zoomToGeometry: (geometry, options = {}) => {
    const { olMap } = get();
    if (!olMap) return;
    const { duration = 900, maxZoom = 15 } = options;
    const bb = new GeoJSON().readFeature(turfEnvelope(geometry), {
      featureProjection: "EPSG:3857",
      dataProjection: "EPSG:4326",
    }) as Feature<any>;
    if (!bb) return;
    olMap.getView().fit(bb.getGeometry(), { maxZoom, duration });
  },

  zoomToLocation: (location, duration = 900) => {
    const { olMap } = get();
    if (!olMap) return;
    if (!location) return;
    const view = olMap.getView();
    view.animate({
      zoom: 10,
      center: fromLonLat(location, view.getProjection()),
      duration,
    });
  },

  panToUnit: (unit, duration = 900) => {
    const { olMap } = get();
    if (!olMap) return;
    const location = unit?._state?.location;
    if (!location) return;
    const view = olMap.getView();
    view.animate({
      center: fromLonLat(location, view.getProjection()),
      duration,
    });
  },

  panToLocation: (location, duration = 900) => {
    const { olMap } = get();
    if (!olMap) return;
    if (!location) return;
    const view = olMap.getView();
    view.animate({
      center: fromLonLat(location, view.getProjection()),
      duration,
    });
  },

  updateMapSize: () => {
    get().olMap?.updateSize();
  },
}));

// ---------------------------------------------------------------------------
// 2. Measurements Store
// ---------------------------------------------------------------------------

interface MeasurementsState {
  measurementType: MeasurementTypes;
  clearPrevious: boolean;
  showSegments: boolean;
  measurementUnit: MeasurementUnit;
  snap: boolean;
  showCircle: boolean;

  // Setters
  setMeasurementType: (type: MeasurementTypes) => void;
  setClearPrevious: (v: boolean) => void;
  setShowSegments: (v: boolean) => void;
  setMeasurementUnit: (u: MeasurementUnit) => void;
  setSnap: (v: boolean) => void;
  setShowCircle: (v: boolean) => void;
}

export const useMeasurementsStore = create<MeasurementsState>()(
  persist(
    (set) => ({
      measurementType: "LineString",
      clearPrevious: true,
      showSegments: true,
      measurementUnit: "metric",
      snap: true,
      showCircle: true,

      setMeasurementType: (t) => set({ measurementType: t }),
      setClearPrevious: (v) => set({ clearPrevious: v }),
      setShowSegments: (v) => set({ showSegments: v }),
      setMeasurementUnit: (u) => set({ measurementUnit: u }),
      setSnap: (v) => set({ snap: v }),
      setShowCircle: (v) => set({ showCircle: v }),
    }),
    {
      name: "measurements-storage",
      // Only 'showCircle' was persisted in the original code via useLocalStorage
      partialize: (state) => ({ showCircle: state.showCircle }),
    }
  )
);

// ---------------------------------------------------------------------------
// 3. Unit Settings Store
// ---------------------------------------------------------------------------

interface UnitSettingsState {
  showHistory: boolean;
  editHistory: boolean;
  moveUnitEnabled: boolean;
  showWaypointTimestamps: boolean;

  // Setters
  setShowHistory: (v: boolean) => void;
  setEditHistory: (v: boolean) => void;
  setMoveUnitEnabled: (v: boolean) => void;
  setShowWaypointTimestamps: (v: boolean) => void;
}

export const useUnitSettingsStore = create<UnitSettingsState>()(
  persist(
    (set) => ({
      showHistory: true,
      editHistory: false,
      moveUnitEnabled: false,
      showWaypointTimestamps: false,

      setShowHistory: (v) => set({ showHistory: v }),
      setEditHistory: (v) => set({ editHistory: v }),
      setMoveUnitEnabled: (v) => set({ moveUnitEnabled: v }),
      setShowWaypointTimestamps: (v) => set({ showWaypointTimestamps: v }),
    }),
    {
      name: "unit-settings-storage",
      // Persist only specific fields to match original logic
      partialize: (state) => ({
        showHistory: state.showHistory,
        showWaypointTimestamps: state.showWaypointTimestamps,
      }),
    }
  )
);