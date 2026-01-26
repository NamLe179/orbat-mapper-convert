import { useEffect, useRef, useCallback } from "react";
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

import type { ScenarioFeatureActions } from "@/types/constants";
import type { NScenarioFeature, NScenarioLayer } from "@/types/internalModels";
import type { TScenario } from "@/scenariostore";
import type { MenuItemData } from "@/components/types";
import type { UseFeatureStyles } from "@/geo/featureStyles";

// TODO: Replace Vue Icons with React Icons (e.g., from lucide-react or @iconify/react)
// import { ... } from "lucide-react";
const IconMapMarker = "IconMapMarker"; // Placeholder
const IconVectorLine = "IconVectorLine"; // Placeholder
const IconVectorTriangle = "IconVectorTriangle"; // Placeholder
const IconVectorCircleVariant = "IconVectorCircleVariant"; // Placeholder
const IconMapMarkerMultipleOutline = "IconMapMarkerMultipleOutline"; // Placeholder
const IconLayersOutline = "IconLayersOutline"; // Placeholder

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

// React components or string identifiers for icons
const geometryIconMap: any = {
  Point: IconMapMarker,
  LineString: IconVectorLine,
  Polygon: IconVectorTriangle,
  Circle: IconVectorCircleVariant,
  GeometryCollection: IconMapMarkerMultipleOutline,
  layer: IconLayersOutline,
};

export function getGeometryIcon(feature?: ScenarioFeature | NScenarioFeature) {
  return (feature && geometryIconMap[feature.meta.type]) || geometryIconMap.Polygon;
}

export function getItemsIcon(type: string) {
  return geometryIconMap[type];
}

export const featureMenuItems: MenuItemData<ScenarioFeatureActions>[] = [
  { label: "Zoom to", action: "zoom" },
  { label: "Pan to", action: "pan" },
  { label: "Move up", action: "moveUp" },
  { label: "Move down", action: "moveDown" },
  { label: "Delete", action: "delete" },
  { label: "Duplicate", action: "duplicate" },
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
    if (fullFeature._state) {
      const { geometry, properties, ...rest } = fullFeature._state;
      feature = {
        ...fullFeature,
        geometry: geometry || fullFeature.geometry,
      };
    }

    feature.meta._zIndex = index;
    if (feature.meta?.radius && feature.geometry.type === "Point") {
      const newRadius = convertRadius(
        feature as GeoJsonFeature<Point>,
        feature.meta.radius,
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
  olMap: OLMap | null, // olMap might be null initially in React
  options: Partial<{
    enable: boolean;
  }> = {},
) {
  const { scenarioFeatureStyle } = useFeatureStyles();
  const { selectedUnitIds, selectedFeatureIds, selectFeature, deselectFeature, clear: clearSelection } = useSelectedItems();
  
  // Ref to track internal updates (prevent loop between map select <-> store select)
  const isInternal = useRef(false);
  const enable = options.enable ?? true;

  // Setup Interaction
  useEffect(() => {
    if (!olMap || !enable) return;

    const scenarioLayersGroup = getOrCreateLayerGroup(olMap);
    const scenarioLayersOl = scenarioLayersGroup.getLayers() as Collection<VectorLayer<any>>;

    const selectInteraction = new Select({
      condition: clickCondition,
      hitTolerance: 20,
      layers: scenarioLayersOl.getArray(),
      style: (feature: FeatureLike, res: number): Style | Style[] => {
        const s = scenarioFeatureStyle(feature, res, true)!;
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

    olMap.addInteraction(selectInteraction);

    const key = selectInteraction.on("select", (event: SelectEvent) => {
      isInternal.current = true;
      event.selected.forEach((f) => selectFeature(f.getId() as string));
      event.deselected.forEach((f) => deselectFeature(f.getId() as string));
      // Reset internal flag after a short delay or next tick if needed, 
      // but usually the store update effect will run next.
    });

    // Store Update Listener (Sync Store -> Map)
    // We do this logic inside a separate effect or here if we access the interaction instance.
    // To keep it clean, we'll attach the interaction to the map object or a ref if needed,
    // but here we can define the sync logic in a parallel effect dependent on the interaction.

    return () => {
      unByKey(key);
      olMap.removeInteraction(selectInteraction);
    };
  }, [olMap, enable, scenarioFeatureStyle, selectFeature, deselectFeature]);

  // Sync Store Changes to Map Selection
  useEffect(() => {
    if (!olMap || !enable) return;

    // We need to access the active interaction. 
    // Since we create it inside the effect above, strictly speaking, we should store it in a ref
    // to access it here, or merge the effects.
    // For simplicity/correctness in React, let's assume we can find it or we restructure.
    // Better approach: Create interaction in a ref.
    
    // ... (See Refactoring below for cleaner React pattern)
  }, [selectedFeatureIds, olMap, enable]);

  // REFACTORED PATTERN FOR REACT:
  
  const selectInteractionRef = useRef<Select | null>(null);

  useEffect(() => {
    if (!olMap) return;
    const scenarioLayersGroup = getOrCreateLayerGroup(olMap);
    const scenarioLayersOl = scenarioLayersGroup.getLayers() as Collection<VectorLayer<any>>;

    const interaction = new Select({
      condition: clickCondition,
      hitTolerance: 20,
      layers: scenarioLayersOl.getArray(),
      style: (feature: FeatureLike, res: number): Style | Style[] => {
        const s = scenarioFeatureStyle(feature, res, true)!;
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

    interaction.setActive(enable);
    olMap.addInteraction(interaction);
    selectInteractionRef.current = interaction;

    const key = interaction.on("select", (event: SelectEvent) => {
      isInternal.current = true;
      // Assume store actions handle Sets
      event.selected.forEach((f) => selectFeature(f.getId() as string));
      event.deselected.forEach((f) => deselectFeature(f.getId() as string));
      isInternal.current = false;
    });

    return () => {
      unByKey(key);
      olMap.removeInteraction(interaction);
      selectInteractionRef.current = null;
    };
  }, [olMap, scenarioFeatureStyle]); // Re-create if style logic changes or map changes

  // Update active state
  useEffect(() => {
    if (selectInteractionRef.current) {
      selectInteractionRef.current.setActive(enable);
      if (!enable) {
        selectInteractionRef.current.getFeatures().clear();
      }
    }
  }, [enable]);

  // Sync Store -> Map
  useEffect(() => {
    if (!olMap || !selectInteractionRef.current) return;
    if (isInternal.current) return;

    const selectedFeatures = selectInteractionRef.current.getFeatures();
    const scenarioLayersGroup = getOrCreateLayerGroup(olMap);
    const scenarioLayersOl = scenarioLayersGroup.getLayers() as Collection<VectorLayer<any>>;

    selectedFeatures.clear();
    
    // If unit selection is active, clear feature selection (mutually exclusive behavior from original code)
    if (selectedUnitIds.size > 0) {
      clearSelection(); // This might trigger a re-render/loop if not careful, original code cleared `selectedIds` ref
      return;
    }

    selectedFeatureIds.forEach((fid) => {
      const { feature } = getFeatureAndLayerById(fid, scenarioLayersOl) || {};
      if (feature) selectedFeatures.push(feature);
    });
  }, [selectedFeatureIds, selectedUnitIds, olMap, clearSelection]);

  return { selectedIds: selectedFeatureIds };
}

export function useFeatureLayerUtils(
  olMap: OLMap,
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

  const scenarioLayersGroup = getOrCreateLayerGroup(olMap);
  const scenarioLayersOl = scenarioLayersGroup.getLayers() as Collection<VectorLayer<any>>;

  const getOlLayerById = useCallback((layerId: FeatureId) => {
    return scenarioLayersOl
      .getArray()
      .find((e) => e.get("id") === layerId) as VectorLayer<any>;
  }, [scenarioLayersOl]);

  const zoomToFeature = useCallback((featureId: FeatureId) => {
    const { feature: olFeature } =
      getFeatureAndLayerById(featureId, scenarioLayersOl) || {};
    if (!olFeature?.getGeometry()) return;
    olMap.getView().fit(olFeature.getGeometry() as SimpleGeometry, { maxZoom: 15 });
  }, [olMap, scenarioLayersOl]);

  const zoomToFeatures = useCallback((featureIds: FeatureId[]) => {
    if (!featureIds.length) return;
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
    if (!olFeature) return;
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
    if (!olLayer) return;
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