"use client";

import React, { useState, useEffect } from "react";
import { sortBy } from "@/utils";
import { setCharAt } from "@/components/helpers";
import { SID_INDEX } from "@/symbology/sidc";

// Types
import type { OrbatGeneratorOrbat } from "@/types/externalModels";
import type { EntityId } from "@/types/base";
import type { NUnit, NUnitAdd } from "@/types/internalModels";

// Hooks
import { useActiveScenario } from "@/components/injects";
import { useRootUnits } from "@/hooks/scenarioUtils";

// Components
import BaseButton from "@/components/BaseButton";
import SymbolCodeSelect from "@/components/SymbolCodeSelect";

interface ImportOrbatGeneratorStepProps {
  data: OrbatGeneratorOrbat;
  onCancel?: () => void;
  onLoaded?: () => void;
}

export default function ImportOrbatGeneratorStep({
  data,
  onCancel,
  onLoaded,
}: ImportOrbatGeneratorStepProps) {
  // --- Hooks ---
  const { unitActions, store: scnStore } = useActiveScenario();
  const { rootUnitItems } = useRootUnits();

  // --- State ---
  const [parentUnitId, setParentUnitId] = useState<string>("");

  // Initialize default Parent Unit ID
  useEffect(() => {
    if (rootUnitItems.length > 0 && !parentUnitId) {
      setParentUnitId(String(rootUnitItems[0].code));
    }
  }, [rootUnitItems, parentUnitId]);

  // --- Handlers ---
  const handleLoad = async (e: React.FormEvent) => {
    e.preventDefault();

    const { side } = unitActions.getUnitHierarchy(parentUnitId);

    // Transform and sort data
    const mappedData = data.map((u) => {
      const [sidc, level, xPosition, name, subTitle, color] = u;
      return {
        sidc,
        level,
        xPosition,
        name,
        subTitle,
        color,
        sortKey: String(level) + String(xPosition),
      };
    });

    const oob = sortBy(mappedData, "sortKey");
    const parentMap: Record<string, EntityId> = {};

    scnStore.groupUpdate(() => {
      oob.forEach((u) => {
        const {
          sidc,
          level,
          xPosition,
          name,
          subTitle: description,
          color,
          sortKey,
        } = u;

        const newUnit: NUnitAdd = {
          name,
          description,
          sidc: setCharAt(sidc, SID_INDEX, side.standardIdentity),
          symbolOptions: { fillColor: color },
          subUnits: [],
          equipment: [],
          personnel: [],
        };

        // Logic xác định parent dựa trên cấu trúc của Orbat Generator
        const parentSortKey = `1${xPosition}`;
        const targetParentId =
          parentMap[parentSortKey] || parentMap["00"] || parentUnitId;

        const newUnitId = unitActions.addUnit(
          newUnit as NUnit,
          targetParentId
        );

        parentMap[sortKey] = newUnitId;
      });
    });

    if (onLoaded) onLoaded();
  };

  return (
    <div>
      <form
        onSubmit={handleLoad}
        className="mt-4 flex max-h-[80vh] min-h-[25rem] flex-col"
      >
        <div className="flex-auto overflow-auto">
          <div className="prose prose-sm dark:prose-invert"></div>
          
          <section className="p-1.5">
            <SymbolCodeSelect
              label="Parent unit"
              items={rootUnitItems}
              value={parentUnitId}
              onValueChange={(val: string | null) => val !== null && setParentUnitId(val)}
            />
          </section>
          
          <section className="mt-4"></section>
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