"use client";

import React, { useState, useEffect } from "react";
import OLMap from "ol/Map";
import {
  Ruler,
  Route,
  Hexagon,
  Layers,
  Waypoints,
  Trash2,
} from "lucide-react";

import BaseToolbar from "./BaseToolbar";
import ToolbarButton from "./ToolbarButton";
import { useMeasurementInteraction } from "@/hooks/geoMeasurement";
import { useMeasurementsStore } from "@/stores/geoStore";
import { useUiStore } from "@/stores/uiStore";

interface MeasurementToolbarProps {
  olMap: OLMap;
}

export default function MeasurementToolbar({ olMap }: MeasurementToolbarProps) {
  // Hooks Stores
  const measureStore = useMeasurementsStore();
  const uiStore = useUiStore();

  // Local State
  const [enableMeasurements, setEnableMeasurements] = useState(false);

  // Interaction Hook
  const { clear } = useMeasurementInteraction(olMap, measureStore.measurementType, {
    showSegments: measureStore.showSegments,
    clearPrevious: measureStore.clearPrevious,
    enable: enableMeasurements,
    measurementUnit: measureStore.measurementUnit,
  });

  // Effect: Handle Logic (Watch enableMeasurements)
  useEffect(() => {
    // Sync UI Store
    // @ts-ignore
    if (uiStore.setMeasurementActive) uiStore.setMeasurementActive(enableMeasurements);
    // @ts-ignore
    else uiStore.measurementActive = enableMeasurements;

    if (enableMeasurements) {
      // Add Escape Listener
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setEnableMeasurements(false);
        }
      };
      window.addEventListener("keydown", handleKeyDown);

      // Cleanup listener
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
      };
    } else {
      // When disabled
      clear();
    }
  }, [enableMeasurements, uiStore, clear]);

  // Actions Helper
  const toggleMeasurements = () => setEnableMeasurements((prev) => !prev);
  
  // Helper update store (nếu dùng Zustand dạng mutable hoặc setter)
  const setStoreValue = (key: string, value: any) => {
    // @ts-ignore
    if (measureStore[`set${key.charAt(0).toUpperCase() + key.slice(1)}`]) {
       // @ts-ignore
       measureStore[`set${key.charAt(0).toUpperCase() + key.slice(1)}`](value);
    } else {
       // @ts-ignore
       measureStore[key] = value;
    }
  }

  return (
    <div>
      <BaseToolbar className="shadow-sm">
        <ToolbarButton
          start
          end={!enableMeasurements}
          title="Toggle measurements"
          onClick={toggleMeasurements}
        >
          <Ruler
            className={`h-5 w-5 ${
              enableMeasurements ? "text-foreground" : ""
            }`}
          />
        </ToolbarButton>

        {enableMeasurements && (
          <>
            <ToolbarButton
              onClick={() => setStoreValue('measurementType', 'LineString')}
              active={measureStore.measurementType === "LineString"}
              title="LineString"
            >
              <Route className="h-5 w-5" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => setStoreValue('measurementType', 'Polygon')}
              active={measureStore.measurementType === "Polygon"}
              title="Polygon"
            >
              <Hexagon className="h-5 w-5" />
            </ToolbarButton>

            <ToolbarButton
              title="Clear previous measurements"
              onClick={() => setStoreValue('clearPrevious', !measureStore.clearPrevious)}
              active={!measureStore.clearPrevious}
            >
              <Layers className="h-5 w-5" />
            </ToolbarButton>

            <ToolbarButton
              title="Show segment lengths"
              onClick={() => setStoreValue('showSegments', !measureStore.showSegments)}
              active={measureStore.showSegments}
            >
              <Waypoints className="h-5 w-5" />
            </ToolbarButton>

            <ToolbarButton end onClick={() => clear()}>
              <Trash2 className="h-5 w-5" />
            </ToolbarButton>
          </>
        )}
      </BaseToolbar>
    </div>
  );
}