import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import XYZ from "ol/source/XYZ";
import { transformExtent } from "ol/proj";
import type { LayerConfigFile } from "@/geo/layerConfigTypes";

export function createBaseLayerInstances(layers: LayerConfigFile, view: View) {
  return layers.map((layerConfig) => {
    // Thay klona() bằng structuredClone() (Native JS)
    // Giúp deep copy object config để không làm thay đổi object gốc
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
    // TypeScript check: Ép kiểu nhẹ để khớp với constructor của OL
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