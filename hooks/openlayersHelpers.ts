import { unByKey } from "ol/Observable";
import Feature from "ol/Feature";
import type OLMap from "ol/Map";
import VectorLayer from "ol/layer/Vector";
import { Collection } from "ol";
import { Vector as VectorSource } from "ol/source";
import { GeoJSON as GeoJSONFormat } from "ol/format";
import type { GeoJSON } from "geojson";

// Helper project imports
import type { FeatureId } from "@/types/scenarioGeoModels";
import { saveBlobToLocalFile } from "@/utils/files";

/**
 * Kiểm tra xem feature có phải là hình tròn không.
 */
export function isCircle(feature: Feature) {
  return feature.getGeometry()?.getType() === "Circle";
}

/**
 * Tìm Feature và Layer chứa nó dựa trên ID.
 */
export function getFeatureAndLayerById(
  featureId: FeatureId,
  layerCollection: Collection<VectorLayer<any>>,
) {
  for (let index = 0, ii = layerCollection.getLength(); index < ii; ++index) {
    const layer = layerCollection.item(index);
    // Kiểm tra xem layer có source vector không trước khi gọi getFeatureById
    const source = layer.getSource();
    if (source instanceof VectorSource) {
      const feature = source.getFeatureById(featureId);
      if (feature) {
        return { feature, layer, layerIndex: index };
      }
    }
  }
  return null;
}

/**
 * Lấy index của feature trong source của layer.
 */
export function getFeatureIndex(feature: Feature, layer: VectorLayer<any>) {
  const source = layer.getSource();
  if (!(source instanceof VectorSource)) return -1;
  
  const features = source.getFeaturesCollection();
  if (!features) return -1;

  for (let index = 0, ii = features.getLength(); index < ii; ++index) {
    const currentFeature = features.item(index);
    if (feature === currentFeature) {
      return index;
    }
  }
  return -1;
}

/**
 * Lấy tất cả các feature có thể snap được trên bản đồ (từ các vector layer đang hiển thị).
 */
export function getSnappableFeatures(olMap: OLMap) {
  return olMap
    .getAllLayers()
    .filter((l) => l.getVisible() && l.getSource() instanceof VectorSource)
    .map((l) => (l.getSource() as VectorSource)?.getFeatures())
    .flat();
}

// Copied from https://openlayers.org/en/latest/examples/export-map.html
/**
 * Xuất bản đồ hiện tại ra file PNG.
 * Lưu ý: Hàm này thao tác DOM trực tiếp, chỉ chạy ở Client-side.
 */
export async function saveMapAsPng(map: OLMap, options: { fileName?: string } = {}) {
  const fileName = options.fileName ?? "image.png";
  
  map.once("rendercomplete", async function () {
    const mapCanvas = document.createElement("canvas");
    const size = map.getSize();
    if (!size) return;
    
    mapCanvas.width = size[0];
    mapCanvas.height = size[1];
    const mapContext = mapCanvas.getContext("2d");
    if (!mapContext) return;

    const canvasElements = map.getViewport().querySelectorAll(".ol-layer canvas, canvas.ol-layer");
    
    Array.prototype.forEach.call(
      canvasElements,
      function (canvas: HTMLCanvasElement) {
        if (canvas.width > 0) {
          // @ts-ignore: parentNode style handling
          const opacity = canvas.parentNode?.style?.opacity || canvas.style.opacity;
          mapContext.globalAlpha = opacity === "" ? 1 : Number(opacity);
          
          let matrix;
          const transform = canvas.style.transform;
          
          if (transform) {
            // Get the transform parameters from the style's transform matrix
            const match = transform.match(/^matrix\(([^\(]*)\)$/);
            if (match) {
              matrix = match[1].split(",").map(Number);
            } else {
               matrix = [1, 0, 0, 1, 0, 0];
            }
          } else {
            matrix = [
              parseFloat(canvas.style.width) / canvas.width,
              0,
              0,
              parseFloat(canvas.style.height) / canvas.height,
              0,
              0,
            ];
          }
          
          // Apply the transform to the export map context
          // @ts-ignore: setTransform spread arguments
          mapContext.setTransform(...matrix);
          
          // @ts-ignore
          const backgroundColor = canvas.parentNode?.style?.backgroundColor;
          if (backgroundColor) {
            mapContext.fillStyle = backgroundColor;
            mapContext.fillRect(0, 0, canvas.width, canvas.height);
          }
          
          mapContext.drawImage(canvas, 0, 0);
        }
      },
    );
    
    mapContext.globalAlpha = 1;
    mapContext.setTransform(1, 0, 0, 1, 0, 0);
    
    const blob: Blob | null = await new Promise((resolve) => mapCanvas.toBlob(resolve));

    if (blob) {
      await saveBlobToLocalFile(blob, fileName);
    }
  });
  
  map.renderSync();
}

const gjs = new GeoJSONFormat({
  featureProjection: "EPSG:3857",
  dataProjection: "EPSG:4326",
});

/**
 * Vẽ GeoJSON lên Layer.
 */
export function drawGeoJsonLayer<T extends GeoJSON>(
  layer: VectorLayer<any>,
  geoJson?: T | null,
) {
  const source = layer.getSource();
  if (source instanceof VectorSource) {
    source.clear();
    if (geoJson) {
      source.addFeatures(gjs.readFeatures(geoJson));
    }
  }
}