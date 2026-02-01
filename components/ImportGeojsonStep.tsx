"use client";

import React, { useMemo, useState, useEffect } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { featureEach, propReduce } from "@turf/meta";
import { nanoid } from "@/utils"; // Giả định utils đã có

// GeoJSON Types
import type { Feature as GeoJSONFeature, FeatureCollection, Point } from "geojson";

// Internal Models
import type { NScenarioFeature, NUnit } from "@/types/internalModels";

// Hooks & Stores
import { useActiveScenario } from "@/components/injects";
import { useRootUnits } from "@/hooks/scenarioUtils";
import { setCharAt } from "@/components/helpers";
import { SID_INDEX } from "@/symbology/sidc";

// Components (Giả định đã convert)
import SymbolCodeSelect from "@/components/SymbolCodeSelect";
import SimpleSelect from "@/components/SimpleSelect";
import DataGrid from "@/modules/grid/DataGrid";
import MilitarySymbol from "@/components/MilitarySymbol";
import AlertWarning from "@/components/AlertWarning";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"; // Thay thế MRadioGroup
import { Label } from "@/components/ui/label"; // Label cho Radio

// --- Types ---
interface ImportGeojsonStepProps {
  data: GeoJSONFeature | FeatureCollection;
  onCancel?: () => void;
  onLoaded?: () => void;
}

type GeoJsonImportMode = "units" | "features";

// --- Helper Functions ---
function findLikelyNameColumn(columnNames: string[]) {
  const nameVariations = ["name", "title"];
  for (const columnName of columnNames) {
    if (nameVariations.includes(columnName.trim().toLowerCase())) {
      return columnName;
    }
  }
  for (const columnName of columnNames) {
    if (columnName.toLowerCase().includes("name")) {
      return columnName;
    }
  }
  return columnNames[0] || "";
}

function findLikelySymbolColumn(columnNames: string[]) {
  const symbolVariations = ["symbol", "sidc"];
  for (const columnName of columnNames) {
    if (symbolVariations.includes(columnName.trim().toLowerCase())) {
      return columnName;
    }
  }
  for (const columnName of columnNames) {
    if (columnName.toLowerCase().includes("symbol")) {
      return columnName;
    }
  }
  return columnNames[0] || "";
}

// --- Main Component ---
export default function ImportGeojsonStep({
  data,
  onCancel,
  onLoaded,
}: ImportGeojsonStepProps) {
  // --- Hooks ---
  const { unitActions, store: scnStore, geo } = useActiveScenario();
  const { rootUnitItems } = useRootUnits();

  // --- State ---
  const [importMode, setImportMode] = useState<GeoJsonImportMode>("features");
  const [selectedFeatures, setSelectedFeatures] = useState<GeoJSONFeature[]>([]);
  
  // Property Detection (Memoized)
  const propertyNames = useMemo(() => {
    return propReduce(
      data,
      (acc, properties) => {
        if (properties) {
          Object.keys(properties).forEach((key) => acc.add(key));
        }
        return acc;
      },
      new Set<string>()
    );
  }, [data]);

  const propertyNameItems = useMemo(
    () => Array.from(propertyNames).map((key) => ({ label: key, value: key })),
    [propertyNames]
  );

  // Column Selections State
  const [nameColumn, setNameColumn] = useState("");
  const [symbolColumn, setSymbolColumn] = useState("");
  const [activeLayer, setActiveLayer] = useState("");
  const [parentUnitId, setParentUnitId] = useState("");

  // Initialize defaults when data/layers change
  useEffect(() => {
    const propsArray = Array.from(propertyNames);
    setNameColumn(findLikelyNameColumn(propsArray));
    setSymbolColumn(findLikelySymbolColumn(propsArray));
  }, [propertyNames]);

  useEffect(() => {
    if (geo.layers.length > 0 && !activeLayer) {
      setActiveLayer(String(geo.layers[0].id));
    }
  }, [geo.layers, activeLayer]);

  useEffect(() => {
    if (rootUnitItems.length > 0 && !parentUnitId) {
      setParentUnitId(String(rootUnitItems[0].code));
    }
  }, [rootUnitItems, parentUnitId]);

  // --- Computed Data ---
  const isFeatureMode = importMode === "features";

  const existingLayers = useMemo(
    () => geo.layers.map((l: any) => ({ label: l.name, value: l.id })),
    [geo.layers]
  );

  const geoJSONFeatures = useMemo((): GeoJSONFeature[] => {
    const extractedFeatures: GeoJSONFeature[] = [];
    featureEach(data, (f) => {
      extractedFeatures.push(f);
    });
    return extractedFeatures;
  }, [data]);

  const geoJSONPointFeatures = useMemo(() => {
    return geoJSONFeatures.filter((f) => f.geometry.type === "Point");
  }, [geoJSONFeatures]);

  // --- Table Columns Definition ---
  const computedColumns = useMemo((): ColumnDef<GeoJSONFeature, any>[] => {
    const dynamicCols: ColumnDef<GeoJSONFeature, any>[] = Array.from(propertyNames).map(
      (key) => ({
        accessorFn: (f) => f.properties?.[key] ?? "",
        header: key,
        id: key, // explicit id is good practice
      })
    );

    const baseCols: ColumnDef<GeoJSONFeature, any>[] = [
      {
        accessorKey: "geometry.type",
        id: "geometryType",
        header: "Geometry",
      },
    ];

    if (importMode === "units") {
      baseCols.push({
        id: "sidc",
        header: "Icon",
        size: 80,
        enableSorting: false,
        accessorFn: (f) =>
          f.properties?.[symbolColumn]?.trim() || "10031000000000000000",
        cell: ({ getValue }) => (
          <MilitarySymbol
            sidc={getValue() as string}
            size={20}
            data-sidc={getValue()}
          />
        ),
      });
    }

    baseCols.push({
      id: "name",
      header: "Name",
      accessorFn: (f) => f.properties?.[nameColumn] ?? "Feature",
    });

    return [
      ...baseCols,
      { header: "Feature properties", columns: dynamicCols },
    ];
  }, [propertyNames, importMode, symbolColumn, nameColumn]);

  // --- Load Logic ---

  function loadAsUnits() {
    const { side } = unitActions.getUnitHierarchy(parentUnitId);

    const units: NUnit[] = selectedFeatures.map((f) => {
      const sidc =
        f.properties?.[symbolColumn]?.trim() || "10031000000000000000";
      return {
        id: nanoid(),
        name: f.properties?.[nameColumn] || "New unit",
        sidc: setCharAt(sidc, SID_INDEX, side.standardIdentity),
        subUnits: [],
        _pid: "",
        _gid: "",
        _sid: "",
        location: (f.geometry as Point).coordinates,
        equipment: [],
        personnel: [],
      } as NUnit;
    });

    scnStore.groupUpdate(() => {
      units.forEach((unit) => unitActions.addUnit(unit, parentUnitId));
    });
  }

  function loadAsFeatures() {
    if (!activeLayer) return;
    const features: NScenarioFeature[] = selectedFeatures.map((f) => {
      return {
        ...f,
        _pid: activeLayer,
        id: nanoid(),
        meta: {
          type: f.geometry.type,
          name: f.properties?.[nameColumn] || "New feature",
        },
        style: {},
        properties: {},
        // properties: { ...(f.properties ?? {}) }, // Uncomment nếu muốn copy properties
      } as unknown as NScenarioFeature; // Ép kiểu vì NScenarioFeature có thể strict hơn GeoJSONFeature
    });

    scnStore.groupUpdate(() => {
      features.forEach((feature) => geo.addFeature(feature, feature._pid));
    });
  }

  const handleLoad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (importMode === "units") {
      loadAsUnits();
    } else {
      loadAsFeatures();
    }
    if (onLoaded) onLoaded();
  };

  // --- Render ---
  return (
    <div className="">
      <form onSubmit={handleLoad} className="mt-4 flex max-h-[80vh] flex-col">
        {/* Import Mode Radio Group */}
        <fieldset className="flex items-center gap-x-10">
          <p className="text-foreground flex-none text-sm leading-6 font-semibold">
            Import GeoJSON as
          </p>
          <RadioGroup
            value={importMode}
            onValueChange={(v) => setImportMode(v as GeoJsonImportMode)}
            className="flex w-full gap-10"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="features" id="r-features" />
              <Label htmlFor="r-features">Scenario features</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="units" id="r-units" />
              <Label htmlFor="r-units">Units</Label>
            </div>
          </RadioGroup>
        </fieldset>

        <div className="">
          <p className="text-muted-foreground mt-4 text-sm leading-6">
            Select which features you want to import
          </p>

          {/* Data Grid Section */}
          <section className="mt-4">
            <div className="max-h-[40vh]">
              <DataGrid
                data={isFeatureMode ? geoJSONFeatures : geoJSONPointFeatures}
                columns={computedColumns}
                rowHeight={40}
                // Các props cho selection của DataGrid (Giả định interface)
                // Nếu dùng TanStack table thuần: rowSelection state + onRowSelectionChange
                // Ở đây giả lập prop 'selected' như Vue component
                selected={selectedFeatures}
                onSelectionChange={setSelectedFeatures}
              />
            </div>
            
            {!isFeatureMode && geoJSONPointFeatures.length === 0 && (
              <div className="mt-4">
                <AlertWarning title="No point geometries found">
                  A unit must have a point geometry to be imported.
                </AlertWarning>
              </div>
            )}
          </section>

          {/* Column Mapping Section */}
          <section className="mt-4 grid gap-4 sm:grid-cols-2">
            <SimpleSelect
              label="Name column"
              items={propertyNameItems}
              value={nameColumn}
              onValueChange={(val: string | number | null) => setNameColumn(val as string)}
            />
            {!isFeatureMode && (
              <SimpleSelect
                label="Symbol column"
                items={propertyNameItems}
                value={symbolColumn}
                onValueChange={(val: string | number | null) => setSymbolColumn(val as string)}
              />
            )}
          </section>

          {/* Target Layer / Parent Unit Section */}
          <section className="mt-4 grid gap-4 sm:grid-cols-2">
            {isFeatureMode ? (
              <SimpleSelect
                label="Layer"
                description="Which layer should the features be added to?"
                items={existingLayers}
                value={activeLayer}
                onValueChange={(val: string | number | null) => setActiveLayer(val as string)}
              />
            ) : (
              <SymbolCodeSelect
                label="Parent unit"
                items={rootUnitItems}
                value={parentUnitId}
                onValueChange={(val: any) => setParentUnitId(val)}
              />
            )}
          </section>
        </div>

        {/* Footer Actions */}
        <Field orientation="horizontal" className="justify-end mt-6">
          <Button type="submit">Import</Button>
          <Button
            variant="outline"
            type="button"
            onClick={onCancel}
            className="ml-2"
          >
            Cancel
          </Button>
        </Field>
      </form>
    </div>
  );
}