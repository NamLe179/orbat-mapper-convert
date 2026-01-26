import { useEffect, useRef, useState, useCallback } from "react";
import OLMap from "ol/Map";
import type VectorLayer from "ol/layer/Vector";
import type VectorSource from "ol/source/Vector";
import Draw, { DrawEvent } from "ol/interaction/Draw";
import Translate from "ol/interaction/Translate";
import Snap from "ol/interaction/Snap";
import Select from "ol/interaction/Select";
import Layer from "ol/layer/Layer";
import { Modify } from "ol/interaction";
import {
  click as clickCondition,
  platformModifierKeyOnly,
  primaryAction,
} from "ol/events/condition";
import type Feature from "ol/Feature";
import { Collection } from "ol";
import { Geometry } from "ol/geom";
import { getSnappableFeatures } from "./openlayersHelpers"; // Giả định file này là pure TS

export type DrawType = "Point" | "LineString" | "Polygon" | "Circle";

export interface GeoEditingOptions {
  addMultiple?: boolean;
  emit?: (name: "add" | "modify", ...args: any[]) => void;
  select?: Select;
  addHandler?: (feature: Feature, layer: VectorLayer<any>) => void;
  modifyHandler?: (features: Feature[]) => void;
  snap?: boolean;
  translate?: boolean;
}

interface InteractionsBundle {
  lineDraw: Draw;
  polygonDraw: Draw;
  pointDraw: Draw;
  circleDraw: Draw;
  select: Select;
  modify: Modify;
  translate: Translate;
  snap: Snap | null;
  featureCollection: Collection<Feature<Geometry>>;
}

export function useEditingInteraction(
  olMap: OLMap | null,
  vectorLayer: VectorLayer<any> | null,
  options: GeoEditingOptions = {}
) {
  // Options ref to avoid effect dependency loops
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // State for UI
  const [currentDrawType, setCurrentDrawType] = useState<DrawType | null>(null);
  const [isModifying, setIsModifying] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);

  // Store OL interactions
  const interactionsRef = useRef<InteractionsBundle | null>(null);

  // -- 1. Initialization Effect --
  useEffect(() => {
    if (!olMap || !vectorLayer) return;

    const source = vectorLayer.getSource();
    if (!source) return;

    // Initialize Draws
    const lineDraw = new Draw({ type: "LineString", source });
    const polygonDraw = new Draw({ type: "Polygon", source });
    const pointDraw = new Draw({ type: "Point", source });
    const circleDraw = new Draw({ type: "Circle", source });
    
    [lineDraw, polygonDraw, pointDraw, circleDraw].forEach(d => {
      d.setActive(false);
      olMap.addInteraction(d);
    });

    // Initialize Select
    const select = optionsRef.current.select ?? new Select({
      layers: [vectorLayer as Layer<any, any>],
      hitTolerance: 20,
      condition: clickCondition,
    });
    
    if (!optionsRef.current.select) {
      select.setActive(false);
      olMap.addInteraction(select);
    }

    // Initialize Modify
    const modify = new Modify({ 
      features: select.getFeatures(), 
      pixelTolerance: 20 
    });
    modify.setActive(false);
    olMap.addInteraction(modify);

    // Initialize Translate
    const translate = new Translate({
      condition: function (event) {
        if (optionsRef.current.translate !== false) return true; // Default to true if undefined
        return primaryAction(event) && platformModifierKeyOnly(event);
      },
      features: select.getFeatures(),
    });
    translate.setActive(true);
    olMap.addInteraction(translate);

    // Initialize Snap Collection
    const featureCollection = new Collection<Feature<Geometry>>();
    
    // Store in ref
    interactionsRef.current = {
      lineDraw,
      polygonDraw,
      pointDraw,
      circleDraw,
      select,
      modify,
      translate,
      snap: null,
      featureCollection
    };

    // --- Event Listeners ---
    const handleDrawEnd = (e: any) => { // Type as any to match DrawEvent structure
      const evt = e as DrawEvent;
      if (!optionsRef.current.addMultiple) {
        cancel(); 
      }
      optionsRef.current.emit?.("add", evt.feature, vectorLayer);
      optionsRef.current.addHandler?.(evt.feature, vectorLayer);
    };

    const handleModifyEnd = (e: any) => {
      optionsRef.current.emit?.("modify", e.features.getArray());
      optionsRef.current.modifyHandler?.(e.features.getArray());
    };

    const handleTranslateEnd = (e: any) => {
      optionsRef.current.emit?.("modify", e.features.getArray());
      optionsRef.current.modifyHandler?.(e.features.getArray());
    };

    lineDraw.on("drawend", handleDrawEnd);
    polygonDraw.on("drawend", handleDrawEnd);
    pointDraw.on("drawend", handleDrawEnd);
    circleDraw.on("drawend", handleDrawEnd);
    modify.on("modifyend", handleModifyEnd);
    translate.on("translateend", handleTranslateEnd);

    // Cleanup
    return () => {
      if (!interactionsRef.current) return;
      const { 
        lineDraw, polygonDraw, pointDraw, circleDraw, 
        select, modify, translate, snap 
      } = interactionsRef.current;

      [lineDraw, polygonDraw, pointDraw, circleDraw, modify, translate].forEach(i => {
        olMap.removeInteraction(i);
        // Unlisten handled automatically by OL when removed usually, but good practice to allow GC
        // Nếu cần unlisten thủ công: i.un('event', handler);
      });

      if (!optionsRef.current.select) {
        olMap.removeInteraction(select);
      }
      if (snap) {
        olMap.removeInteraction(snap);
      }
      interactionsRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [olMap, vectorLayer]); 
  // dependencies limit to map/layer changes. options are ref-ed.


  // -- 2. Snap Interaction Handling --
  useEffect(() => {
    if (!olMap || !interactionsRef.current) return;
    
    const shouldSnap = options.snap ?? true;
    const { featureCollection, snap } = interactionsRef.current;

    // Remove old snap
    if (snap) {
      olMap.removeInteraction(snap);
      interactionsRef.current.snap = null;
    }

    // Add new snap if enabled
    if (shouldSnap) {
      const newSnap = new Snap({
        features: featureCollection,
      });
      olMap.addInteraction(newSnap);
      interactionsRef.current.snap = newSnap;
    }
  }, [olMap, options.snap]);


  // -- 3. Snap Collection Population Logic --
  useEffect(() => {
    if (!olMap || !interactionsRef.current) return;

    const enabled = isDrawing || isModifying;
    const shouldSnap = options.snap ?? true;
    const { featureCollection } = interactionsRef.current;

    if (enabled && shouldSnap) {
      const features = getSnappableFeatures(olMap);
      featureCollection.clear();
      featureCollection.extend(features);
    } else {
      featureCollection.clear();
    }
  }, [olMap, isDrawing, isModifying, options.snap]);


  // -- 4. Actions --

  const stopModify = useCallback(() => {
    if (!interactionsRef.current) return;
    interactionsRef.current.modify.setActive(false);
    setIsModifying(false);
  }, []);

  const startModify = useCallback(() => {
    if (!interactionsRef.current) return;
    const { select, modify, lineDraw, polygonDraw, pointDraw, circleDraw } = interactionsRef.current;

    if (isModifying) {
      stopModify();
      return;
    }

    // Deactivate draws
    [lineDraw, polygonDraw, pointDraw, circleDraw].forEach(d => d.setActive(false));
    setCurrentDrawType(null);
    setIsDrawing(false);

    select.setActive(true);
    modify.setActive(true);
    setIsModifying(true);
  }, [isModifying, stopModify]);

  const startDrawing = useCallback((drawType: DrawType) => {
    if (!interactionsRef.current) return;
    const { select, lineDraw, polygonDraw, pointDraw, circleDraw } = interactionsRef.current;

    select.setActive(false);
    select.getFeatures().clear();
    setIsDrawing(true);
    stopModify();

    // Deactivate all first
    [lineDraw, polygonDraw, pointDraw, circleDraw].forEach(d => d.setActive(false));

    let activeDraw: Draw | null = null;
    if (drawType === "LineString") activeDraw = lineDraw;
    if (drawType === "Polygon") activeDraw = polygonDraw;
    if (drawType === "Point") activeDraw = pointDraw;
    if (drawType === "Circle") activeDraw = circleDraw;

    if (activeDraw) {
      activeDraw.setActive(true);
      setCurrentDrawType(drawType);
    }
  }, [stopModify]);

  const cancel = useCallback(() => {
    if (!interactionsRef.current) return;
    const { select, lineDraw, polygonDraw, pointDraw, circleDraw } = interactionsRef.current;

    select.setActive(true);
    stopModify();

    [lineDraw, polygonDraw, pointDraw, circleDraw].forEach(d => d.setActive(false));
    
    setCurrentDrawType(null);
    setIsDrawing(false);
  }, [stopModify]);

  return {
    startDrawing,
    currentDrawType,
    startModify,
    isModifying,
    cancel,
    isDrawing
  };
}