import { useEffect, useRef } from "react";
import type OLMap from "ol/Map";
import MousePosition from "ol/control/MousePosition";
import { type CoordinateFormat } from "ol/coordinate";
import { getCoordinateFormatFunction } from "@/utils/geoConvert";

export type CoordinateFormatType =
  | "MGRS"
  | "DecimalDegrees"
  | "DegreeMinuteSeconds"
  | "dms"
  | "dd";

export interface GeoShowLocationOptions {
  projection?: string;
  coordinateFormat?: CoordinateFormatType;
  enable?: boolean;
}

/**
 * Hook to add a MousePosition control to an OpenLayers map.
 *
 * @param olMap - The OpenLayers map instance (can be null during initialization)
 * @param options - Configuration options
 */
export function useShowLocationControl(
  olMap: OLMap | null,
  options: GeoShowLocationOptions = {},
) {
  // Default values
  const projection = options.projection ?? "EPSG:4326";
  const coordinateFormat = options.coordinateFormat ?? "DecimalDegrees";
  const enable = options.enable ?? true;

  // Keep a reference to the control instance to persist across renders
  const controlRef = useRef<MousePosition | null>(null);

  // Initialize the control once
  useEffect(() => {
    if (!controlRef.current) {
      controlRef.current = new MousePosition({
        projection: projection,
        className: "location-control",
        // We set the placeholder/target behaviors here if needed
      });
    }
  }, [projection]);

  // Effect 1: Handle Map attachment and Enable/Disable state
  useEffect(() => {
    const control = controlRef.current;
    if (!control || !olMap) return;

    if (enable) {
      control.setMap(olMap);
    } else {
      control.setMap(null);
    }

    // Cleanup: remove control when component unmounts or map changes
    return () => {
      control.setMap(null);
    };
  }, [olMap, enable]);

  // Effect 2: Handle Coordinate Format changes
  useEffect(() => {
    const control = controlRef.current;
    if (!control) return;

    const formatFunc: CoordinateFormat = getCoordinateFormatFunction(coordinateFormat);
    control.setCoordinateFormat(formatFunc);

    // Force update visual if needed (porting logic from original Vue code)
    if (enable) {
      // @ts-ignore: accessing private method to force update, mirroring original logic
      if (typeof control.updateHTML_ === "function") {
        // @ts-ignore
        control.updateHTML_([0, 0]);
      }
    }
  }, [coordinateFormat, enable]); // Dependency on enable ensures we update when toggled on
}