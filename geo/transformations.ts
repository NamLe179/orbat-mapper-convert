/**
 * Chức năng: Các phép biến đổi hình học GeoJSON (sử dụng Turf.js)
    * Buffer, Bounding Box, Convex Hull
    * Simplify, Smooth (polygon/line)
    * Center, Center of Mass, Centroid
    * Union, Explode, Bezier spline
 */

import type {
  Feature,
  FeatureCollection,
  LineString,
  MultiPolygon,
  Polygon,
} from "geojson";
import type { NScenarioFeature, NUnit } from "@/types/internalModels"; 
import {
  feature as turfFeature,
  featureCollection,
  featureCollection as turfFeatureCollection,
  point,
  type Units as UnitOfMeasurement,
} from "@turf/helpers";
import { buffer as turfBuffer } from "@turf/buffer";
import { bboxPolygon } from "@turf/bbox-polygon";
import { bbox } from "@turf/bbox";
import { convex } from "@turf/convex";
import { simplify as turfSimplify } from "@turf/simplify";
import { bezierSpline as turfBezier } from "@turf/bezier-spline";
import { polygonSmooth as turfPolygonSmooth } from "@turf/polygon-smooth";
import { center as turfCenter } from "@turf/center";
import { centerOfMass as turfCenterOfMass } from "@turf/center-of-mass";
import { centroid as turfCentroid } from "@turf/centroid";
import { explode as turfExplode } from "@turf/explode";
import { union as turfUnion } from "@turf/union";
import { nanoid } from "@/utils";

// --- TYPES ---

export type BufferOptions = {
  radius: number;
  units?: UnitOfMeasurement;
  steps?: number;
};

export type SimplifyOptions = {
  tolerance?: number;
};

export type TransformationOperation =
  | {
      id: string;
      transform: "buffer";
      options: BufferOptions;
      disabled?: boolean;
      isOpen?: boolean;
    }
  | {
      id: string;
      transform: "boundingBox";
      options: {};
      disabled?: boolean;
      isOpen?: boolean;
    }
  | {
      id: string;
      transform: "convexHull";
      options: {};
      disabled?: boolean;
      isOpen?: boolean;
    }
  | {
      id: string;
      transform: "concaveHull";
      options: {};
      disabled?: boolean;
      isOpen?: boolean;
    }
  | {
      id: string;
      transform: "simplify";
      options: SimplifyOptions;
      disabled?: boolean;
      isOpen?: boolean;
    }
  | { id: string; transform: "smooth"; options: {}; disabled?: boolean; isOpen?: boolean }
  | { id: string; transform: "center"; options: {}; disabled?: boolean; isOpen?: boolean }
  | {
      id: string;
      transform: "centerOfMass";
      options: {};
      disabled?: boolean;
      isOpen?: boolean;
    }
  | {
      id: string;
      transform: "centroid";
      options: {};
      disabled?: boolean;
      isOpen?: boolean;
    }
  | { id: string; transform: "union"; options: {}; disabled?: boolean; isOpen?: boolean }
  | {
      id: string;
      transform: "explode";
      options: {};
      disabled?: boolean;
      isOpen?: boolean;
    };

export type TransformationType = TransformationOperation["transform"];

// --- FACTORY FUNCTIONS ---

// Hàm chính để tạo một phép biến đổi mới với ID duy nhất và trạng thái mặc định
export function createDefaultTransformationOperation(): TransformationOperation {
  return {
    id: nanoid(),
    transform: "buffer",
    options: {
      radius: 2,
      units: "kilometers",
      steps: 8,
    },
    disabled: false,
    isOpen: true,
  };
}

// --- TYPE GUARDS ---

// Các type guard để xác định loại hình học của feature
export function isLineString(
  feature: Feature | FeatureCollection,
): feature is Feature<LineString> {
  return feature.type === "Feature" && feature.geometry.type === "LineString";
}

export function isPolygon(
  feature: Feature | FeatureCollection,
): feature is Feature<Polygon> {
  return feature.type === "Feature" && feature.geometry.type === "Polygon";
}

// --- TRANSFORMATION LOGIC ---

// Hàm thực hiện chuỗi các phép biến đổi trên một feature hoặc feature collection
export function doScenarioFeatureTransformation(
  features: NScenarioFeature[],
  transformations: TransformationOperation[],
): Feature | FeatureCollection | null | undefined {
  if (features.length === 0 || !features[0]) return;
  const geoJSONFeatureOrFeatureCollection =
    features.length > 1
      ? turfFeatureCollection(
          features.map((f) => turfFeature(f?._state?.geometry ?? f.geometry)),
        )
      : turfFeature(features[0]?._state?.geometry ?? features[0].geometry);
  return doTransformations(geoJSONFeatureOrFeatureCollection, transformations);
}

// Hàm chuyển đổi một unit thành feature GeoJSON (dùng để làm input cho các phép biến đổi)
function unitToFeature(unit: NUnit): Feature {
  const location = unit?._state?.location ?? unit.location!;
  return point(location);
}

// Hàm chính để thực hiện các phép biến đổi trên một hoặc nhiều unit, trả về feature hoặc feature collection đã biến đổi
export function doUnitTransformations(
  units: NUnit[],
  transformations: TransformationOperation[],
) {
  const filteredUnits = units.filter((unit) => unit?._state?.location ?? unit.location);
  if (filteredUnits.length === 0) return;
  const geoJSONFeatureOrFeatureCollection =
    filteredUnits.length > 1
      ? turfFeatureCollection(filteredUnits.map(unitToFeature))
      : unitToFeature(filteredUnits[0]);
  return doTransformations(geoJSONFeatureOrFeatureCollection, transformations);
}

// Hàm thực hiện chuỗi các phép biến đổi trên một feature hoặc feature collection
function doTransformations(
  geoJSONFeatureOrFeatureCollection: Feature | FeatureCollection,
  transformations: TransformationOperation[],
) {
  const activeTransformations = transformations.filter((t) => !!t && !t.disabled);
  return activeTransformations.reduce<Feature | FeatureCollection>((acc, opt) => {
    return doSingleTransformation(acc, opt) as Feature | FeatureCollection;
  }, geoJSONFeatureOrFeatureCollection);
}

// Hàm thực hiện một phép biến đổi đơn lẻ dựa trên loại transform được chỉ định trong options
function doSingleTransformation(
  geoJSONFeatureOrFeatureCollection: Feature | FeatureCollection,
  { transform, options }: TransformationOperation,
): Feature | FeatureCollection | null | undefined {
  if (transform === "buffer") {
    const { radius, steps = 8, units = "kilometers" } = options;
    return turfBuffer(geoJSONFeatureOrFeatureCollection as any, radius, { units, steps });
  }
  if (transform === "boundingBox") {
    return bboxPolygon(bbox(geoJSONFeatureOrFeatureCollection));
  }

  if (transform === "convexHull") {
    return convex(geoJSONFeatureOrFeatureCollection);
  }

  if (transform === "concaveHull") {
    // Note: Turf's convex function handles convex hulls. 
    // If concave hull is needed, typically @turf/concave is used. 
    // Keeping logic as provided in original file.
    return convex(geoJSONFeatureOrFeatureCollection, { concavity: 1 } as any);
  }

  if (transform === "simplify") {
    const { tolerance = 0.5 } = options as SimplifyOptions;
    return turfSimplify(geoJSONFeatureOrFeatureCollection, {
      tolerance,
      highQuality: true,
    });
  }

  if (transform === "smooth") {
    if (isLineString(geoJSONFeatureOrFeatureCollection)) {
      return turfBezier(geoJSONFeatureOrFeatureCollection, {});
    } else if (isPolygon(geoJSONFeatureOrFeatureCollection)) {
      return turfPolygonSmooth(geoJSONFeatureOrFeatureCollection, { iterations: 4 });
    }
  }

  if (transform === "center") {
    return turfCenter(geoJSONFeatureOrFeatureCollection);
  }

  if (transform === "centerOfMass") {
    return turfCenterOfMass(geoJSONFeatureOrFeatureCollection);
  }

  if (transform === "centroid") {
    return turfCentroid(geoJSONFeatureOrFeatureCollection);
  }
  if (transform === "explode") {
    return turfExplode(geoJSONFeatureOrFeatureCollection);
  }
  if (transform === "union") {
    const collection =
      geoJSONFeatureOrFeatureCollection.type === "FeatureCollection"
        ? geoJSONFeatureOrFeatureCollection
        : featureCollection([geoJSONFeatureOrFeatureCollection]);
    
    // check if the collection is Polygon or MultiPolygon
    if (
      collection.features.length > 1 &&
      collection.features.every(
        (v) => v.geometry.type === "Polygon" || v.geometry.type === "MultiPolygon",
      )
    ) {
      return turfUnion(collection as FeatureCollection<Polygon | MultiPolygon>);
    } else {
      return geoJSONFeatureOrFeatureCollection;
    }
  }

  return null;
}