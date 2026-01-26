import type { ScenarioMapLayer, ScenarioMapLayerType } from "@/types/scenarioGeoModels";

export type LayerUpdateOptions = {
  debounce?: boolean;
  undoable?: boolean;
};

const layerTypeLabelMap: Record<ScenarioMapLayerType, string> = {
  XYZLayer: "XYZ layer",
  ImageLayer: "Image layer",
  TileJSONLayer: "TileJSON layer",
  KMLLayer: "KML layer",
};

/**
 * Hook tính toán thông tin hiển thị cho Map Layer.
 * Trong React, vì logic này rất nhẹ (O(1)), ta tính toán trực tiếp mà không cần useMemo.
 */
export function useMapLayerInfo(layer: ScenarioMapLayer) {
  // Derived state (tương đương computed trong Vue)
  const isInitialized = layer._status === "initialized";
  const status = layer._status;
  
  // Fallback về layer.type nếu không tìm thấy trong map
  const layerTypeLabel = layerTypeLabelMap[layer.type] || layer.type;

  return { isInitialized, status, layerTypeLabel };
}