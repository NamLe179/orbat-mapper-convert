import { useCallback } from "react";
import { nanoid } from "@/utils"; // Đảm bảo đường dẫn import đúng trong Next.js
import { toDom } from "@/utils";  // Lưu ý: toDom thường dùng DOMParser, chỉ chạy ở Client-side
import type { TScenario } from "@/scenariostore";
import type { FeatureCollection } from "geojson";
import type { ImportGeoJsonFeature } from "@/importexport/jsonish/types";

export interface MilxImportedLayer {
  id: string;
  name?: string;
  features: ImportGeoJsonFeature[];
}

export interface UseScenarioExportOptions {
  activeScenario: TScenario;
}

export function useScenarioImport() {
  /**
   * Import dữ liệu từ chuỗi định dạng MilX (XML).
   * Sử dụng Dynamic Import để tối ưu bundle size cho Next.js.
   */
  const importMilxString = useCallback(async (source: string): Promise<MilxImportedLayer[]> => {
    // Dynamic import module milx
    const { getMilXLayers, convertMilXLayer } = await import("@/importexport/milx");
    
    // Lưu ý: toDom cần chạy trong môi trường browser (client-side)
    const dom = await toDom(source);
    const milxLayers = getMilXLayers(dom);

    return milxLayers
      .map((mlayer) => ({
        id: nanoid(),
        name: mlayer.name || "no name",
        features: convertMilXLayer(mlayer).features,
      }))
      .filter((l) => l.features.length > 0);
  }, []);

  const importGeojsonString = useCallback((source: string): FeatureCollection => {
    return JSON.parse(source);
  }, []);

  const importJsonString = useCallback(<T>(source: string): T => {
    return JSON.parse(source) as T;
  }, []);

  return { 
    importMilxString, 
    importGeojsonString, 
    importJsonString 
  };
}