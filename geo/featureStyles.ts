import CircleStyle from "ol/style/Circle";
import Style from "ol/style/Style";
import View from "ol/View";
import type { FeatureLike } from "ol/Feature";

// Project imports
import { useActiveScenario } from "@/components/injects";
import {
  createSimpleStyle,
  defaultSimplestyleFill,
  defaultSimplestyleStroke,
} from "./simplestyle";
import type { FeatureId } from "@/types/scenarioGeoModels";
import type { TGeo } from "@/scenariostore";

// --- Global State & Initialization ---

let zoomResolutions: number[] = [];

// Helper để tính toán resolution cho các mức zoom (0-24)
function calculateZoomToResolution(view: View) {
  zoomResolutions = [];
  for (let i = 0; i <= 24; i++) {
    // getResolutionForZoom có thể trả về undefined, ta ép kiểu hoặc xử lý fallback nếu cần
    const res = view.getResolutionForZoom(i);
    if (res !== undefined) {
      zoomResolutions.push(res);
    }
  }
}

// Next.js SSR Check: Chỉ khởi tạo View và tính toán khi đang ở client-side
if (typeof window !== "undefined") {
  calculateZoomToResolution(new View());
}

// Default Style object (Static)
const defaultStyle = new Style({
  stroke: defaultSimplestyleStroke,
  fill: defaultSimplestyleFill,
  image: new CircleStyle({
    fill: defaultSimplestyleFill,
    stroke: defaultSimplestyleStroke,
    radius: 5,
  }),
});

// --- Main Factory Function ---

/**
 * Factory function để quản lý style cho OpenLayers features.
 * Trong React Component, bạn nên wrap hàm này trong `useMemo` để giữ styleCache
 * không bị reset mỗi lần re-render.
 *
 * @example
 * const { scenarioFeatureStyle } = useMemo(() => useFeatureStyles(geo), [geo]);
 */
export function useFeatureStyles(geo?: TGeo) {
  const context = useActiveScenario();
  const activeGeo = geo || context?.geo;

  if (!activeGeo) {
      // Return dummy functions if no geo context is available (prevents crash)
      return {
          clearCache: () => {},
          scenarioFeatureStyle: () => defaultStyle,
          invalidateStyle: () => {},
      }
  }
  const styleCache = new Map<FeatureId, Style>();

  function clearCache() {
    styleCache.clear();
  }

  function scenarioFeatureStyle(
    feature: FeatureLike,
    resolution: number,
    overrideLimitVisibility = false,
  ) {
    const featureId = feature.getId() as FeatureId;
    let style = styleCache.get(featureId);

    // Lấy thông tin feature từ store (geo)
    const geoFeature = activeGeo.getFeatureById(featureId);
    
    // Fallback an toàn nếu feature không tồn tại trong store
    if (!geoFeature?.feature) {
      return defaultStyle;
    }

    const { feature: scenarioFeature } = geoFeature;
    const {
      meta: { name: label, _zIndex },
      style: {
        showLabel = false,
        limitVisibility,
        minZoom = 0,
        maxZoom = 24,
        textMinZoom = 0,
        textMaxZoom = 24,
      } = {}, // Default empty obj để tránh crash nếu style undefined
    } = scenarioFeature;

    // 1. Tạo hoặc lấy Style từ Cache
    if (!style) {
      style = createSimpleStyle(scenarioFeature.style || {}) || defaultStyle;
      
      // Lưu custom zIndex vào feature instance của OL (nếu cần dùng cho logic sort layer)
      // @ts-ignore: OpenLayers features allow arbitrary properties, but types might be strict
      feature.set("_zIndex", scenarioFeature.meta._zIndex, true);
      
      styleCache.set(featureId, style);
    }

    // 2. Kiểm tra Visibility dựa trên Zoom/Resolution
    // Resolution càng lớn = Zoom càng nhỏ (xa)
    // Resolution càng nhỏ = Zoom càng lớn (gần)
    if (
      limitVisibility &&
      !overrideLimitVisibility &&
      zoomResolutions.length > 0 && 
      (resolution > zoomResolutions[minZoom ?? 0] || 
       resolution < zoomResolutions[maxZoom ?? 24])
    ) {
      return; // Không render (ẩn feature)
    }

    // 3. Cập nhật zIndex cho Style
    style.setZIndex(_zIndex ?? 0);

    // 4. Xử lý Label (Text)
    const textStyle = style.getText();
    if (textStyle) {
      if (
        showLabel &&
        zoomResolutions.length > 0 &&
        resolution < zoomResolutions[textMinZoom ?? 0] &&
        resolution > zoomResolutions[textMaxZoom ?? 24]
      ) {
        textStyle.setText(label);
      } else {
        textStyle.setText(undefined); // Ẩn text
      }
    }

    return style;
  }

  function invalidateStyle(featureId: FeatureId) {
    styleCache.delete(featureId);
  }

  return {
    clearCache,
    scenarioFeatureStyle,
    invalidateStyle,
  };
}

export type UseFeatureStyles = ReturnType<typeof useFeatureStyles>;