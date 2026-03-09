import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import XYZ from "ol/source/XYZ";
import { transformExtent } from "ol/proj";
import type { LayerConfigFile } from "@/geo/layerConfigTypes";

/**
 * tạo các lớp bản đồ nền (base layers) từ cấu hình và gán các thuộc tính cần thiết để dễ dàng quản lý sau này.
 * Hàm createBaseLayerInstances() tạo các TileLayer từ config
 * Hỗ trợ 2 loại nguồn: OSM (OpenStreetMap) và XYZ (tile server)
 * Chuyển đổi tọa độ extent sang projection của view
 */

export function createBaseLayerInstances(layers: LayerConfigFile, view: View) {
  return layers.map((layerConfig) => {
    const configCopy = structuredClone(layerConfig);

    const {
      layerSourceType,
      layerType = "baselayer",
      title,
      name,
      tileLayerOptions,
    } = configCopy;

    // Chuyển đổi tọa độ (Projection) nếu có extent
    if (tileLayerOptions?.extent) {
      tileLayerOptions.extent = transformExtent(
        tileLayerOptions.extent,
        "EPSG:4326",
        view.getProjection(),
      );
    }

    const properties = { title, name, layerType };

    let source;
    if (layerSourceType === "osm") {
      source = new OSM(configCopy.sourceOptions as any);
    } else if (layerSourceType === "xyz") {
      source = new XYZ(configCopy.sourceOptions as any);
    }

    const layer = new TileLayer({
      source,
      properties,
      visible: false, // Mặc định ẩn, sẽ được React State/Zustand điều khiển sau
      preload: Infinity,
      ...tileLayerOptions,
    });

    // Set properties trực tiếp vào instance layer để dễ truy xuất sau này
    layer.set("name", name);
    layer.set("title", title);
    
    return layer;
  });
}