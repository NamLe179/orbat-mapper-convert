import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import View from "ol/View";
import { fromLonLat } from "ol/proj";
import type { Coordinate } from "ol/coordinate";

// Project imports
import { nanoid } from "@/utils";
import type { Unit } from "@/types/scenarioModels";
import type { NUnit } from "@/types/internalModels";
import { LayerTypes } from "@/modules/scenarioeditor/featureLayerUtils";

/**
 * Chức năng: Tạo và quản lý các vector layer cho units
 *      createUnitLayer(): tạo layer hiển thị units
 *      createUnitFeatureAt(): tạo Point feature cho unit
 *      flyTo(): animation bay đến vị trí trên bản đồ
 */

/**
 * Creates the main Vector Layer for Units.
 */
export function createUnitLayer() {
  return new VectorLayer({
    source: new VectorSource(),
    updateWhileInteracting: true,
    updateWhileAnimating: true,
    properties: {
      id: nanoid(),
      title: "Unit layer",
      layerType: LayerTypes.units,
    },
  });
}

/**
 * Creates a Point Feature for a Unit at a specific coordinate.
 */
export function createUnitFeatureAt(
  position: Coordinate,
  unit: Unit | NUnit,
): Feature<Point> {
  const geometry = new Point(fromLonLat(position));
  const feature = new Feature<Point>({
    geometry,
  });
  feature.setId(unit.id);
  return feature;
}

/**
 * Animate the map view to a specific location (Fly effect).
 * Based on https://openlayers.org/en/latest/examples/animation.html
 */
export function flyTo(
  view: View,
  {
    location,
    zoom,
    duration = 2000,
  }: { location: number[]; zoom?: number; duration?: number },
): Promise<boolean> {
  const currentZoom = view.getZoom();
  const zoom_ = zoom !== undefined ? zoom : currentZoom;
  
  // Safe guard if view is not ready
  if (zoom_ === undefined) return Promise.resolve(false);

  let parts = 2;
  let called = false;

  return new Promise((resolve) => {
    function callback(complete: boolean) {
      --parts;
      if (called) {
        return;
      }
      if (parts === 0 || !complete) {
        called = true;
        resolve(complete);
      }
    }

    view.animate(
      {
        center: location,
        duration: duration,
      },
      callback,
    );

    view.animate(
      {
        zoom: zoom_ - 1,
        duration: duration / 2,
      },
      {
        zoom: zoom_,
        duration: duration / 2,
      },
      callback,
    );
  });
}