import { useEffect, useMemo, useRef } from "react";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { GeoJSON } from "ol/format";
import { Stroke, Style } from "ol/style";
import type Feature from "ol/Feature";
import { type FeatureLike } from "ol/Feature";
import type OLMap from "ol/Map";

// Turf imports
import { clusterEach } from "@turf/clusters";
import circle from "@turf/circle";
import union from "@turf/union";
import { featureCollection } from "@turf/helpers";

// Project imports
import type { NUnit } from "@/types/internalModels";
import type { FeatureId } from "@/types/scenarioGeoModels";
import { convertToMetric } from "@/utils/convert";
import { createSimpleStyle } from "@/geo/simplestyle";

// --- Helpers & Styles ---

const defaultStyle = new Style({
  stroke: new Stroke({ width: 2, color: "red" }),
});

function createLayer() {
  const layer = new VectorLayer({
    source: new VectorSource(),
    style: defaultStyle,
  });
  layer.set("title", "Range rings");
  return layer;
}

// Format instance (tạo 1 lần dùng chung)
const gjf = new GeoJSON({
  featureProjection: "EPSG:3857",
  dataProjection: "EPSG:4326",
});

function createRangeRings(unit: NUnit) {
  return (
    unit.rangeRings
      ?.map((r, i) =>
        !r.hidden && unit._state?.location // Thêm check location an toàn
          ? circle(
              unit._state.location,
              convertToMetric(r.range, r.uom || "km") / 1000,
              {
                properties: {
                  id: r.group ? r.group : `${unit.id}-${i}`,
                  isGroup: !!r.group,
                },
              },
            )
          : null,
      )
      .filter((e): e is NonNullable<typeof e> => e !== null) || []
  );
}

// --- Internal Hook for Styles ---

function useRangeRingStyles(
  units: NUnit[],
  rangeRingGroupMap: Record<string, any>
) {
  const styleCache = useRef(new Map<string, Style>());
  
  // Refs để styleFunction luôn đọc được dữ liệu mới nhất mà không cần recreate function
  const dataRef = useRef({ units, rangeRingGroupMap });
  useEffect(() => {
    dataRef.current = { units, rangeRingGroupMap };
  }, [units, rangeRingGroupMap]);

  const clearCache = () => {
    styleCache.current.clear();
  };

  const rangeRingStyle = (feature: FeatureLike, resolution: number): Style | Style[] => {
    const id = feature.get("id");
    let style = styleCache.current.get(id);

    if (!style) {
      const isGroup = feature.get("isGroup");
      const { units, rangeRingGroupMap } = dataRef.current;

      if (isGroup) {
        const groupStyle = rangeRingGroupMap[id]?.style;
        style = groupStyle
          ? createSimpleStyle({ fill: null, stroke: "red", ...groupStyle })
          : defaultStyle;
      } else {
        const parts = id.split("-");
        const indexStr = parts.pop();
        const unitId = parts.join("-");
        const index = parseInt(indexStr || "0", 10);
        
        const unit = units.find(u => u.id === unitId);
        const ring = unit?.rangeRings?.[index];
        
        style = ring?.style
          ? createSimpleStyle({ fill: null, stroke: "red", ...ring.style })
          : defaultStyle;
      }
      styleCache.current.set(id, style);
    }
    return style;
  };

  return {
    clearCache,
    rangeRingStyle,
  };
}

// --- Main Hook ---

export function useRangeRingsLayer(
  olMap: OLMap | null,
  units: NUnit[], // Danh sách units (filtered/visible)
  rangeRingGroupMap: Record<string, any> = {} // Map style settings
) {
  // 1. Setup Layer
  const layer = useMemo(() => createLayer(), []);
  
  // 2. Setup Style Logic
  const { rangeRingStyle, clearCache } = useRangeRingStyles(units, rangeRingGroupMap);

  // Gán style function cho layer
  useEffect(() => {
    layer.setStyle(rangeRingStyle);
  }, [layer, rangeRingStyle]);

  // 3. Add/Remove Layer on Map
  useEffect(() => {
    if (!olMap) return;
    olMap.addLayer(layer);
    return () => {
      olMap.removeLayer(layer);
    };
  }, [olMap, layer]);

  // 4. Draw Logic (Chạy khi units thay đổi)
  useEffect(() => {
    if (!olMap) return;

    const source = layer.getSource();
    if (!source) return;

    // Clear cũ
    source.clear();
    clearCache();

    // Tính toán Features (Turf JS logic)
    // Lọc các unit có rangeRings
    const unitsWithRings = units.filter((u) => u.rangeRings?.length);
    if (unitsWithRings.length === 0) return;

    const rangeRingsFeatures = unitsWithRings.map(createRangeRings).flat();
    const rangeRingsFC = featureCollection(rangeRingsFeatures);

    const unGrouped = featureCollection(
      rangeRingsFC.features.filter((r) => !r.properties.isGroup),
    );
    const grouped = featureCollection(
      rangeRingsFC.features.filter((r) => r.properties.isGroup),
    );

    // Xử lý Group (Cluster & Union)
    clusterEach(grouped, "id", (cluster) => {
      if (!cluster.features.length) return;
      
      const merged =
        cluster.features.length > 1
          ? union(cluster, {
              properties: { id: cluster.features[0].properties.id, isGroup: true },
            })
          : cluster.features[0];
          
      if (merged) {
        source.addFeature(gjf.readFeature(merged) as Feature);
      }
    });

    // Thêm các feature không group
    if (unGrouped.features.length > 0) {
      source.addFeatures(gjf.readFeatures(unGrouped) as Feature[]);
    }

  }, [units, olMap, layer]); // Re-run khi danh sách unit thay đổi

  return { rangeLayer: layer };
}