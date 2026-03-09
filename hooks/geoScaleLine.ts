/**
 * Chức năng: Hiển thị Scale Line (thước đo tỷ lệ) trên bản đồ OpenLayers.
 */

import { useEffect, useMemo } from "react";
import OLMap from "ol/Map";
import { ScaleLine } from "ol/control";
import type { MeasurementUnit } from "@/hooks/geoMeasurement";

export type CoordinateFormatType = "MGRS" | "DecimalDegrees" | "DegreeMinuteSeconds";

export interface GeoShowScaleLineOptions {
  enabled?: boolean;
  measurementUnits?: MeasurementUnit;
}

// Hook chính để quản lý Scale Line control trên bản đồ, với khả năng bật/tắt và thay đổi đơn vị đo
export function useShowScaleLine(
  olMap: OLMap | null,
  options: GeoShowScaleLineOptions = {}
) {
  // Default values
  const { 
    enabled = true, 
    measurementUnits = "metric" 
  } = options;

  // 1. Khởi tạo Control (Memoize để giữ instance duy nhất)
  const scaleLineControl = useMemo(() => {
    return new ScaleLine({ 
      units: measurementUnits,
    });
    // Lưu ý: không đưa measurementUnits vào dependencies ở đây vì muốn update nó qua method setUnits thay vì tạo instance mới.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 2. Effect: Xử lý Bật/Tắt Control trên Map
  useEffect(() => {
    if (!olMap) return;

    if (enabled) {
      olMap.addControl(scaleLineControl);
    } else {
      olMap.removeControl(scaleLineControl);
    }

    // Cleanup khi unmount hoặc khi olMap thay đổi
    return () => {
      olMap.removeControl(scaleLineControl);
    };
  }, [olMap, enabled, scaleLineControl]);

  // 3. Effect: Cập nhật đơn vị đo (Units)
  useEffect(() => {
    scaleLineControl.setUnits(measurementUnits);
  }, [measurementUnits, scaleLineControl]);
}