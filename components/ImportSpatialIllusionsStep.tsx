"use client";

import React, { useState, useMemo } from "react";

// Types
import { 
  mapSpatialIllusionsReinforced, 
  type SpatialIllusionsOrbat 
} from "@/types/externalModels";
import type { NUnit, NUnitAdd } from "@/types/internalModels";
import type { EntityId } from "@/types/base";
import { SID_INDEX } from "@/symbology/sidc";

// Hooks & Stores
import { useActiveScenario } from "@/components/injects";
import { useRootUnits } from "@/hooks/scenarioUtils";
import { setCharAt } from "@/components/helpers";

// Components
import BaseButton from "@/components/BaseButton";
import SymbolCodeSelect from "@/components/SymbolCodeSelect";
import DataGrid from "@/modules/grid/DataGrid";
import OrbatCellRenderer from "@/components/OrbatCellRenderer";
import InputCheckbox from "@/components/InputCheckbox";

interface Props {
  data: SpatialIllusionsOrbat;
  onCancel: () => void;
  onLoaded: () => void;
}

export default function ImportSpatialIllusionsStep({ data, onCancel, onLoaded }: Props) {
  // --- Context & Scenario Actions ---
  const { unitActions, store: scnStore } = useActiveScenario();
  const { rootUnitItems } = useRootUnits();

  // --- Local State ---
  const [useFillColor, setUseFillColor] = useState(true);
  const [expandedStackedUnits, setExpandedStackedUnits] = useState(true);
  const [parentUnitId, setParentUnitId] = useState<string>(
    rootUnitItems[0]?.code as string || ""
  );

  // --- Column Definition (useMemo) ---
  const computedColumns = useMemo(() => [
    {
      accessorFn: (f: SpatialIllusionsOrbat) => f.options.uniqueDesignation,
      id: "name",
      header: "Unit",
      cell: ({ getValue, row }: any) => {
        const symbolOptions: Record<string, any> = {};
        if (useFillColor && row.original.options.fillColor) {
          symbolOptions["fillColor"] = row.original.options.fillColor;
        }
        return (
          <OrbatCellRenderer
            value={getValue()}
            sidc={row.original.options.sidc}
            expanded={row.getIsExpanded()}
            level={row.depth}
            canExpand={row.getCanExpand()}
            onToggle={row.getToggleExpandedHandler()}
            symbolOptions={symbolOptions}
          />
        );
      },
      size: 350,
    },
    {
      id: "additionalInformation",
      header: "Additional information",
      accessorFn: (f: SpatialIllusionsOrbat) => f.options.additionalInformation,
    },
    {
      id: "stack",
      header: "Stack",
      accessorFn: (f: SpatialIllusionsOrbat) => f.options.stack,
    },
    {
      id: "fillColor",
      header: "Fill color",
      accessorFn: (f: SpatialIllusionsOrbat) => f.options.fillColor,
    },
    {
      id: "reinforced",
      header: "Reinforced",
      accessorFn: (f: SpatialIllusionsOrbat) => f.options.reinforced,
    },
  ], [useFillColor]);

  // --- Form Submission Logic ---
  const onLoad = (e: React.FormEvent) => {
    e.preventDefault();
    const { side } = unitActions.getUnitHierarchy(parentUnitId);

    scnStore.groupUpdate(() => {
      function helper(u: SpatialIllusionsOrbat, parentId: EntityId) {
        const { uniqueDesignation: name = "", sidc } = u.options;
        const stack = expandedStackedUnits ? u.options.stack || 1 : 1;
        const fillColor = useFillColor ? u.options.fillColor : undefined;

        const newUnit: NUnitAdd = {
          name,
          sidc: setCharAt(sidc, SID_INDEX, side.standardIdentity),
          symbolOptions: { fillColor },
          textAmplifiers: {},
          subUnits: [],
          equipment: [],
          personnel: [],
        };

        if (u.options.reinforced) {
          newUnit.reinforcedStatus = mapSpatialIllusionsReinforced(u.options.reinforced);
        }
        if (u.options.additionalInformation) {
          newUnit.textAmplifiers!.additionalInformation = u.options.additionalInformation;
        }

        for (let i = 0; i < stack; i++) {
          const newUnitId = unitActions.addUnit(newUnit as NUnit, parentId);
          u.subOrganizations?.forEach((subUnit) => helper(subUnit, newUnitId));
        }
      }

      helper(data, parentUnitId);
    });

    onLoaded();
  };

  return (
    <div>
      <form onSubmit={onLoad} className="mt-4 flex max-h-[80vh] min-h-[25rem] flex-col">
        <div className="flex-auto overflow-auto">
          <div className="prose prose-sm dark:prose-invert"></div>
          
          <section className="p-1.5">
            <SymbolCodeSelect
              label="Parent unit"
              items={rootUnitItems}
              value={parentUnitId}
              onValueChange={(val) => val !== null && setParentUnitId(val)}
            />
          </section>

          

          <section className="mt-4">
            <div className="max-h-[40vh]">
              <DataGrid
                data={[data]}
                columns={computedColumns}
                rowHeight={40}
                initialState={{ expanded: { "0": true } }}
                getSubRows={(row: SpatialIllusionsOrbat) => row.subOrganizations ?? []}
              />
            </div>
          </section>

          <section className="mt-4 flex gap-4 p-1">
            <InputCheckbox 
              checked={useFillColor} 
              onCheckedChange={(val: string | boolean) => setUseFillColor(!!val)} 
              label="Use custom fill color" 
            />
            <InputCheckbox 
              checked={expandedStackedUnits} 
              onCheckedChange={(val: string | boolean) => setExpandedStackedUnits(!!val)} 
              label="Expand stacked units" 
            />
          </section>
        </div>

        <footer className="flex shrink-0 items-center justify-end space-x-2 pt-4">
          <BaseButton type="submit" primary small>
            Import
          </BaseButton>
          <BaseButton type="button" small onClick={onCancel}>
            Cancel
          </BaseButton>
        </footer>
      </form>
    </div>
  );
}