import { featureCollection, point } from "@turf/helpers";

// Project imports (đã bỏ đuôi .ts để phù hợp Next.js)
import type { TScenario } from "@/scenariostore";
import type { NUnit } from "@/types/internalModels";
import type { GeoJsonSettings } from "@/types/importExport";
import type {
  MilSymbolProperties,
  OrbatMapperGeoJsonCollection,
} from "@/importexport/jsonish/types";
import { getUnitRuntimeState } from "@/scenariostore/runtimeState";

export function useGeoJsonConverter(scenario: TScenario) {
  const { geo, unitActions } = scenario;

  /**
   * Chuyển đổi danh sách Unit sang GeoJSON Point Collection
   */
  function convertUnitsToGeoJson(
    units: NUnit[],
    options: Partial<GeoJsonSettings> = {}
  ): OrbatMapperGeoJsonCollection {
    const features = units.map((unit) => {
      const includeIdInProperties = options.includeIdInProperties ?? false;
      const { id, name, sidc, shortName, description } = unit;

      const symbolOptions = unitActions.getCombinedSymbolOptions(unit);

      // Runtime location is sourced from hot-path runtime state map.
      // Trong React component, nên filter trước hoặc kiểm tra kỹ
      const runtimeState = getUnitRuntimeState(unit.id);
      const location = runtimeState?.location || unit.location;
      
      if (!location) {
        throw new Error(`Unit ${unit.name} does not have a valid location.`);
      }

      return point<MilSymbolProperties>(
        location,
        {
          id: includeIdInProperties ? id : undefined,
          name,
          shortName,
          sidc: runtimeState?.sidc || sidc,
          description,
          ...(unit.textAmplifiers ?? {}),
          ...symbolOptions,
        },
        { id: options.includeId ? id : undefined },
      );
    });
    
    return featureCollection(features) as OrbatMapperGeoJsonCollection;
  }

  /**
   * Chuyển đổi các Feature vẽ trên bản đồ sang GeoJSON Feature Collection
   */
  function convertScenarioFeaturesToGeoJson(options: Partial<GeoJsonSettings> = {}) {
    const includeIdInProperties = options.includeIdInProperties ?? false;
    
    // React Migration Note:
    // Trong Vue: geo.layers là Ref -> geo.layers.value
    // Trong React (Zustand): geo.layers là Array -> geo.layers
    // Dòng dưới đây giả định store đã được convert sang dạng plain object.
    const layers = Array.isArray(geo.layers) ? geo.layers : (geo.layers as any).value || [];

    const features = layers
      .map((layer: any) => layer.features) // layer type might need update in store definition
      .flat(1)
      .map((f: any) => {
        const { id, geometry, properties, meta } = f;
        return {
          type: "Feature",
          id: options.includeId ? id : undefined,
          properties: {
            id: includeIdInProperties ? id : undefined,
            name: meta.name,
            description: meta.description,
            ...properties,
          },
          geometry,
        };
      });

    return featureCollection(features);
  }

  return { convertUnitsToGeoJson, convertScenarioFeaturesToGeoJson };
}