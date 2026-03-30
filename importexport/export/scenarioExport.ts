import { featureCollection } from "@turf/helpers";

// Project imports
import { nanoid } from "@/utils";
import { useActiveScenario } from "@/components/injects"; // Use context hook if needed, or pass via args
import type { TScenario } from "@/scenariostore";
import type {
  ColumnMapping,
  ExportSettings,
  GeoJsonSettings,
  OrbatMapperExportSettings,
  UnitGeneratorSettings,
} from "@/types/importExport";
import { INTERNAL_NAMES, type NUnit } from "@/types/internalModels";
import type { Unit } from "@/types/scenarioModels";
import {
  reinforcedStatus2SpatialIllusions,
  type SpatialIllusionsOrbat,
} from "@/types/externalModels";
import type { OrbatMapperGeoJsonLayer } from "@/importexport/jsonish/types";
import { saveBlobToLocalFile } from "@/utils/files";
import { useKmlExport } from "./kmlExport";
import { useGeoJsonConverter } from "@/importexport/export/geojsonConverter";
import { getUnitRuntimeState } from "@/scenariostore/runtimeState";

export interface UseScenarioExportOptions {
  activeScenario: TScenario;
}

function stringifyReplacer(name: string, val: any) {
  if (val === undefined) return undefined;
  if (INTERNAL_NAMES.includes(name)) return undefined;

  return val;
}

function columnMapper(data: any[], columnMap: ColumnMapping[]): Record<string, any>[] {
  const mappedData: Record<string, any>[] = [];

  data.forEach((item) => {
    const mappedItem: Record<string, any> = {};
    columnMap.forEach(({ label, field }) => {
      mappedItem[label] = mapField(item[field]);
    });
    mappedData.push(mappedItem);
  });
  return mappedData;
}

function mapField(field: any): string | number | Date {
  if (Array.isArray(field)) return JSON.stringify(field);
  return field;
}

export function useScenarioExport(options?: UseScenarioExportOptions) {
  // Logic: Ưu tiên lấy từ options, nếu không thì lấy từ context global (React Hook pattern)
  // Nếu gọi hàm này ngoài component, bắt buộc phải truyền options.activeScenario
  
  let scenario: TScenario;
  
  if (options?.activeScenario) {
    scenario = options.activeScenario;
  } else {
    // Nếu dùng trong component React, có thể tự động lấy từ context
    try {
      scenario = useActiveScenario(); 
    } catch (e) {
      throw new Error("useScenarioExport must be provided with 'activeScenario' or used within an ActiveScenarioProvider");
    }
  }

  const {
    geo,
    store,
    unitActions,
    io,
    helpers: { getUnitById },
  } = scenario;
  const { sideMap } = store.state;

  const { convertUnitsToGeoJson, convertScenarioFeaturesToGeoJson } =
    useGeoJsonConverter(scenario);

  async function downloadAsGeoJSON(opts: GeoJsonSettings) {
    // React Migration: Handle ref unwrapping if necessary, otherwise assume array
    const visibleUnits = Array.isArray(geo.everyVisibleUnit) 
      ? geo.everyVisibleUnit 
      : (geo.everyVisibleUnit as any).value || [];

    const units = opts.includeUnits
      ? convertUnitsToGeoJson(visibleUnits, opts).features
      : [];
      
    const features = opts.includeFeatures
      ? convertScenarioFeaturesToGeoJson(opts).features
      : [];
      
    const combined = [...units, ...(features as any)];

    await saveBlobToLocalFile(
      new Blob([JSON.stringify(featureCollection(combined), stringifyReplacer, 2)], {
        type: "application/json",
      }),
      opts.fileName,
    );
  }

  // Reuse KML Export logic
  const { downloadAsKML, downloadAsKMZ } = useKmlExport(scenario);

  async function downloadAsMilx(opts: ExportSettings) {
    const { toMilx } = await import("@/importexport/milx");

    const layers: OrbatMapperGeoJsonLayer[] = [];

    if (opts.includeUnits) {
      if (opts.oneFolderPerSide) {
        Object.keys(sideMap).forEach((sideId) => {
          const side = sideMap[sideId];
          const units: NUnit[] = [];
            unitActions.walkSide(sideId, (unit) => {
              // Runtime location check from hot-path runtime state map.
              if (getUnitRuntimeState(unit.id)?.location) units.push(unit);
          });
          layers.push({
            name: side.name,
            featureCollection: convertUnitsToGeoJson(units),
          });
        });
      } else {
        const visibleUnits = Array.isArray(geo.everyVisibleUnit) 
          ? geo.everyVisibleUnit 
          : (geo.everyVisibleUnit as any).value || [];

        layers.push({
          name: "Units",
          featureCollection: convertUnitsToGeoJson(visibleUnits),
        });
      }
    }

    const milxString = toMilx(layers);
    await saveBlobToLocalFile(
      new Blob([milxString], {
        type: "application/xml",
      }),
      "scenario.milxly",
      { mimeTypes: ["application/xml"], extensions: [".milxly"] },
    );
  }

  async function downloadAsXlsx(opts: ExportSettings) {
    const { writeFileXLSX, xlsxUtils } = await import("@/extlib/xlsx-lazy");
    const workbook = xlsxUtils.book_new();
    let unitData: any[] = [];
    if (opts.oneSheetPerSide) {
      Object.keys(sideMap).forEach((sideId) => {
        unitData = [];
        const sideName = sideMap[sideId].name;
        // @ts-ignore: walkSide signature mismatch sometimes
        unitActions.walkSide(sideId, (unit, level, parent, sideGroup, side) => {
          unitData.push({ ...unit, sideId: side.id, sideName: side?.name });
        });
        const ws = xlsxUtils.json_to_sheet(columnMapper(unitData, opts.columns));
        xlsxUtils.book_append_sheet(workbook, ws, sideName);
      });
    } else {
      Object.keys(sideMap).forEach((sideId) =>
        // @ts-ignore
        unitActions.walkSide(sideId, (unit, level, parent, sideGroup, side) => {
          unitData.push({ ...unit, sideId: side.id, sideName: side?.name });
        }),
      );
      const ws = xlsxUtils.json_to_sheet(columnMapper(unitData, opts.columns));
      xlsxUtils.book_append_sheet(workbook, ws, "Units");
    }

    writeFileXLSX(workbook, "scenario.xlsx");
  }

  async function downloadAsSpatialIllusions(opts: UnitGeneratorSettings) {
    const { rootUnit } = opts;
    const hierarchy = unitActions.expandUnitWithSymbolOptions(getUnitById(rootUnit));

    const d = convertUnit(hierarchy, 0);
    function convertUnit(unit: Unit, level: number): SpatialIllusionsOrbat {
      return {
        options: {
          uniqueDesignation: unit.name,
          sidc: unit.sidc,
          fillColor: unit.symbolOptions?.fillColor,
          reinforced: reinforcedStatus2SpatialIllusions[unit.reinforcedStatus ?? "None"],
          additionalInformation: unit.textAmplifiers?.additionalInformation,
        },
        subOrganizations:
          level < opts.maxLevels
            ? unit.subUnits?.map((subUnit) => convertUnit(subUnit, level + 1)) || []
            : [],
      };
    }
    await saveBlobToLocalFile(
      new Blob([JSON.stringify(d, undefined, 2)], {
        type: "application/json",
      }),
      "spatialillusions-orbat.json",
      { mimeTypes: ["application/json"], extensions: [".json"] },
    );
  }

  async function downloadAsOrbatMapper({
    fileName,
    scenarioName,
    sideGroups,
  }: OrbatMapperExportSettings) {
    const scn = io.toObject();
    const sidesWithFilteredGroups = scn.sides.map((side) => ({
      ...side,
      groups: side.groups.filter((g) => sideGroups.includes(g.id)),
    }));
    const newScenario = {
      ...scn,
      sides: sidesWithFilteredGroups.filter((e) => e.groups.length),
    };
    newScenario.id = nanoid();
    newScenario.meta = {
      ...scn.meta!,
      exportedFrom: scn.id,
      exportedDate: new Date().toISOString(),
    };
    if (scenarioName) newScenario.name = scenarioName;

    await saveBlobToLocalFile(
      new Blob([JSON.stringify(newScenario, undefined, 2)], {
        type: "application/json",
      }),
      fileName || "scenario-export-orbatmapper.json",
      { mimeTypes: ["application/json"], extensions: [".json"] },
    );
  }

  return {
    downloadAsGeoJSON,
    downloadAsKML,
    downloadAsKMZ,
    downloadAsXlsx,
    downloadAsMilx,
    downloadAsSpatialIllusions,
    downloadAsOrbatMapper,
  };
}