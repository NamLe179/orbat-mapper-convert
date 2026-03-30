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
import type { Feature as GeoJsonFeature, Polygon } from "geojson";

// Project imports
import type { NUnit } from "@/types/internalModels";
import { convertToMetric } from "@/utils/convert";
import { createSimpleStyle } from "@/geo/simplestyle";
import { useActiveScenario } from "@/components/injects"; // Import store
import { getUnitRuntimeState } from "@/scenariostore/runtimeState";

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
  const runtimeState = getUnitRuntimeState(unit.id);
  return (
    unit.rangeRings
      ?.map((r, i) =>
        !r.hidden && runtimeState?.location
          ? circle(
              runtimeState.location,
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
  const renderSignatureRef = useRef(new Map<string, string>());
  const groupedMergeCacheRef = useRef(
    new Map<string, { inputSignature: string; merged: GeoJsonFeature<Polygon> }>(),
  );

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

    const existingById = new Map<string, Feature>();
    source.getFeatures().forEach((feature) => {
      const id = feature.get("id");
      if (typeof id === "string") {
        existingById.set(id, feature as Feature);
      }
    });

    // Lọc units có rings
    const unitsWithRings = units.filter((u) => u.rangeRings?.length);
    if (unitsWithRings.length === 0) {
      source.clear();
      renderSignatureRef.current.clear();
      groupedMergeCacheRef.current.clear();
      return;
    }

    const rangeRingsFeatures = unitsWithRings.map(createRangeRings).flat();
    const rangeRingsFC = featureCollection(rangeRingsFeatures);

    const unGrouped = featureCollection(
      rangeRingsFC.features.filter((r) => !r.properties.isGroup),
    );
    const grouped = featureCollection(
      rangeRingsFC.features.filter((r) => r.properties.isGroup),
    );

    const expectedIds = new Set<string>();

    // Xử lý không group (incremental)
    unGrouped.features.forEach((ring) => {
      const id = String(ring.properties?.id ?? "");
      if (!id) return;

      expectedIds.add(id);
      const signature = JSON.stringify(ring.geometry.coordinates);
      const previousSignature = renderSignatureRef.current.get(id);
      const existing = existingById.get(id);

      if (existing && previousSignature === signature) {
        return;
      }

      if (existing) {
        source.removeFeature(existing);
      }
      source.addFeature(gjf.readFeature(ring) as Feature);
      renderSignatureRef.current.set(id, signature);
    });

    // Xử lý Group (cache merge theo input signature)
    clusterEach(grouped, "id", (cluster) => {
      if (!cluster.features.length) return;
      const id = String(cluster.features[0].properties.id ?? "");
      if (!id) return;

      expectedIds.add(id);
      const inputSignature = cluster.features
        .map((f) => JSON.stringify(f.geometry.coordinates))
        .join("|");

      let merged = groupedMergeCacheRef.current.get(id);
      if (!merged || merged.inputSignature !== inputSignature) {
        const mergedFeature =
          cluster.features.length > 1
            ? (union(cluster, {
                properties: { id, isGroup: true },
              }) as GeoJsonFeature<Polygon> | null)
            : (cluster.features[0] as GeoJsonFeature<Polygon>);

        if (!mergedFeature) return;
        merged = { inputSignature, merged: mergedFeature };
        groupedMergeCacheRef.current.set(id, merged);
      }

      const geometrySignature = JSON.stringify(merged.merged.geometry.coordinates);
      const previousSignature = renderSignatureRef.current.get(id);
      const existing = existingById.get(id);

      if (existing && previousSignature === geometrySignature) {
        return;
      }

      if (existing) {
        source.removeFeature(existing);
      }
      source.addFeature(gjf.readFeature(merged.merged) as Feature);
      renderSignatureRef.current.set(id, geometrySignature);
    });

    // Remove stale range-ring features
    existingById.forEach((feature, id) => {
      if (!expectedIds.has(id)) {
        source.removeFeature(feature);
        renderSignatureRef.current.delete(id);
        groupedMergeCacheRef.current.delete(id);
      }
    });

    clearCache();
  }, [units, layer, clearCache]);

  // Tự động vẽ khi units thay đổi
  useEffect(() => {
    drawRangeRings();
  }, [drawRangeRings]);

  return { rangeLayer: layer, drawRangeRings };
}