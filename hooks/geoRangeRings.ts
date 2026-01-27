import { useEffect, useMemo, useRef, useCallback } from "react";
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
import { convertToMetric } from "@/utils/convert";
import { createSimpleStyle } from "@/geo/simplestyle";
import { useActiveScenario } from "@/components/injects"; // Import store

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

const gjf = new GeoJSON({
  featureProjection: "EPSG:3857",
  dataProjection: "EPSG:4326",
});

function createRangeRings(unit: NUnit) {
  return (
    unit.rangeRings
      ?.map((r, i) =>
        !r.hidden && unit._state?.location
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

function useRangeRingStyles() {
  const styleCache = useRef(new Map<string, Style>());
  const { geo } = useActiveScenario();
  
  // Lấy units trực tiếp từ store thay vì truyền qua args
  // Lưu ý: geo.everyVisibleUnit có thể là getter hoặc array.
  // Giả định là array hoặc ta dùng useMemo để access.
  const units = geo.everyVisibleUnit; 

  // Refs để giữ data mới nhất cho style function
  const unitsRef = useRef(units);
  useEffect(() => { unitsRef.current = units; }, [units]);

  const clearCache = () => {
    styleCache.current.clear();
  };

  const rangeRingStyle = useCallback((feature: FeatureLike, resolution: number): Style | Style[] => {
    const id = feature.get("id");
    let style = styleCache.current.get(id);

    if (!style) {
      const isGroup = feature.get("isGroup");
      const currentUnits = unitsRef.current; // Dùng Ref để tránh closure cũ

      if (isGroup) {
        // Mock logic group style (cần mapSettingsStore nếu muốn lấy group map thực tế)
        style = defaultStyle; 
      } else {
        const parts = id.split("-");
        const indexStr = parts.pop();
        const unitId = parts.join("-");
        const index = parseInt(indexStr || "0", 10);
        
        const unit = currentUnits.find((u) => u.id === unitId);
        const ring = unit?.rangeRings?.[index];
        
        style = ring?.style
          ? createSimpleStyle({ fill: null, stroke: "red", ...ring.style })
          : defaultStyle;
      }
      styleCache.current.set(id, style);
    }
    return style;
  }, []);

  return { clearCache, rangeRingStyle };
}

// --- Main Hook ---

export function useRangeRingsLayer(olMap: OLMap | null) {
  const { geo } = useActiveScenario();
  const units = geo.everyVisibleUnit; // Lấy data từ context

  // 1. Setup Layer
  const layer = useMemo(() => createLayer(), []);
  
  // 2. Setup Style Logic
  const { rangeRingStyle, clearCache } = useRangeRingStyles();

  useEffect(() => {
    layer.setStyle(rangeRingStyle);
  }, [layer, rangeRingStyle]);

  // 3. Add/Remove Layer
  useEffect(() => {
    if (!olMap) return;
    olMap.addLayer(layer);
    return () => {
      olMap.removeLayer(layer);
    };
  }, [olMap, layer]);

  // 4. Draw Function (Exposed)
  const drawRangeRings = useCallback(() => {
    const source = layer.getSource();
    if (!source) return;

    source.clear();
    clearCache();

    // Lọc units có rings
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

    // Xử lý Group
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

    // Xử lý không group
    if (unGrouped.features.length > 0) {
      source.addFeatures(gjf.readFeatures(unGrouped) as Feature[]);
    }
  }, [units, layer, clearCache]);

  // Tự động vẽ khi units thay đổi
  useEffect(() => {
    drawRangeRings();
  }, [drawRangeRings]);

  return { rangeLayer: layer, drawRangeRings };
}