/**
 * Chức năng: Hiển thị tọa độ vị trí con trỏ chuột trên bản đồ OpenLayers, với định dạng tùy chọn.
 */

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
 * MousePosition control với format: MGRS, DMS, DD
 */
export function useShowLocationControl(
  olMap: OLMap | null,
  options: GeoShowLocationOptions = {},
) {
  // Default values
  const projection = options.projection ?? "EPSG:4326";
  const coordinateFormat = options.coordinateFormat ?? "DecimalDegrees";
  const enable = options.enable ?? true;

  // Ref để giữ instance control duy nhất, tránh tạo lại khi options thay đổi
  const controlRef = useRef<MousePosition | null>(null);

  // Khởi tạo control một lần duy nhất khi component mount hoặc projection thay đổi
  useEffect(() => {
    if (!controlRef.current) {
      controlRef.current = new MousePosition({
        projection: projection,
        className: "location-control",
      });
    }
  }, [projection]);

  // Effect 1: Bật/Tắt control trên map
  useEffect(() => {
    const control = controlRef.current;
    if (!control || !olMap) return;

    if (enable) {
      control.setMap(olMap);
    } else {
      control.setMap(null);
    }

    // Cleanup: đảm bảo control được gỡ bỏ khi component unmount hoặc khi olMap thay đổi
    return () => {
      control.setMap(null);
    };
  }, [olMap, enable]);

  // Effect 2: Cập nhật định dạng tọa độ khi coordinateFormat thay đổi
  useEffect(() => {
    const control = controlRef.current;
    if (!control) return;

    const formatFunc: CoordinateFormat = getCoordinateFormatFunction(coordinateFormat);
    control.setCoordinateFormat(formatFunc);

    if (enable) {
      // @ts-ignore: accessing private method to force update, mirroring original logic
      if (typeof control.updateHTML_ === "function") {
        // @ts-ignore
        control.updateHTML_([0, 0]);
      }
    }
  }, [coordinateFormat, enable]);
}