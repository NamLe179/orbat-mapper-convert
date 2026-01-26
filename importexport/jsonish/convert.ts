import type { FeatureCollection } from "geojson";
import { nanoid } from "@/utils";
import { convertLetterSidc2NumberSidc } from "@orbat-mapper/convert-symbology";
import type {
  GeoJsonSymbolProperties,
  MilSymbolProperties,
  OrbatMapperGeoJsonCollection,
} from "@/importexport/jsonish/types";

const isNumeric = /^\d+$/;

/**
 * Chuyển đổi một lớp GeoJSON thông thường sang định dạng nội bộ OrbatMapper.
 * Logic giữ nguyên vì là xử lý dữ liệu thuần túy.
 */
export function convertGeojsonLayer(
  layer: FeatureCollection,
): OrbatMapperGeoJsonCollection {
  const fc = layer;
  const { features: nFeatures, ...rest } = fc;
  
  const features = nFeatures
    .filter((f) => f.geometry.type === "Point")
    .map((f) => ({
      ...f,
      id: nanoid(),
      properties: convertGeojsonProperties(f.properties || {}),
    }));

  return { ...fc, features } as OrbatMapperGeoJsonCollection;
}

function convertGeojsonProperties(f: GeoJsonSymbolProperties): MilSymbolProperties {
  // SIDC (Symbol Identification Code) handling
  const sidc = f.sidc || "10031000000000000000";
  
  const props: MilSymbolProperties = {
    // Nếu là số thì giữ nguyên, nếu là ký tự (legacy) thì convert
    sidc: isNumeric.test(sidc) ? sidc : convertLetterSidc2NumberSidc(sidc).sidc,
  };

  // Mapping properties
  if (f.m) props.higherFormation = f.m;
  props.name = f.name || f.uniqueDesignation || f.t || "";
  
  return props;
}