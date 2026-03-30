import { useEffect, useRef, useCallback, useMemo } from "react";
import OLMap from "ol/Map";
import VectorLayer from "ol/layer/Vector";
import LayerGroup from "ol/layer/Group";
import { click as clickCondition } from "ol/events/condition";
import { getCenter, isEmpty } from "ol/extent";
import { featureCollection } from "@turf/helpers";
import turfEnvelope from "@turf/envelope";
import { nanoid } from "@/utils";
import { Collection } from "ol";
import { getFeatureAndLayerById } from "@/hooks/openlayersHelpers"; // composables -> hooks
import GeoJSON from "ol/format/GeoJSON";
import Feature, { type FeatureLike } from "ol/Feature";
import type { FeatureId, ScenarioFeature } from "@/types/scenarioGeoModels";
import Circle from "ol/geom/Circle";
import { fromLonLat, type ProjectionLike } from "ol/proj";
import LineString from "ol/geom/LineString";
import type { Feature as GeoJsonFeature, Point } from "geojson";
import destination from "@turf/destination";
import { unByKey } from "ol/Observable";
import type { EventsKey } from "ol/events";
import Select, { type SelectEvent } from "ol/interaction/Select";
import Fill from "ol/style/Fill";
import Style from "ol/style/Style";
import Stroke from "ol/style/Stroke";
import CircleStyle from "ol/style/Circle";
import { SimpleGeometry } from "ol/geom";

// Store / Context imports (Replaces injectStrict)
import { useSelectedItems } from "@/stores/selectedStore";
import { useActiveScenario } from "@/components/injects"; // Hypothetical hook
import { useFeatureStyles } from "@/geo/featureStyles"; // Hypothetical hook
import { getFeatureRuntimeState } from "@/scenariostore/runtimeState";

import type { ScenarioFeatureActions } from "@/types/constants";
import type { NScenarioFeature, NScenarioLayer } from "@/types/internalModels";
import type { TScenario } from "@/scenariostore";
import type { MenuItemData } from "@/components/types";
import type { UseFeatureStyles } from "@/geo/featureStyles";

// React Icons
import { 
  MapPin, 
  Minus, 
  Triangle, 
  Circle as CircleIcon, 
  MapPinned, 
  Layers 
} from "lucide-react";

const selectStyle = new Style({
  stroke: new Stroke({ color: "#ffff00", width: 9 }),
  image: new CircleStyle({
    radius: 15,
    fill: new Fill({
      color: "#ffff00",
    }),
  }),
});

const selectMarkerStyle = new Style({
  image: new CircleStyle({
    radius: 15,
    fill: new Fill({
      color: "#ffff00",
    }),
  }),
});

export const LayerTypes = {
  scenarioFeature: "SCENARIO_FEATURE",
  units: "UNITS",
  labels: "LABELS",
} as const;

export type LayerType = (typeof LayerTypes)[keyof typeof LayerTypes];

// React components for geometry icons
const geometryIconMap: any = {
  Point: MapPin,
  LineString: Minus,
  Polygon: Triangle,
  Circle: CircleIcon,
  GeometryCollection: MapPinned,
  layer: Layers,
};

export function getGeometryIcon(feature?: ScenarioFeature | NScenarioFeature) {
  return (feature && geometryIconMap[feature.meta.type]) || geometryIconMap.Polygon;
}

export function getItemsIcon(type: string) {
  return geometryIconMap[type];
}

export const featureMenuItems: MenuItemData<ScenarioFeatureActions>[] = [
  { label: "Zoom to", action: "zoom" },
  { label: "Set as active", action: "setActive" },
  { label: "Edit", action: "edit" },
  { label: "Pan to", action: "pan" },
  { label: "Move up", action: "moveUp" },
  { label: "Move down", action: "moveDown" },
  { label: "Duplicate", action: "duplicate" },
  { label: "Delete", action: "delete" },
];

const layersMap = new WeakMap<OLMap, LayerGroup>();

function convertRadius(center: GeoJsonFeature<Point>, radiusInMeters: number): number {
  const p = destination(center, radiusInMeters / 1000, 90);
  const line = new LineString([center.geometry.coordinates, p.geometry.coordinates]);
  line.transform("EPSG:4326", "EPSG:3857");
  return line.getLength();
}

export function createScenarioLayerFeatures(
  features: NScenarioFeature[] | ScenarioFeature[],
  featureProjection: ProjectionLike,
) {
  const gjson = new GeoJSON({
    dataProjection: "EPSG:4326",
    featureProjection,
  });
  const olFeatures: Feature[] = [];
  features.forEach((fullFeature, index) => {
    let feature = fullFeature;
    const runtimeState = getFeatureRuntimeState(fullFeature.id);
    if (runtimeState) {
      const { geometry } = runtimeState;
      feature = {
        ...fullFeature,
        geometry: geometry || fullFeature.geometry,
      };
    }

    // Clone meta to avoid mutating frozen object
    const meta = { ...feature.meta, _zIndex: index };
    if (meta?.radius && feature.geometry.type === "Point") {
      const newRadius = convertRadius(
        feature as GeoJsonFeature<Point>,
        meta.radius,
      );
      const circle = new Circle(
        fromLonLat(feature.geometry.coordinates as number[]),
        newRadius,
      );
      let f = new Feature({
        geometry: circle,
        ...feature.properties,
      });
      f.setId(feature.id);
      olFeatures.push(f);
    } else {
      const f = gjson.readFeature(feature, {
        featureProjection: "EPSG:3857",
        dataProjection: "EPSG:4326",
      }) as Feature;
      olFeatures.push(f);
    }
  });
  return olFeatures;
}

/**
 * Hook to handle feature selection interactions on the map.
 */
export function useScenarioFeatureSelect(
  olMap: OLMap | null,
  options: Partial<{
    enable: boolean;
  }> = {},
) {
  const { scenarioFeatureStyle } = useFeatureStyles();
  const { selectedUnitIds, selectedFeatureIds, selectFeature, deselectFeature, clear: clearSelection } = useSelectedItems();
  
  const isInternal = useRef(false);
  const enable = options.enable ?? true;

  // Ref để giữ style function mới nhất mà không cần recreate interaction
  const styleRef = useRef(scenarioFeatureStyle);
  useEffect(() => { styleRef.current = scenarioFeatureStyle; }, [scenarioFeatureStyle]);

  // 1. Tạo Interaction bằng useMemo (thay vì trong useEffect)
  const selectInteraction = useMemo(() => {
    if (!olMap) return null;

    const scenarioLayersGroup = getOrCreateLayerGroup(olMap);
    const scenarioLayersOl = scenarioLayersGroup.getLayers() as Collection<VectorLayer<any>>;

    const interaction = new Select({
      condition: clickCondition,
      hitTolerance: 20,
      layers: scenarioLayersOl.getArray(),
      style: (feature: FeatureLike, res: number): Style | Style[] => {
        // Dùng ref để gọi style function mới nhất
        const s = styleRef.current(feature, res, true)!;
        let activeSelectStyle: Style;
        if (feature.getGeometry()?.getType() === "Point") {
          activeSelectStyle = selectMarkerStyle;
        } else {
          selectStyle.getStroke()?.setWidth((s.getStroke()?.getWidth() || 0) + 8);
          activeSelectStyle = selectStyle;
        }
        return [activeSelectStyle, s];
      },
    });
    return interaction;
  }, [olMap]); // Chỉ tạo lại khi olMap thay đổi

  // 2. Quản lý Events và Add/Remove Interaction
  useEffect(() => {
    if (!olMap || !selectInteraction) return;

    // Add to map
    olMap.addInteraction(selectInteraction);
    selectInteraction.setActive(enable);

    // Event Listener
    const key = selectInteraction.on("select", (event: SelectEvent) => {
      isInternal.current = true;
      event.selected.forEach((f) => selectFeature(f.getId() as string));
      event.deselected.forEach((f) => deselectFeature(f.getId() as string));
      isInternal.current = false;
    });

    return () => {
      unByKey(key);
      olMap.removeInteraction(selectInteraction);
    };
  }, [olMap, selectInteraction, enable, selectFeature, deselectFeature]);

  // 3. Sync Store Changes -> Map Selection (External Update)
  useEffect(() => {
    if (!olMap || !selectInteraction) return;
    // Nếu đang trigger từ interaction thì bỏ qua để tránh loop
    if (isInternal.current) return;

    const selectedFeatures = selectInteraction.getFeatures();
    const scenarioLayersGroup = getOrCreateLayerGroup(olMap);
    const scenarioLayersOl = scenarioLayersGroup.getLayers() as Collection<VectorLayer<any>>;

    selectedFeatures.clear();
    
    // Ưu tiên Unit Selection (nếu có unit chọn thì clear feature)
    if (selectedUnitIds.size > 0) {
      if (selectedFeatureIds.size > 0) clearSelection();
      return;
    }

    selectedFeatureIds.forEach((fid) => {
      const { feature } = getFeatureAndLayerById(fid, scenarioLayersOl) || {};
      if (feature) selectedFeatures.push(feature);
    });
  }, [selectedFeatureIds, selectedUnitIds, olMap, selectInteraction, clearSelection]);

  return { 
    selectInteraction, 
    selectedIds: selectedFeatureIds 
  };
}

export function useFeatureLayerUtils(
  olMap: OLMap | null,
  options: { activeScenario?: TScenario; activeScenarioFeatures?: UseFeatureStyles } = {},
) {
  // Use passed scenario or fall back to context hook
  const contextScenario = useActiveScenario(); 
  const activeScenario = options.activeScenario || contextScenario;
  
  if (!activeScenario) {
    throw new Error("Active Scenario is required for useFeatureLayerUtils");
  }

  const {
    geo,
    store: { state },
  } = activeScenario;

  const scenarioLayersGroup = olMap ? getOrCreateLayerGroup(olMap) : new LayerGroup();
  const scenarioLayersOl = scenarioLayersGroup.getLayers() as Collection<VectorLayer<any>>;

  const getOlLayerById = useCallback((layerId: FeatureId) => {
    return scenarioLayersOl
      .getArray()
      .find((e) => e.get("id") === layerId) as VectorLayer<any>;
  }, [scenarioLayersOl]);

  const zoomToFeature = useCallback((featureId: FeatureId) => {
    const { feature: olFeature } =
      getFeatureAndLayerById(featureId, scenarioLayersOl) || {};
    if (!olFeature?.getGeometry() || !olMap) return;
    olMap.getView().fit(olFeature.getGeometry() as SimpleGeometry, { maxZoom: 15 });
  }, [olMap, scenarioLayersOl]);

  const zoomToFeatures = useCallback((featureIds: FeatureId[]) => {
    if (!featureIds.length || !olMap) return;
    const features = featureIds.map((fid) => state.featureMap[fid]).filter(Boolean);
    if (!features.length) return;

    const c = featureCollection(features);
    const envelope = turfEnvelope(c);
    const bb = new GeoJSON().readFeature(envelope, {
      featureProjection: "EPSG:3857",
      dataProjection: "EPSG:4326",
    }) as Feature<any>;
    
    if (!bb) return;
    olMap.getView().fit(bb.getGeometry(), { maxZoom: 17 });
  }, [olMap, state.featureMap]);

  const panToFeature = useCallback((featureId: FeatureId) => {
    const { feature: olFeature } =
      getFeatureAndLayerById(featureId, scenarioLayersOl) || {};
    if (!olFeature || !olMap) return;
    const view = olMap.getView();
    const extent = olFeature?.getGeometry()?.getExtent();
    if (extent) {
      view.animate({
        center: getCenter(extent),
      });
    }
  }, [olMap, scenarioLayersOl]);

  const zoomToLayer = useCallback((layerId: FeatureId) => {
    const olLayer = getOlLayerById(layerId);
    if (!olLayer || !olMap) return;
    const layerExtent = olLayer.getSource()?.getExtent();

    if (layerExtent && !isEmpty(layerExtent)) {
      olMap.getView().fit(layerExtent);
    }
  }, [olMap, getOlLayerById]);

  const getLayerById = useCallback((layerId: FeatureId): NScenarioLayer | undefined | null => {
    return geo.getLayerById(layerId);
  }, [geo]);

  return {
    scenarioLayersGroup,
    scenarioLayers: geo.layers, // Note: check if this is reactive in React context
    scenarioLayersFeatures: geo.layersFeatures,
    getOlLayerById,
    zoomToFeature,
    zoomToFeatures,
    zoomToLayer,
    panToFeature,
    getLayerById,
  };
}

export function getOrCreateLayerGroup(olMap: OLMap) {
  if (layersMap.has(olMap)) return layersMap.get(olMap)!;

  const layerGroup = new LayerGroup({
    properties: { id: nanoid(), title: "Scenario layers" },
  });
  layersMap.set(olMap, layerGroup);
  olMap.addLayer(layerGroup);
  return layerGroup;
}

export function useScenarioLayerSync(olLayers: Collection<VectorLayer<any>>) {
  const { geo } = useActiveScenario();

  useEffect(() => {
    const eventKeys: EventsKey[] = [];

    function addListener(l: VectorLayer<any>) {
      eventKeys.push(
        l.on("change:visible", (event) => {
          const isVisible = l.getVisible();
          // Assuming geo.updateLayer is safe to call from here
          geo.updateLayer(l.get("id"), { isHidden: !isVisible }, { undoable: false });
        })
      );
    }

    // Attach to existing
    olLayers.forEach((l) => {
      addListener(l);
    });

    // Listen for new additions
    const addKey = olLayers.on("add", (event) => {
      const addedLayer = event.element as VectorLayer<any>;
      addListener(addedLayer);
    });
    eventKeys.push(addKey);

    return () => {
      eventKeys.forEach((key) => unByKey(key));
    };
  }, [olLayers, geo]);
}