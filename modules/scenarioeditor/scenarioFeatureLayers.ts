import { useEffect, useRef } from "react";
import OLMap from "ol/Map";
import { nanoid } from "@/utils";
import type { ScenarioFeatureLayerEvent } from "@/scenariostore/geo";
import type {
  FeatureId,
  ScenarioFeatureMeta,
  ScenarioLayer,
} from "@/types/scenarioGeoModels";
import type { NScenarioFeature, ScenarioLayerUpdate } from "@/types/internalModels";
import { type ProjectionLike, toLonLat } from "ol/proj";
import VectorLayer from "ol/layer/Vector";
import {
  createScenarioLayerFeatures,
  getOrCreateLayerGroup,
  LayerTypes,
} from "./featureLayerUtils";
import { type ActionLabel } from "@/scenariostore/newScenarioStore";
import VectorSource from "ol/source/Vector";
import { getFeatureAndLayerById, isCircle } from "@/hooks/openlayersHelpers"; // Renamed to hooks
import Feature from "ol/Feature";
import Circle from "ol/geom/Circle";
import { add as addCoordinate } from "ol/coordinate";
import { getLength } from "ol/sphere";
import LineString from "ol/geom/LineString";
import { point } from "@turf/helpers";
import { GeoJSON } from "ol/format";

// Store Imports
import { useActiveScenario } from "@/components/injects";
import { useFeatureStyles } from "@/geo/featureStyles";

const undoActionLabels: ActionLabel[] = [
  "deleteLayer",
  "moveLayer",
  "updateLayer",
  "batchLayer",
  "moveFeature",
  "deleteFeature",
  "addFeature",
  "updateFeatureGeometry",
  "updateFeature",
];

// A hook responsible for keeping scenario feature layers in sync with the OpenLayers map.
export function useScenarioFeatureLayers(olMap: OLMap | null) {
  const scn = useActiveScenario();
  const { scenarioFeatureStyle, clearCache, invalidateStyle } = useFeatureStyles(scn.geo);

  // Helper function definitions need to be inside the hook to access scope variables
  // or passed as stable callbacks.

  function getOlLayerById(layerId: FeatureId) {
    if (!olMap) return undefined;
    const olFeatureLayersGroup = getOrCreateLayerGroup(olMap);
    return olFeatureLayersGroup
      .getLayers()
      .getArray()
      .find((e) => e.get("id") === layerId) as VectorLayer<any>;
  }

  function olCreateScenarioFeatureLayer(
    layer: ScenarioLayer,
    options: { projection?: ProjectionLike; filterVisible?: boolean } = {},
  ) {
    const { projection = "EPSG:3837", filterVisible = true } = options;

    const vectorLayer = new VectorLayer({
      source: new VectorSource({
        features: createScenarioLayerFeatures(
          layer.features.filter((f) => !filterVisible || !f._hidden),
          projection,
        ),
      }),
      style: scenarioFeatureStyle,
      properties: {
        id: layer.id,
        title: layer.name,
        layerType: LayerTypes.scenarioFeature,
      },
      updateWhileInteracting: true,
      updateWhileAnimating: true,
    });
    if (layer.isHidden) vectorLayer.setVisible(false);
    return vectorLayer;
  }

  function olAddLayer(layerId: FeatureId) {
    if (!olMap) return;
    const olFeatureLayersGroup = getOrCreateLayerGroup(olMap);
    const featureLayer = scn.geo.getFullLayer(layerId);
    featureLayer &&
      olFeatureLayersGroup.getLayers().push(olCreateScenarioFeatureLayer(featureLayer));
  }

  function olDeleteLayer(layerId: FeatureId) {
    if (!olMap) return;
    const olFeatureLayersGroup = getOrCreateLayerGroup(olMap);
    const layer = getOlLayerById(layerId);
    if (layer) {
      layer.getSource()?.clear();
      olFeatureLayersGroup.getLayers().remove(layer);
    }
  }

  function olUpdateLayer(layerId: FeatureId, data: ScenarioLayerUpdate) {
    if (!olMap) return;
    const layer = getOlLayerById(layerId);
    if (!layer) {
      olAddLayer(layerId);
      return;
    }

    if (data.isHidden !== undefined) {
      layer.setVisible(!data.isHidden);
    }
    if (data.opacity !== undefined) {
      layer.setOpacity(data.opacity);
    }

    if (data.attributions !== undefined) {
      layer.getSource()?.setAttributions(data.attributions);
    }

    if (data.name !== undefined) {
      layer.set("title", data.name);
    }
  }

  function moveLayer(layerId: FeatureId) {
    if (!olMap) return;
    const olFeatureLayersGroup = getOrCreateLayerGroup(olMap);
    const layer = getOlLayerById(layerId);
    const newIndex = scn.geo.getLayerIndex(layerId);
    if (!layer) return;

    olFeatureLayersGroup.getLayers().remove(layer);
    olFeatureLayersGroup.getLayers().insertAt(newIndex, layer);
  }

  function olAddFeature(featureId: FeatureId) {
    if (!olMap) return;
    const { feature } = scn.geo.getFeatureById(featureId);
    if (!feature) return; // Guard
    const olLayer = getOlLayerById(feature._pid);
    if (!olLayer) return;
    const olFeature = createScenarioLayerFeatures([feature], "EPSG:3837");
    olLayer.getSource()?.addFeatures(olFeature);
  }

  function olDeleteFeature(featureId: FeatureId) {
    if (!olMap) return;
    const olFeatureLayersGroup = getOrCreateLayerGroup(olMap);
    const { feature: olFeature, layer } =
      getFeatureAndLayerById(featureId, olFeatureLayersGroup.getLayers() as any) || {};
    if (!(olFeature && layer)) return;
    layer.getSource()?.removeFeature(olFeature);
  }

  function initializeFeatureLayersFromStore(
    options: {
      doClearCache?: boolean;
      filterVisible?: boolean;
    } = {},
  ) {
    if (!olMap) return;
    const { doClearCache = true, filterVisible = true } = options;
    if (doClearCache) {
      clearCache();
    }
    const olFeatureLayersGroup = getOrCreateLayerGroup(olMap);
    const olLayers = olFeatureLayersGroup.getLayers();
    olLayers.clear();
    const projection = olMap.getView().getProjection();
    scn.geo.layers.forEach((layer) => { // Assuming layers is an array/reactive collection
      if (filterVisible && layer._hidden) return;
      const olLayer = olCreateScenarioFeatureLayer(layer, { projection, filterVisible });
      olLayers.push(olLayer);
    });
  }

  // --- Effects ---

  // 1. Subscribe to Feature Layer Events
  useEffect(() => {
    if (!olMap) return;

    const olFeatureLayersGroup = getOrCreateLayerGroup(olMap);

    function featureLayerEventHandler(event: ScenarioFeatureLayerEvent) {
      switch (event.type) {
        case "removeLayer":
          olDeleteLayer(event.id);
          break;
        case "addLayer":
          olAddLayer(event.id);
          break;
        case "moveLayer":
          moveLayer(event.id);
          break;
        case "updateLayer":
          olUpdateLayer(event.id, event.data);
          break;
        case "updateFeature":
          olDeleteFeature(event.id);
          const { feature } = scn.geo.getFeatureById(event.id);
          if (feature && !feature._hidden) {
            olAddFeature(event.id);
          }
          invalidateStyle(event.id);
          olFeatureLayersGroup.getLayers().forEach((layer) => layer.changed());
          break;
        case "moveFeature":
          initializeFeatureLayersFromStore({ doClearCache: false, filterVisible: false });
          break;
        case "deleteFeature":
          olDeleteFeature(event.id);
          break;
        case "addFeature":
          olAddFeature(event.id);
          break;
        default:
          console.warn("Unhandled feature layer event", event);
      }
    }

    const eventHandle = scn.geo.onFeatureLayerEvent(featureLayerEventHandler);
    return () => {
      if (eventHandle.off) eventHandle.off();
    };
  }, [olMap, scn.geo, invalidateStyle]); // Add dependencies

  // 2. Subscribe to Undo/Redo Events
  useEffect(() => {
    if (!olMap) return;
    const olFeatureLayersGroup = getOrCreateLayerGroup(olMap);

    const unsubscribe = scn.store.onUndoRedo(({ meta, action }) => {
      if (!meta || !undoActionLabels.includes(meta.label as ActionLabel)) return;
      const { label, value: layerOrFeatureId } = meta;

      if (label === "deleteLayer") {
        if (action === "undo") {
          olDeleteLayer(layerOrFeatureId);
        } else {
          olAddLayer(layerOrFeatureId);
        }
      } else if (label === "moveLayer") {
        moveLayer(layerOrFeatureId);
      } else if (label === "updateLayer") {
        const layer = scn.geo.getLayerById(layerOrFeatureId);
        if (layer) {
          olUpdateLayer(layerOrFeatureId, layer);
        }
      } else if (label === "batchLayer") {
        // FIXME ugly hack
        initializeFeatureLayersFromStore({ doClearCache: true, filterVisible: false });
      } else if (label === "moveFeature") {
        initializeFeatureLayersFromStore({ doClearCache: true, filterVisible: false });
      } else if (label === "updateFeature") {
        olDeleteFeature(layerOrFeatureId);
        const { feature } = scn.geo.getFeatureById(layerOrFeatureId);
        if (feature && !feature._hidden) {
          olAddFeature(layerOrFeatureId);
        }
        invalidateStyle(layerOrFeatureId);
        olFeatureLayersGroup.getLayers().forEach((layer) => layer.changed());
      } else if (label === "deleteFeature") {
        if (action === "undo") {
          olAddFeature(layerOrFeatureId);
        } else {
          olDeleteFeature(layerOrFeatureId);
        }
      } else if (label === "addFeature") {
        if (action === "undo") {
          olDeleteFeature(layerOrFeatureId);
        } else {
          olAddFeature(layerOrFeatureId);
        }
      } else if (label === "updateFeatureGeometry") {
        olDeleteFeature(layerOrFeatureId);
        olAddFeature(layerOrFeatureId);
      }
    });

    return () => unsubscribe();
  }, [olMap, scn.store]); // Add dependencies

  return {
    initializeFeatureLayersFromStore,
  };
}

// Utility function (Pure Logic - Kept as is)
export function convertOlFeatureToScenarioFeature(olFeature: Feature): NScenarioFeature {
  if (isCircle(olFeature)) {
    const circle = olFeature.getGeometry() as Circle;
    const { geometry, properties = {} } = olFeature.getProperties();
    const center = circle.getCenter();
    const r = addCoordinate([...center], [0, circle.getRadius()]);
    const meta: ScenarioFeatureMeta = {
      type: "Circle",
      radius: getLength(new LineString([center, r])),
    };

    return {
      ...point(toLonLat(circle.getCenter()), properties, {
        id: olFeature.getId() || nanoid(),
      }),
      meta,
      style: {},
    } as NScenarioFeature;
  }

  const gj = new GeoJSON({ featureProjection: "EPSG:3857" }).writeFeatureObject(
    olFeature,
  );

  return { ...gj, style: {}, meta: { type: gj.geometry.type } } as NScenarioFeature;
}