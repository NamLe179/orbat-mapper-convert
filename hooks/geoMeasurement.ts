import { useEffect, useRef } from "react";
import OLMap from "ol/Map";
import { Circle as CircleStyle, Fill, RegularShape, Stroke, Style, Text } from "ol/style";
import Draw, { DrawEvent } from "ol/interaction/Draw";
import Modify from "ol/interaction/Modify";
import { Geometry, LineString, Point, Polygon, SimpleGeometry } from "ol/geom";
import { Vector as VectorSource } from "ol/source";
import { Vector as VectorLayer } from "ol/layer";
import { getArea, getLength } from "ol/sphere";
import Feature from "ol/Feature";
import { primaryAction } from "ol/events/condition";
import Snap from "ol/interaction/Snap";
import { Collection } from "ol";
import type { EventsKey } from "ol/events";
import { unByKey } from "ol/Observable";
import { circular } from "ol/geom/Polygon";

// Giả định đường dẫn helper, điều chỉnh nếu cần
import { getSnappableFeatures } from "./openlayersHelpers"; 
import { formatArea, formatLength } from "@/geo/utils";

export type MeasurementTypes = "LineString" | "Polygon";
export type MeasurementUnit = "metric" | "imperial" | "nautical";

// --- Static Styles (Giữ nguyên từ bản gốc) ---
const style = new Style({
  fill: new Fill({ color: "rgba(255, 255, 255, 0.2)" }),
  stroke: new Stroke({ color: "rgb(0, 0, 0)", lineDash: [10, 10], width: 2 }),
  image: new CircleStyle({
    radius: 5,
    stroke: new Stroke({ color: "rgba(0, 0, 0, 0.7)" }),
    fill: new Fill({ color: "rgba(255, 255, 255, 0.2)" }),
  }),
});

const circleStyle = new Style({
  stroke: new Stroke({ color: "rgb(0, 0, 0)", lineDash: [10, 10], width: 2 }),
});

const lineBackgroundStyle = new Style({
  stroke: new Stroke({ color: "rgba(255, 255, 255, 0.7)", width: 5 }),
});

const labelStyle = new Style({
  text: new Text({
    font: '14px "Inter Variable", sans-serif',
    fill: new Fill({ color: "rgba(255, 255, 255, 1)" }),
    backgroundFill: new Fill({ color: "rgba(0, 0, 0, 0.7)" }),
    padding: [3, 3, 3, 3],
    textBaseline: "bottom",
    offsetY: -15,
  }),
  image: new RegularShape({
    radius: 8,
    points: 3,
    angle: Math.PI,
    displacement: [0, 10],
    fill: new Fill({ color: "rgba(0, 0, 0, 0.7)" }),
  }),
});

const tipStyle = new Style({
  text: new Text({
    font: "12px Inter Variable, sans-serif",
    fill: new Fill({ color: "rgba(255, 255, 255, 1)" }),
    backgroundFill: new Fill({ color: "rgba(0, 0, 0, 0.4)" }),
    padding: [2, 2, 2, 2],
    textAlign: "left",
    offsetX: 15,
  }),
});

const modifyStyle = new Style({
  image: new CircleStyle({
    radius: 5,
    stroke: new Stroke({ color: "rgba(0, 0, 0, 0.7)" }),
    fill: new Fill({ color: "rgba(0, 0, 0, 0.4)" }),
  }),
  text: new Text({
    text: "Drag to modify",
    font: '12px "Inter Variable", sans-serif',
    fill: new Fill({ color: "rgba(255, 255, 255, 1)" }),
    backgroundFill: new Fill({ color: "rgba(0, 0, 0, 0.7)" }),
    padding: [2, 2, 2, 2],
    textAlign: "left",
    offsetX: 15,
  }),
});

const segmentStyle = new Style({
  text: new Text({
    font: '12px "Inter Variable", sans-serif',
    fill: new Fill({ color: "rgba(255, 255, 255, 1)" }),
    backgroundFill: new Fill({ color: "rgba(0, 0, 0, 0.4)" }),
    padding: [2, 2, 2, 2],
    textBaseline: "bottom",
    offsetY: -12,
  }),
  image: new RegularShape({
    radius: 6,
    points: 3,
    angle: Math.PI,
    displacement: [0, 8],
    fill: new Fill({ color: "rgba(0, 0, 0, 0.4)" }),
  }),
});

// --- Logic Wrapper (Pure JS/OL Logic) ---
// Tách ra khỏi hook để tránh phụ thuộc state React phức tạp bên trong logic OL
function measurementInteractionWrapper(
  olMap: OLMap,
  initialDrawType: MeasurementTypes,
  options: {
    clearPrevious: boolean;
    showSegments: boolean;
    measurementUnit: MeasurementUnit;
    showCircle: boolean;
  }
) {
  let drawType = initialDrawType;
  let showSegments = options.showSegments;
  let clearPrevious = options.clearPrevious;
  let measurementUnit = options.measurementUnit;
  let showCircle = options.showCircle;
  let tipPoint: Point;
  let drawInteraction: Draw;
  const eventKeys: EventsKey[] = [];
  const segmentStyles = [segmentStyle];
  let measurementCircleFeature: Feature<Polygon> | null;
  let circleEventKey: EventsKey | null;
  
  const source = new VectorSource();
  const vector = new VectorLayer({
    source: source,
    style: function (feature) {
      return styleFunction(feature as Feature<SimpleGeometry>, showSegments);
    },
  });

  const modifyInteraction = new Modify({
    source,
    style: modifyStyle,
    pixelTolerance: 20,
  });

  function styleFunction(
    feature: Feature<SimpleGeometry>,
    segments: boolean,
    currentDrawType?: "Polygon" | "LineString",
    tip?: string,
  ) {
    const styles = [lineBackgroundStyle, style];
    const geometry = feature.getGeometry();
    if (!geometry) return styles;
    const type = geometry.getType();
    let point: Point | undefined;
    let label = "";
    let line: LineString | undefined;
    
    if (!currentDrawType || currentDrawType === type) {
      if (type === "Polygon") {
        point = (geometry as Polygon).getInteriorPoint();
        label = formatArea(getArea(geometry), measurementUnit);
        line = new LineString(geometry.getCoordinates()![0]);
      } else if (type === "LineString") {
        point = new Point(geometry.getLastCoordinate());
        label = formatLength(getLength(geometry), measurementUnit);
        line = geometry as LineString;
      }
    }

    if (segments && line && line.getCoordinates().length > 2) {
      let count = 0;
      line.forEachSegment(function (a, b) {
        const segment = new LineString([a, b]);
        const segmentLabel = formatLength(getLength(segment), measurementUnit);
        if (segmentStyles.length - 1 < count) {
          segmentStyles.push(segmentStyle.clone());
        }
        const segmentPoint = new Point(segment.getCoordinateAt(0.5));
        segmentStyles[count].setGeometry(segmentPoint);
        segmentStyles[count].getText()?.setText(segmentLabel);
        styles.push(segmentStyles[count]);
        count++;
      });
    }

    if (label && point) {
      labelStyle.setGeometry(point);
      labelStyle.getText()?.setText(label);
      styles.push(labelStyle);
    }
    if (
      tip &&
      type === "Point" &&
      !modifyInteraction.getOverlay().getSource()?.getFeatures().length
    ) {
      tipPoint = geometry as Point;
      tipStyle.getText()?.setText(tip);
      styles.push(tipStyle);
    }
    return styles;
  }

  function removeMeasurementCircle() {
    if (measurementCircleFeature) {
      source.removeFeature(measurementCircleFeature);
      measurementCircleFeature.dispose();
      measurementCircleFeature = null;
    }
    if (circleEventKey) {
      unByKey(circleEventKey);
      circleEventKey = null;
    }
  }

  function addDrawInteraction(type: MeasurementTypes) {
    const activeTip = "";
    const idleTip = "Click to start measuring";
    let tip = idleTip;
    
    drawInteraction = new Draw({
      source: source,
      type: type,
      condition: primaryAction,
      style: function (feature) {
        return styleFunction(
          feature as Feature<SimpleGeometry>,
          showSegments,
          type,
          tip,
        );
      },
    });

    const key = drawInteraction.on("drawstart", function (event: DrawEvent) {
      if (clearPrevious) {
        source.clear();
      }
      removeMeasurementCircle();
      if (showCircle && type === "LineString") {
        measurementCircleFeature = new Feature({
          geometry: circular([0, 0], 100000),
        });
        measurementCircleFeature.setStyle([lineBackgroundStyle, circleStyle]);
        source.addFeature(measurementCircleFeature);
        
        circleEventKey = event.feature.on("change", function () {
          const lineStringGeometry = event.feature.getGeometry() as LineString;
          const coords = lineStringGeometry.getCoordinates();
          if (coords.length < 2) return;
          
          const lastSegment = new LineString(coords.slice(-2));
          // Note: getLength with projection handles spherical math internally if configured, 
          // or we handle transform manually as in original code
          const radius = getLength(lastSegment, { projection: "EPSG:4326" });
          
          // Original logic transform check:
          const segmentClone = lastSegment.clone();
          segmentClone.transform("EPSG:3857", "EPSG:4326");
          
          if (radius === 0) return;
          
          const circle = circular(
            segmentClone.getFirstCoordinate(),
            getLength(segmentClone, { projection: "EPSG:4326" }),
            128,
          );
          circle.transform("EPSG:4326", "EPSG:3857");
          measurementCircleFeature?.setGeometry(circle);
        });
      }

      modifyInteraction.setActive(false);
      tip = activeTip;
    });
    eventKeys.push(key);

    const key2 = drawInteraction.on("drawend", function () {
      removeMeasurementCircle();
      modifyStyle.setGeometry(tipPoint);
      modifyInteraction.setActive(true);
      olMap.once("pointermove", function () {
        // @ts-ignore
        modifyStyle.setGeometry();
      });
      tip = idleTip;
    });
    eventKeys.push(key2);

    modifyInteraction.setActive(true);
    olMap.addInteraction(drawInteraction);
  }

  function changeMeasurementType(type: MeasurementTypes) {
    drawType = type;
    olMap.removeInteraction(drawInteraction);
    addDrawInteraction(type);
  }

  function setShowSegments(v: boolean) {
    showSegments = v;
    vector.changed();
    drawInteraction.getOverlay().changed();
  }

  function setShowCircle(v: boolean) {
    showCircle = v;
    if (!showCircle) {
      removeMeasurementCircle();
    }
    olMap.removeInteraction(drawInteraction);
    addDrawInteraction(drawType);
  }

  function setClearPrevious(v: boolean) {
    clearPrevious = v;
  }

  function setActive(enabled: boolean) {
    modifyInteraction.setActive(enabled);
    drawInteraction.setActive(enabled);
  }

  function setUnit(newUnit: MeasurementUnit) {
    measurementUnit = newUnit;
    vector.changed();
    drawInteraction.getOverlay().changed();
  }

  function cleanup() {
    unByKey(eventKeys);
    eventKeys.length = 0;
    removeMeasurementCircle();
    vector.getSource()?.clear();
    olMap.removeLayer(vector);
    olMap.removeInteraction(modifyInteraction);
    olMap.removeInteraction(drawInteraction);
  }

  function clear() {
    vector.getSource()?.clear();
  }

  olMap.addLayer(vector);
  addDrawInteraction(drawType);
  olMap.addInteraction(modifyInteraction);

  return {
    changeMeasurementType,
    setShowSegments,
    setClearPrevious,
    setActive,
    setUnit,
    setShowCircle,
    cleanup,
    clear,
  };
}

// --- React Hook ---

export interface MeasurementInteractionOptions {
  showSegments?: boolean;
  clearPrevious?: boolean;
  enable?: boolean;
  measurementUnit?: MeasurementUnit;
  snap?: boolean;
  showCircle?: boolean;
}

export function useMeasurementInteraction(
  olMap: OLMap | null,
  measurementType: MeasurementTypes,
  options: MeasurementInteractionOptions = {},
) {
  // Default options
  const {
    showSegments = true,
    clearPrevious = true,
    enable = true,
    measurementUnit = "metric",
    snap = true,
    showCircle = true,
  } = options;

  // Refs to hold instances
  const wrapperRef = useRef<ReturnType<typeof measurementInteractionWrapper> | null>(null);
  const snapInteractionRef = useRef<Snap | null>(null);
  const featureCollectionRef = useRef<Collection<Feature<Geometry>>>(new Collection());

  // 1. Initialize Wrapper when Map is available
  useEffect(() => {
    if (!olMap) return;

    const wrapper = measurementInteractionWrapper(olMap, measurementType, {
      clearPrevious,
      showSegments,
      measurementUnit,
      showCircle,
    });
    
    wrapperRef.current = wrapper;

    // Set initial active state
    wrapper.setActive(enable);

    return () => {
      wrapper.cleanup();
      wrapperRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [olMap]); // Re-run only if map instance changes (heavy init)

  // 2. React to Prop Changes (Update Wrapper)
  useEffect(() => {
    wrapperRef.current?.changeMeasurementType(measurementType);
  }, [measurementType]);

  useEffect(() => {
    wrapperRef.current?.setShowSegments(showSegments);
  }, [showSegments]);

  useEffect(() => {
    wrapperRef.current?.setClearPrevious(clearPrevious);
  }, [clearPrevious]);

  useEffect(() => {
    wrapperRef.current?.setUnit(measurementUnit);
  }, [measurementUnit]);

  useEffect(() => {
    wrapperRef.current?.setShowCircle(showCircle);
  }, [showCircle]);

  // 3. Handle Active State & Snap Collection population
  useEffect(() => {
    if (!olMap || !wrapperRef.current) return;

    const wrapper = wrapperRef.current;
    
    if (enable) {
      const features = getSnappableFeatures(olMap);
      featureCollectionRef.current.clear();
      featureCollectionRef.current.extend(features);
    } else {
      featureCollectionRef.current.clear();
    }
    
    wrapper.setActive(enable);
  }, [olMap, enable]);

  // 4. Handle Snap Interaction Lifecycle
  useEffect(() => {
    if (!olMap) return;

    // Clean up previous snap
    if (snapInteractionRef.current) {
      olMap.removeInteraction(snapInteractionRef.current);
      snapInteractionRef.current = null;
    }

    if (snap && enable) {
      const snapInt = new Snap({
        features: featureCollectionRef.current,
      });
      olMap.addInteraction(snapInt);
      snapInteractionRef.current = snapInt;
    }

    return () => {
      if (snapInteractionRef.current) {
        olMap.removeInteraction(snapInteractionRef.current);
      }
    };
  }, [olMap, snap, enable]);

  // Expose methods
  const clear = () => {
    wrapperRef.current?.clear();
  };

  return { clear };
}