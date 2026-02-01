"use client";

import React, { useMemo, useState, useEffect } from "react";
import { type ColumnDef, type InitialTableState } from "@tanstack/react-table";
import { propReduce } from "@turf/meta";
import { featureCollection } from "@turf/helpers";
import { pick } from "es-toolkit";
import { nanoid, removeUndefined } from "@/utils";

// Types
import type { MilxImportedLayer } from "@/hooks/scenarioImport";
import type { NUnit } from "@/types/internalModels";
import type { ImportGeoJsonFeature } from "@/importexport/jsonish/types";
import type { Point } from "geojson";

// Hooks & Stores
import { useActiveScenario } from "@/components/injects";
import { useRootUnits } from "@/hooks/scenarioUtils";
import { useImportStore } from "@/stores/importExportStore";
import { setCharAt } from "@/components/helpers";
import { SID_INDEX } from "@/symbology/sidc";

// Components
import SymbolCodeSelect from "@/components/SymbolCodeSelect";
import ToggleField from "@/components/ToggleField";
import MilitarySymbol from "@/components/MilitarySymbol";
import DataGrid from "@/modules/grid/DataGrid";
import { Button } from "@/components/ui/button";

// --- Types ---

interface ImportMilxStepProps {
  data: MilxImportedLayer[];
  onCancel?: () => void;
  onLoaded?: () => void;
}

interface FlatItem extends ImportGeoJsonFeature {
  layerName: string;
}

// --- Main Component ---

export default function ImportMilxStep({
  data: propData,
  onCancel,
  onLoaded,
}: ImportMilxStepProps) {
  // --- Hooks ---
  const { unitActions, store: scnStore } = useActiveScenario();
  const store = useImportStore();
  const { rootUnitItems } = useRootUnits();

  // --- State ---
  const [parentUnitId, setParentUnitId] = useState<string>("");
  const [selectedUnits, setSelectedUnits] = useState<FlatItem[]>([]);

  // Init parentUnitId default
  useEffect(() => {
    if (rootUnitItems.length > 0 && !parentUnitId) {
      setParentUnitId(String(rootUnitItems[0].code));
    }
  }, [rootUnitItems, parentUnitId]);

  // --- Computed Data (useMemo) ---

  // Flatten layered data
  const data = useMemo<FlatItem[]>(() => {
    return propData
      .map((l) =>
        l.features.map((f) => ({
          ...f,
          layerName: l.name || "Unnamed Layer",
        }))
      )
      .flat();
  }, [propData]);

  // Extract property names
  const propertyNames = useMemo(() => {
    return propReduce(
      featureCollection(data),
      (acc, properties) => {
        if (properties?.originalProperties) {
          Object.keys(properties.originalProperties).forEach((key) =>
            acc.add(key)
          );
        }
        return acc;
      },
      new Set<string>()
    );
  }, [data]);

  // Extract converted property names
  const convertedPropertyNames = useMemo(() => {
    const names = propReduce(
      featureCollection(data),
      (acc, properties) => {
        if (properties?.convertedProperties) {
          Object.keys(properties.convertedProperties).forEach((key) =>
            acc.add(key)
          );
        }
        return acc;
      },
      new Set<string>()
    );
    names.delete("sidc");
    names.delete("name");
    return names;
  }, [data]);

  // Define Columns
  const computedColumns = useMemo((): ColumnDef<FlatItem, any>[] => {
    const items = Array.from(propertyNames).map(
      (key): ColumnDef<FlatItem, any> => ({
        accessorFn: (f) => f.properties?.originalProperties?.[key] ?? "",
        header: key,
        id: `orig_${key}`,
      })
    );

    const convertedItems = Array.from(convertedPropertyNames).map(
      (key): ColumnDef<FlatItem, any> => ({
        accessorFn: (f) => (f.properties?.convertedProperties as any)?.[key] ?? "",
        header: key,
        id: `conv_${key}`,
      })
    );

    return [
      {
        header: "Converted properties",
        columns: [
          {
            accessorFn: (u) => u.properties?.convertedProperties?.sidc,
            header: "Symbol",
            id: "sidc",
            size: 85,
            cell: ({ getValue }) => (
              <MilitarySymbol
                sidc={getValue() as string}
                size={20}
                data-sidc={getValue()}
              />
            ),
          },
          {
            accessorFn: (f) =>
              f.properties?.convertedProperties?.["name"] ?? "NN",
            id: "name",
            header: "Name",
            size: 200,
          },
          ...convertedItems,
        ],
      },
      {
        accessorFn: (f) => f.layerName,
        id: "layer",
        header: "Layer",
        size: 200,
      },
      {
        header: "Original properties",
        columns: items,
      },
    ];
  }, [propertyNames, convertedPropertyNames]);

  // Initial Table State
  const initialTableState: InitialTableState = {
    grouping: ["layer"],
    expanded: true,
  };

  // --- Handlers ---

  const handleLoad = async (e: React.FormEvent) => {
    e.preventDefault();

    // Logic xử lý import
    const { side } = unitActions.getUnitHierarchy(parentUnitId);

    const units: NUnit[] = selectedUnits.map((f) => {
      const textAmplifiers = removeUndefined(
        pick(f.properties.convertedProperties, [
          "higherFormation",
          "staffComments",
          "additionalInformation",
        ])
      );

      // Create NUnit object
      return {
        id: nanoid(),
        name: f.properties.convertedProperties.name || "",
        sidc: setCharAt(
          f.properties.convertedProperties.sidc,
          SID_INDEX,
          side.standardIdentity
        ),
        subUnits: [],
        _pid: "",
        _gid: "",
        _sid: "",
        location: (f.geometry as Point).coordinates,
        symbolOptions: f.properties.convertedProperties.fillColor
          ? { fillColor: f.properties.convertedProperties.fillColor }
          : {},
        textAmplifiers,
        reinforcedStatus: f.properties.convertedProperties.reinforcedStatus,
        equipment: [],
        personnel: [],
      } as NUnit;
    });

    // Batch update
    scnStore.groupUpdate(() => {
      units.forEach((unit) => unitActions.addUnit(unit, parentUnitId));
    });

    if (!store.keepOpen && onLoaded) {
      onLoaded();
    }
  };

  return (
    <div className="">
      <form onSubmit={handleLoad} className="mt-4 flex max-h-[80vh] flex-col">
        <div className="flex-auto overflow-auto">
          {/* Description */}
          <div className="prose prose-sm dark:prose-invert">
            <p>
              Basic support for importing MilX layers from{" "}
              <a href="https://www.map.army/" target="_blank" rel="noreferrer">
                map.army
              </a>
            </p>
          </div>

          {/* Parent Unit Select */}
          <section className="p-1.5">
            <SymbolCodeSelect
              label="Parent unit"
              items={rootUnitItems}
              value={parentUnitId}
              onValueChange={(val: string | null) => val !== null && setParentUnitId(val)}
            />
          </section>

          {/* Data Grid */}
          <section className="mt-4">
            <div className="max-h-[40vh]">
              <DataGrid
                data={data}
                columns={computedColumns}
                initialState={initialTableState}
                rowHeight={40}
                select
                selectAll
                showGlobalFilter
                selected={selectedUnits}
                onSelectionChange={setSelectedUnits}
              />
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="flex shrink-0 items-center justify-between pt-4">
          <ToggleField
            checked={store.keepOpen}
            onCheckedChange={(v) => {
              if (store.setKeepOpen) store.setKeepOpen(v);
              else store.keepOpen = v;
            }}
          >
            Keep dialog open on import
          </ToggleField>
          
          <div className="flex items-center space-x-2">
            <Button type="submit" size="sm">
              Import
            </Button>
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={onCancel}
            >
              Cancel
            </Button>
          </div>
        </footer>
      </form>
    </div>
  );
}