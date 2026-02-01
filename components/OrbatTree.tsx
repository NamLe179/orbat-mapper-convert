"use client";

import React, { useMemo, useState, useEffect } from "react";

// Types
import { type UnitAction } from "@/types/constants";
import type { EntityId } from "@/types/base";
import type { NUnit } from "@/types/internalModels";
import { type UnitSymbolOptions } from "@/types/scenarioModels";

// Utils
import { filterUnits } from "@/hooks/filtering";

// Components
import OrbatTreeItem from "./OrbatTreeItem";

interface OrbatTreeProps {
  units: EntityId[];
  unitMap: Record<EntityId, NUnit>;
  filterQuery?: string;
  locationFilter?: boolean;
  symbolOptions?: UnitSymbolOptions;
  onUnitAction: (unit: NUnit, action: UnitAction) => void;
  onUnitClick: (unit: NUnit, event: React.MouseEvent) => void;
}

export default function OrbatTree({
  units,
  unitMap,
  filterQuery = "",
  locationFilter = false,
  symbolOptions,
  onUnitAction,
  onUnitClick,
}: OrbatTreeProps) {
  // --- Local State ---
  const [queryHasChanged, setQueryHasChanged] = useState(true);

  // --- Watchers: Theo dõi thay đổi của filterQuery ---
  useEffect(() => {
    setQueryHasChanged(true);
  }, [filterQuery]);

  // --- Computed: Lọc danh sách đơn vị ---
  const filteredUnits = useMemo(() => {
    const resetOpen = queryHasChanged;
    
    // Gọi logic filter tương tự như bản Vue
    const result = filterUnits(
      units,
      unitMap,
      filterQuery,
      locationFilter,
      resetOpen
    );

    // Sau khi tính toán xong, reset flag
    if (queryHasChanged) {
      setQueryHasChanged(false);
    }

    return result;
  }, [units, unitMap, filterQuery, locationFilter, queryHasChanged]);

  return (
    <ul className="space-y-1">
      {/* Image of a military Order of Battle (ORBAT) tree structure showing 
        hierarchical command relationships with NATO symbols
      */}
      
      
      {filteredUnits.map((orbatItem: any, index: number) => (
        <OrbatTreeItem
          key={orbatItem.unit.id}
          item={orbatItem}
          onUnitAction={onUnitAction}
          onUnitClick={onUnitClick}
          symbolOptions={symbolOptions}
          lastInGroup={index === filteredUnits.length - 1}
        />
      ))}
    </ul>
  );
}