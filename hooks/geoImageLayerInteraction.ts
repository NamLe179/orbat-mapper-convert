import { useEffect, useRef, useState, useCallback } from "react";
import OLMap from "ol/Map";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Fill, Stroke, Style } from "ol/style";
import TransformInteraction from "ol-ext/interaction/Transform";
import { fromExtent } from "ol/geom/Polygon";
import Feature from "ol/Feature";
import { boundingExtent, getCenter, getHeight, getWidth } from "ol/extent";
import { Collection } from "ol";
import { unByKey } from "ol/Observable";
import type { FeatureId } from "@/types/scenarioGeoModels";

export interface TransformUpdate {
  id: FeatureId;
  rotation: number;
  center: number[];
  scale: number[];
  active: boolean;
}

export interface GeoImageLayerInteractionOptions {
  updateHandler?: (update: TransformUpdate) => void;
}

// Interface lưu trữ trạng thái nội bộ của hook (mutable)
interface InteractionState {
  rotation: number;
  startRotation: number;
  center: number[];
  scale: number[];
  newScale: number[];
  currentLayerId: FeatureId | null;
  currentLayer: any;
  iWidth: number;
  iHeight: number;
}

export function useImageLayerTransformInteraction(
  olMap: OLMap | null,
  options: GeoImageLayerInteractionOptions = {},
) {
  const [isActive, setIsActive] = useState(false);
  
  // Lưu options vào ref để truy cập trong event listener mà không gây re-run effect
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Refs lưu trữ các instance của OL
  const interactionRef = useRef<any>(null);
  const overlayLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const featuresRef = useRef<Collection<Feature>>(new Collection());

  // Ref lưu trữ biến thiên (mutable state) trong quá trình drag/rotate
  const stateRef = useRef<InteractionState>({
    rotation: 0,
    startRotation: 0,
    center: [0, 0],
    scale: [1, 1],
    newScale: [1, 1],
    currentLayerId: null,
    currentLayer: null,
    iWidth: 0,
    iHeight: 0,
  });

  // --- Effect: Khởi tạo Interaction & Layer ---
  useEffect(() => {
    if (!olMap) return;

    // 1. Setup Layer & Interaction
    const overlayLayer = createOverlayLayer();
    const interaction = new TransformInteraction({
      translateFeature: false,
      // noFlip: true,
      features: featuresRef.current,
      selection: false,
      keepRectangle: true,
    });
    
    interaction.setActive(false);
    olMap.addInteraction(interaction);
    olMap.addLayer(overlayLayer);

    interactionRef.current = interaction;
    overlayLayerRef.current = overlayLayer;

    // 2. Helper Functions Logic (Chuyển vào trong effect để access stateRef)
    const initializeTransform = (newLayer: any) => {
      const source = newLayer.getSource();
      stateRef.current.startRotation = source.getRotation();
      stateRef.current.center = [...source.getCenter()];
      stateRef.current.scale = [...source.getScale()];
      stateRef.current.rotation = stateRef.current.startRotation;
    };

    // 3. Event Handlers
    const handleStart = (e: any) => {
      initializeTransform(stateRef.current.currentLayer);
      const geom = e.feature.getGeometry().clone();
      geom.rotate(
        stateRef.current.startRotation, 
        getCenter(geom.getExtent())
      );
      const extent = geom.getExtent();
      stateRef.current.iWidth = getWidth(extent);
      stateRef.current.iHeight = getHeight(extent);
    };

    const handleInteraction = (e: any) => {
      const s = stateRef.current; // shorthand
      const feature = e.feature;

      if (e.type === "rotating") {
        s.rotation = s.startRotation - e.angle;
      }

      const geom = feature.getGeometry().clone();
      const c = getCenter(geom.getExtent());
      geom.rotate(s.rotation, c);
      
      const extent = geom.getExtent();
      const width = getWidth(extent);
      const height = getHeight(extent);

      if (e.type === "scaling") {
        s.newScale[0] = (s.scale[0] * width) / s.iWidth;
        s.newScale[1] = (s.scale[1] * height) / s.iHeight;
      } else {
        s.newScale = s.scale;
      }

      s.center = c;

      if (s.currentLayerId) {
        optionsRef.current.updateHandler?.({
          rotation: s.rotation,
          center: s.center,
          scale: s.newScale,
          active: true,
          id: s.currentLayerId,
        });
      }
    };

    const handleEnd = (e: any) => {
      const s = stateRef.current;
      if (s.currentLayerId) {
        optionsRef.current.updateHandler?.({
          rotation: s.rotation,
          center: s.center,
          scale: s.newScale,
          active: false,
          id: s.currentLayerId,
        });
      }
    };

    // 4. Attach Events
    const keyStart = interaction.on(
      ["translatestart", "rotatestart", "scalestart"], 
      handleStart
    );
    const keyInteracting = interaction.on(
      ["translating", "rotating", "scaling"], 
      handleInteraction
    );
    const keyEnd = interaction.on(
      ["rotateend", "translateend", "scaleend"], 
      handleEnd
    );

    // 5. Cleanup
    return () => {
      olMap.removeInteraction(interaction);
      olMap.removeLayer(overlayLayer); // Nếu muốn giữ layer thì bỏ dòng này
      interaction.setMap(null);
      
      unByKey(keyStart);
      unByKey(keyInteracting);
      unByKey(keyEnd);
      
      interactionRef.current = null;
      overlayLayerRef.current = null;
    };
  }, [olMap]); // Chỉ chạy 1 lần khi map init

  // --- Exposed Functions ---

  const startTransform = useCallback((newLayer: any, layerId: FeatureId) => {
    if (!interactionRef.current || !overlayLayerRef.current) return;

    setIsActive(true);
    
    // Update internal state
    stateRef.current.currentLayerId = layerId;
    stateRef.current.currentLayer = newLayer;

    // Create polygon overlay
    const source = newLayer.getSource();
    const polygon = fromExtent(source.getExtent());
    polygon.rotate(-source.getRotation(), source.getCenter());
    
    const f = new Feature(getPolygonfromImage(newLayer));
    
    // Update layer & interactions
    overlayLayerRef.current.getSource()?.clear();
    overlayLayerRef.current.getSource()?.addFeature(f);
    
    featuresRef.current.clear();
    featuresRef.current.push(f);
    
    interactionRef.current.setActive(true);
    interactionRef.current.select(f, true);
  }, []);

  const endTransform = useCallback(() => {
    if (!interactionRef.current || !overlayLayerRef.current) return;

    setIsActive(false);
    stateRef.current.currentLayerId = null;
    stateRef.current.currentLayer = null;

    interactionRef.current.setActive(false);
    overlayLayerRef.current.getSource()?.clear();
    featuresRef.current.clear();
  }, []);

  return { startTransform, endTransform, isActive };
}

// --- Pure Helper Functions ---

function createOverlayLayer() {
  return new VectorLayer({
    source: new VectorSource(),
    style: new Style({
      fill: new Fill({ color: "rgba(0, 0, 0, 0)" }),
      stroke: new Stroke({ color: "rgb(238,3,3)", width: 2 }),
    }),
  });
}

function getPolygonfromImage(layer: any) {
  const source = layer.getSource();
  const center = source.getCenter();
  const scale = source.getScale();
  // Lưu ý: getGeoImage() là method của ol-ext source
  const geoImage = (source as any).getGeoImage();
  
  const width = geoImage.width * scale[0];
  const height = geoImage.height * scale[1];
  
  const p1 = [center[0] - width / 2, center[1] - height / 2];
  const p2 = [center[0] + width / 2, center[1] + height / 2];
  
  const extent = boundingExtent([p1, p2]);
  const polygon = fromExtent(extent);
  
  // The resulting polygon
  polygon.rotate(-source.getRotation(), center);
  return polygon;
}